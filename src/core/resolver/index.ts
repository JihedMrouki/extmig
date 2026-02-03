/**
 * Extension Resolver
 *
 * Resolves installed extensions against target marketplaces.
 */

import {
  InstalledExtension,
  Extension,
  ResolvedExtension,
  ResolutionResult,
  MarketplaceType,
} from '../../types/index.js';
import {
  getMarketplaceClient,
  queryExtensionMultiple,
} from '../../marketplaces/index.js';

/**
 * Resolution options
 */
export interface ResolveOptions {
  /**
   * Target marketplace to resolve against
   */
  targetMarketplace: MarketplaceType;

  /**
   * Fallback marketplaces to try if not found on target
   */
  fallbackMarketplaces?: MarketplaceType[];

  /**
   * Number of concurrent API requests
   */
  concurrency?: number;

  /**
   * Include fallback results in output
   */
  includeFallbacks?: boolean;
}

/**
 * Extended resolution result with fallback info
 */
export interface ExtendedResolutionResult {
  extensionId: string;
  status: 'found' | 'not_found' | 'error' | 'unsupported';
  marketplace: MarketplaceType;
  extension?: ResolvedExtension;
  error?: string;

  /**
   * Original installed extension
   */
  installedExtension?: InstalledExtension;

  /**
   * Fallback marketplace where extension was found (if any)
   */
  fallbackMarketplace?: MarketplaceType;

  /**
   * Fallback resolved extension (if found on fallback marketplace)
   */
  fallbackExtension?: ResolvedExtension;
}

/**
 * Resolution summary
 */
export interface ResolutionSummary {
  total: number;
  available: number;
  unavailable: number;
  fallbackAvailable: number;
  errors: number;
}

/**
 * Full resolution report
 */
export interface ResolutionReport {
  targetMarketplace: MarketplaceType;
  results: ExtendedResolutionResult[];
  summary: ResolutionSummary;
}

/**
 * Resolve a single extension against target marketplace
 */
export async function resolveExtension(
  extension: Extension,
  targetMarketplace: MarketplaceType,
  fallbackMarketplaces?: MarketplaceType[]
): Promise<ExtendedResolutionResult> {
  const client = getMarketplaceClient(targetMarketplace);

  try {
    // Try target marketplace first
    const resolved = await client.queryExtensionById(extension.id);

    if (resolved) {
      return {
        extensionId: extension.id,
        status: 'found',
        marketplace: targetMarketplace,
        extension: resolved,
      };
    }

    // If not found and fallbacks provided, try them
    if (fallbackMarketplaces && fallbackMarketplaces.length > 0) {
      const fallbackResult = await queryExtensionMultiple(
        extension.id,
        fallbackMarketplaces
      );

      if (fallbackResult.firstAvailable) {
        const fallbackMarketplace = fallbackResult.results.find(
          (r) => r.extension !== null
        )?.marketplace;

        return {
          extensionId: extension.id,
          status: 'not_found',
          marketplace: targetMarketplace,
          error: `Not found on ${targetMarketplace}, but available on ${fallbackMarketplace}`,
          fallbackMarketplace,
          fallbackExtension: fallbackResult.firstAvailable,
        };
      }
    }

    // Not found anywhere
    return {
      extensionId: extension.id,
      status: 'not_found',
      marketplace: targetMarketplace,
      error: `Extension not found on ${targetMarketplace}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return {
      extensionId: extension.id,
      status: 'error',
      marketplace: targetMarketplace,
      error: errorMsg,
    };
  }
}

/**
 * Resolve multiple extensions against target marketplace
 */
export async function resolveExtensions(
  extensions: Extension[],
  options: ResolveOptions
): Promise<ResolutionReport> {
  const {
    targetMarketplace,
    fallbackMarketplaces = [],
    concurrency = 5,
    includeFallbacks = true,
  } = options;

  const results: ExtendedResolutionResult[] = [];

  // Split into chunks for concurrent processing
  const chunks: Extension[][] = [];
  for (let i = 0; i < extensions.length; i += concurrency) {
    chunks.push(extensions.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((ext) =>
        resolveExtension(
          ext,
          targetMarketplace,
          includeFallbacks ? fallbackMarketplaces : undefined
        )
      )
    );

    results.push(...chunkResults);
  }

  // Calculate summary
  const summary: ResolutionSummary = {
    total: results.length,
    available: results.filter((r) => r.status === 'found').length,
    unavailable: results.filter((r) => r.status === 'not_found' && !r.fallbackExtension).length,
    fallbackAvailable: results.filter((r) => r.fallbackExtension !== undefined).length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return {
    targetMarketplace,
    results,
    summary,
  };
}

/**
 * Resolve installed extensions from scanner results
 */
export async function resolveInstalledExtensions(
  installedExtensions: InstalledExtension[],
  options: ResolveOptions
): Promise<ResolutionReport> {
  // Convert to Extension objects
  const extensions: Extension[] = installedExtensions.map((ext) => ({
    id: ext.id,
    displayName: ext.displayName,
    description: ext.description,
    publisher: ext.publisher,
    name: ext.name,
    version: ext.version,
  }));

  const report = await resolveExtensions(extensions, options);

  // Attach installed extension info to results
  report.results = report.results.map((result) => {
    const installed = installedExtensions.find((ext) => ext.id === result.extensionId);
    return {
      ...result,
      installedExtension: installed,
    };
  });

  return report;
}

/**
 * Find alternative extensions by search
 */
export async function findAlternatives(
  extensionName: string,
  marketplace: MarketplaceType,
  limit: number = 5
): Promise<ResolvedExtension[]> {
  const client = getMarketplaceClient(marketplace);
  return client.searchExtensions(extensionName, { limit });
}
