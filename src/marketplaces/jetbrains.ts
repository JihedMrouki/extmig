/**
 * JetBrains Marketplace Client (stub)
 *
 * JetBrains plugins are scanned locally; this client exists only to satisfy
 * the MarketplaceClient interface when 'jetbrains' is used as a marketplace type.
 * All query/resolve/search operations are no-ops.
 */

import { ResolvedExtension, ResolutionResult, Extension } from '../types/index.js';

export class JetBrainsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JetBrainsError';
  }
}

export async function queryExtensionById(
  _extensionId: string
): Promise<ResolvedExtension | null> {
  return null;
}

export async function resolveExtensions(
  extensions: Extension[],
  _options?: { concurrency?: number }
): Promise<ResolutionResult[]> {
  return extensions.map(ext => ({
    extensionId: ext.id,
    status: 'not_found' as const,
    marketplace: 'jetbrains' as const,
    error: 'JetBrains plugins are resolved locally, not via marketplace query.',
  }));
}

export async function searchExtensions(
  _query: string,
  _options?: { limit?: number }
): Promise<ResolvedExtension[]> {
  return [];
}
