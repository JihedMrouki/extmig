/**
 * Marketplace Clients
 *
 * Unified interface for querying different extension marketplaces.
 */

import { MarketplaceType, ResolvedExtension, ResolutionResult, Extension } from '../types/index.js';
import * as OpenVSX from './openvsx.js';
import * as VSCode from './vscode.js';

/**
 * Marketplace client interface
 */
export interface MarketplaceClient {
  queryExtensionById(extensionId: string): Promise<ResolvedExtension | null>;
  resolveExtensions(
    extensions: Extension[],
    options?: { concurrency?: number }
  ): Promise<ResolutionResult[]>;
  searchExtensions(
    query: string,
    options?: { limit?: number }
  ): Promise<ResolvedExtension[]>;
}

/**
 * Get marketplace client for a specific marketplace type
 */
export function getMarketplaceClient(marketplace: MarketplaceType): MarketplaceClient {
  switch (marketplace) {
    case 'vscode':
      return {
        queryExtensionById: VSCode.queryExtensionById,
        resolveExtensions: VSCode.resolveExtensions,
        searchExtensions: VSCode.searchExtensions,
      };
    case 'openvsx':
      return {
        queryExtensionById: OpenVSX.queryExtensionById,
        resolveExtensions: OpenVSX.resolveExtensions,
        searchExtensions: OpenVSX.searchExtensions,
      };
    default:
      throw new Error(`Unsupported marketplace: ${marketplace}`);
  }
}

/**
 * Query extension on a specific marketplace
 */
export async function queryExtension(
  extensionId: string,
  marketplace: MarketplaceType
): Promise<ResolvedExtension | null> {
  const client = getMarketplaceClient(marketplace);
  return client.queryExtensionById(extensionId);
}

/**
 * Query extension on multiple marketplaces (fallback strategy)
 */
export async function queryExtensionMultiple(
  extensionId: string,
  marketplaces: MarketplaceType[]
): Promise<{
  results: Array<{
    marketplace: MarketplaceType;
    extension: ResolvedExtension | null;
    error?: string;
  }>;
  firstAvailable: ResolvedExtension | null;
}> {
  const results = await Promise.allSettled(
    marketplaces.map(async (marketplace) => {
      const client = getMarketplaceClient(marketplace);
      const extension = await client.queryExtensionById(extensionId);
      return { marketplace, extension };
    })
  );

  const formattedResults = results.map((result, index) => {
    const marketplace = marketplaces[index];

    if (result.status === 'fulfilled') {
      return {
        marketplace,
        extension: result.value.extension,
      };
    }

    return {
      marketplace,
      extension: null,
      error: result.reason instanceof Error
        ? result.reason.message
        : 'Unknown error',
    };
  });

  // Find first available extension
  const firstAvailable = formattedResults.find(
    (r) => r.extension !== null
  )?.extension || null;

  return {
    results: formattedResults,
    firstAvailable,
  };
}

/**
 * Resolve extensions on target marketplace
 */
export async function resolveExtensionsOnMarketplace(
  extensions: Extension[],
  targetMarketplace: MarketplaceType,
  options: { concurrency?: number } = {}
): Promise<ResolutionResult[]> {
  const client = getMarketplaceClient(targetMarketplace);
  return client.resolveExtensions(extensions, options);
}

/**
 * Search for extensions on a marketplace
 */
export async function searchOnMarketplace(
  query: string,
  marketplace: MarketplaceType,
  options: { limit?: number } = {}
): Promise<ResolvedExtension[]> {
  const client = getMarketplaceClient(marketplace);
  return client.searchExtensions(query, options);
}

// Re-export marketplace-specific errors
export { OpenVSXError } from './openvsx.js';
export { VSCodeMarketplaceError } from './vscode.js';

// Re-export everything for convenience
export * as OpenVSX from './openvsx.js';
export * as VSCode from './vscode.js';
