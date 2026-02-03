/**
 * VS Code Marketplace Client
 *
 * API client for querying the Microsoft VS Code Marketplace.
 * Uses the same API that VS Code uses internally.
 */

import {
  ResolvedExtension,
  ResolutionResult,
  Extension,
  parseExtensionId,
} from '../types/index.js';

/**
 * VS Code Marketplace API endpoint
 */
const VSCODE_MARKETPLACE_API = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';

/**
 * API request flags
 * 0x1 = IncludeVersions
 * 0x2 = IncludeFiles
 * 0x4 = IncludeCategoryAndTags
 * 0x8 = IncludeSharedAccounts
 * 0x10 = IncludeVersionProperties
 * 0x20 = ExcludeNonValidated
 * 0x40 = IncludeInstallationTargets
 * 0x80 = IncludeAssetUri
 * 0x100 = IncludeStatistics
 * 0x200 = IncludeLatestVersionOnly
 * 0x400 = Unpublished
 * 0x800 = IncludeNameConflictInfo
 */
const API_FLAGS = 0x1 | 0x2 | 0x4 | 0x80 | 0x100 | 0x200; // 914

/**
 * Filter types
 */
enum FilterType {
  Tag = 1,
  ExtensionId = 4,
  Category = 5,
  ExtensionName = 7,
  Target = 8,
  Featured = 9,
  SearchText = 10,
  ExcludeWithFlags = 12,
}

/**
 * VS Code Marketplace API response types
 */
interface VSCodeExtensionVersion {
  version: string;
  flags?: string;
  lastUpdated?: string;
  files?: Array<{
    assetType: string;
    source: string;
  }>;
  properties?: Array<{
    key: string;
    value: string;
  }>;
}

interface VSCodeExtensionStatistic {
  statisticName: string;
  value: number;
}

interface VSCodeExtension {
  publisher: {
    publisherId: string;
    publisherName: string;
    displayName?: string;
    flags?: string;
  };
  extensionId: string;
  extensionName: string;
  displayName?: string;
  shortDescription?: string;
  versions?: VSCodeExtensionVersion[];
  statistics?: VSCodeExtensionStatistic[];
  flags?: string;
}

interface VSCodeMarketplaceResponse {
  results: Array<{
    extensions?: VSCodeExtension[];
    resultMetadata?: Array<{
      metadataType: string;
      metadataItems: Array<{
        name: string;
        count: number;
      }>;
    }>;
  }>;
}

/**
 * Marketplace resolver error
 */
export class VSCodeMarketplaceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly extensionId?: string
  ) {
    super(message);
    this.name = 'VSCodeMarketplaceError';
  }
}

/**
 * Create API query body
 */
