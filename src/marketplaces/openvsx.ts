/**
 * Open VSX Marketplace Client
 *
 * API client for querying the Open VSX Registry.
 * Docs: https://github.com/eclipse/openvsx/wiki/Using-Open-VSX-in-VS-Code
 */

import {
  ResolvedExtension,
  ResolutionResult,
  Extension,
  parseExtensionId,
} from '../types/index.js';

/**
 * Open VSX API base URL
 */
const OPENVSX_API_BASE = 'https://open-vsx.org/api';

/**
 * Open VSX API response types
 */
interface OpenVSXExtensionResponse {
  namespace: string;
  name: string;
  version?: string;
  displayName?: string;
  description?: string;
  verified?: boolean;
  downloadCount?: number;
  downloadUrl?: string;
  allVersions?: Record<string, string>; // version -> url mapping
  error?: string;
}

interface OpenVSXNamespaceResponse {
  extensions?: OpenVSXExtensionResponse[];
  error?: string;
}

/**
 * Marketplace resolver error
 */
export class OpenVSXError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly extensionId?: string
  ) {
    super(message);
    this.name = 'OpenVSXError';
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'extsync/0.1.0',
      },
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenVSXError(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Query a specific extension by namespace and name
 */
export async function queryExtension(
  namespace: string,
  name: string
): Promise<ResolvedExtension | null> {
  const url = `${OPENVSX_API_BASE}/${namespace}/${name}`;

  try {
    const response = await fetchWithTimeout(url);

    if (response.status === 404) {
      return null; // Extension not found
    }

    if (!response.ok) {
      throw new OpenVSXError(
        `API request failed: ${response.statusText}`,
        response.status,
        `${namespace}.${name}`
      );
    }

    const data = await response.json() as OpenVSXExtensionResponse;

    if (data.error) {
      throw new OpenVSXError(
        `API error: ${data.error}`,
        undefined,
        `${namespace}.${name}`
      );
    }

    // Extract all versions if available
    const allVersions = data.allVersions
      ? Object.keys(data.allVersions).sort((a, b) => {
          // Simple version sort (descending)
          return b.localeCompare(a, undefined, { numeric: true });
        })
      : data.version
      ? [data.version]
      : [];

    return {
      id: `${namespace}.${name}`,
      publisher: namespace,
      name: name,
      version: data.version || allVersions[0] || 'unknown',
      displayName: data.displayName,
      description: data.description,
      marketplace: 'openvsx',
      available: true,
      downloadUrl: data.downloadUrl,
      url: `https://open-vsx.org/extension/${namespace}/${name}`,
      allVersions: allVersions.length > 0 ? allVersions : undefined,
      metadata: {
        downloadCount: data.downloadCount,
        verified: data.verified,
        deprecated: false,
      },
    };
  } catch (error) {
    if (error instanceof OpenVSXError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new OpenVSXError(
        `Failed to query extension: ${error.message}`,
        undefined,
        `${namespace}.${name}`
      );
    }

    throw new OpenVSXError(
      'Unknown error occurred',
      undefined,
      `${namespace}.${name}`
    );
  }
}

/**
 * Query extension by full ID (publisher.name)
 */
export async function queryExtensionById(
  extensionId: string
): Promise<ResolvedExtension | null> {
  const parsed = parseExtensionId(extensionId);

  if (!parsed) {
    throw new OpenVSXError(
      `Invalid extension ID format: ${extensionId}`,
      undefined,
      extensionId
    );
  }

  return queryExtension(parsed.publisher, parsed.name);
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
            marketplace: 'openvsx' as const,
            error: 'Extension not found on Open VSX',
          };
        }

        return {
          extensionId: ext.id,
          status: 'found' as const,
          marketplace: 'openvsx' as const,
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
          marketplace: 'openvsx',
          error,
        });
      }
    }
  }

  return results;
}

/**
 * Search for extensions (limited API)
 */
export async function searchExtensions(
  query: string,
  options: { limit?: number } = {}
): Promise<ResolvedExtension[]> {
  const limit = options.limit || 10;
  const url = `${OPENVSX_API_BASE}/-/search?query=${encodeURIComponent(query)}&size=${limit}`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new OpenVSXError(
        `Search failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json() as { extensions?: OpenVSXExtensionResponse[] };

    if (!data.extensions || data.extensions.length === 0) {
      return [];
    }

    return data.extensions.map((ext) => ({
      id: `${ext.namespace}.${ext.name}`,
      publisher: ext.namespace,
      name: ext.name,
      version: ext.version || 'unknown',
      displayName: ext.displayName,
      description: ext.description,
      marketplace: 'openvsx' as const,
      available: true,
      downloadUrl: ext.downloadUrl,
      url: `https://open-vsx.org/extension/${ext.namespace}/${ext.name}`,
      metadata: {
        downloadCount: ext.downloadCount,
        verified: ext.verified,
        deprecated: false,
      },
    }));
  } catch (error) {
    if (error instanceof OpenVSXError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new OpenVSXError(`Search failed: ${error.message}`);
    }

    throw new OpenVSXError('Unknown search error');
  }
}
