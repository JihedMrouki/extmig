import { z } from 'zod';
import { ExtensionIdSchema } from './extension.js';

/**
 * Supported marketplace identifiers
 */
export const MarketplaceTypeSchema = z.enum([
  'vscode',      // Microsoft Marketplace
  'openvsx',     // Open VSX Registry
  'jetbrains',   // JetBrains Plugin Repository
]);

export type MarketplaceType = z.infer<typeof MarketplaceTypeSchema>;

/**
 * Marketplace configuration
 */
export const MarketplaceSchema = z.object({
  /** Marketplace identifier */
  type: MarketplaceTypeSchema,

  /** Display name */
  name: z.string(),

  /** Base API URL */
  apiUrl: z.string().url(),

  /** Web URL for browsing */
  webUrl: z.string().url(),

  /** Whether this marketplace requires authentication */
  requiresAuth: z.boolean().default(false),
});

export type Marketplace = z.infer<typeof MarketplaceSchema>;

/**
 * Result of querying a marketplace for an extension
 */
export const ResolvedExtensionSchema = z.object({
  /** Extension identifier */
  id: ExtensionIdSchema,

  /** Display name */
  displayName: z.string().optional(),

  /** Description */
  description: z.string().optional(),

  /** Publisher */
  publisher: z.string(),

  /** Extension name */
  name: z.string(),

  /** Latest available version */
  version: z.string(),

  /** Marketplace this was resolved from */
  marketplace: MarketplaceTypeSchema,

  /** Whether extension is available */
  available: z.boolean(),

  /** Download URL (if available) */
  downloadUrl: z.string().url().optional(),

  /** Web page URL */
  url: z.string().url().optional(),

  /** All available versions */
  allVersions: z.array(z.string()).optional(),

  /** Additional metadata */
  metadata: z.object({
    downloadCount: z.number().optional(),
    rating: z.number().optional(),
    verified: z.boolean().optional(),
    deprecated: z.boolean().optional(),
  }).optional(),
});

export type ResolvedExtension = z.infer<typeof ResolvedExtensionSchema>;

/**
 * Resolution status for an extension lookup
 */
export const ResolutionStatusSchema = z.enum([
  'found',           // Extension found on marketplace
  'not_found',       // Extension not available
  'error',           // Error during lookup
  'unsupported',     // Marketplace not supported
]);

export type ResolutionStatus = z.infer<typeof ResolutionStatusSchema>;

/**
 * Result of attempting to resolve an extension
 */
export const ResolutionResultSchema = z.object({
  /** Original extension ID queried */
  extensionId: ExtensionIdSchema,

  /** Resolution status */
  status: ResolutionStatusSchema,

  /** Resolved extension data (if found) */
  extension: ResolvedExtensionSchema.optional(),

  /** Error message (if status is error) */
  error: z.string().optional(),

  /** Marketplace queried */
  marketplace: MarketplaceTypeSchema,
});

export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;