function createQueryBody(extensionId: string): object {
  return {
    filters: [
      {
        criteria: [
          {
            filterType: FilterType.ExtensionName,
            value: extensionId,
          },
        ],
        pageSize: 1,
        pageNumber: 1,
      },
    ],
    flags: API_FLAGS,
  };
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new VSCodeMarketplaceError(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Parse VS Code extension response to ResolvedExtension
 */
function parseVSCodeExtension(ext: VSCodeExtension): ResolvedExtension {
  const publisher = ext.publisher.publisherName;
  const name = ext.extensionName;
  const id = `${publisher}.${name}`;

  // Get latest version
  const latestVersion = ext.versions?.[0];
  const version = latestVersion?.version || 'unknown';

  // Get download URL (vsix file)
  const vsixFile = latestVersion?.files?.find(
    (f) => f.assetType === 'Microsoft.VisualStudio.Services.VSIXPackage'
  );
  const downloadUrl = vsixFile?.source;

  // Get statistics
  const installStat = ext.statistics?.find(
    (s) => s.statisticName === 'install'
  );
  const downloadCount = installStat?.value;

  // Get all versions
  const allVersions = ext.versions?.map((v) => v.version);

  // Check if verified (publisher is verified)
  const verified = ext.publisher.flags?.includes('verified') || false;

  return {
    id,
    publisher,
    name,
    version,
    displayName: ext.displayName,
    description: ext.shortDescription,
    marketplace: 'vscode',
    available: true,
    downloadUrl,
    url: `https://marketplace.visualstudio.com/items?itemName=${id}`,
    allVersions,
    metadata: {
      downloadCount,
      verified,
      deprecated: false,
    },
  };
}

/**
 * Query a specific extension by ID
 */
export async function queryExtensionById(
  extensionId: string
): Promise<ResolvedExtension | null> {
  const parsed = parseExtensionId(extensionId);

  if (!parsed) {
    throw new VSCodeMarketplaceError(
      `Invalid extension ID format: ${extensionId}`,
      undefined,
      extensionId
    );
  }

  try {
    const response = await fetchWithTimeout(
      VSCODE_MARKETPLACE_API,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json;api-version=3.0-preview.1',
          'User-Agent': 'extsync/0.1.0',
        },
        body: JSON.stringify(createQueryBody(extensionId)),
      }
    );

    if (!response.ok) {
      throw new VSCodeMarketplaceError(
        `API request failed: ${response.statusText}`,
        response.status,
        extensionId
      );
    }

    const data = await response.json() as VSCodeMarketplaceResponse;

    // Check if extension was found
    const extensions = data.results?.[0]?.extensions;
    if (!extensions || extensions.length === 0) {
      return null; // Extension not found
    }

    return parseVSCodeExtension(extensions[0]);
  } catch (error) {
    if (error instanceof VSCodeMarketplaceError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new VSCodeMarketplaceError(
        `Failed to query extension: ${error.message}`,
        undefined,
        extensionId
      );
    }

    throw new VSCodeMarketplaceError(
      'Unknown error occurred',
      undefined,
      extensionId
    );
  }
}

/**
 * Resolve multiple extensions (with concurrency control)
 */
export async function resolveExtensions(
  extensions: Extension[],
  options: { concurrency?: number } = {}
): Promise<ResolutionResult[]> {
  const concurrency = options.concurrency || 5;
  const results: ResolutionResult[] = [];

  // Split into chunks for concurrent processing
  const chunks: Extension[][] = [];
  for (let i = 0; i < extensions.length; i += concurrency) {
    chunks.push(extensions.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(async (ext) => {
        const resolved = await queryExtensionById(ext.id);

        if (!resolved) {
          return {
            extensionId: ext.id,
            status: 'not_found' as const,
            marketplace: 'vscode' as const,
            error: 'Extension not found on VS Code Marketplace',
          };
        }

        return {
          extensionId: ext.id,
          status: 'found' as const,
          marketplace: 'vscode' as const,
          extension: resolved,
        };
      })
    );

    for (let i = 0; i < chunkResults.length; i++) {
      const result = chunkResults[i];
      const ext = chunk[i];

      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const error = result.reason instanceof Error
          ? result.reason.message
          : 'Unknown error';

        results.push({
          extensionId: ext.id,
          status: 'error' as const,
          marketplace: 'vscode',
          error,
        });
      }
    }
  }

  return results;
}

/**
 * Search for extensions
 */
export async function searchExtensions(
  query: string,
  options: { limit?: number } = {}
): Promise<ResolvedExtension[]> {
  const limit = options.limit || 10;

  const body = {
    filters: [
      {
        criteria: [
          {
            filterType: FilterType.SearchText,
            value: query,
          },
        ],
        pageSize: limit,
        pageNumber: 1,
      },
    ],
    flags: API_FLAGS,
  };

  try {
    const response = await fetchWithTimeout(
      VSCODE_MARKETPLACE_API,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json;api-version=3.0-preview.1',
          'User-Agent': 'extsync/0.1.0',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new VSCodeMarketplaceError(
        `Search failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json() as VSCodeMarketplaceResponse;
    const extensions = data.results?.[0]?.extensions || [];

    return extensions.map(parseVSCodeExtension);
  } catch (error) {
    if (error instanceof VSCodeMarketplaceError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new VSCodeMarketplaceError(`Search failed: ${error.message}`);
    }

    throw new VSCodeMarketplaceError('Unknown search error');
  }
}
