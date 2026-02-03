/**
 * Core type definitions and schemas for extsync
 *
 * All types are validated using Zod schemas to ensure type safety
 * and runtime validation.
 */

// Validation utilities
export {
  ValidationResult,
  ValidationError,
  validate,
  parseOrThrow,
  isValidExtensionId,
  parseExtensionId,
  createExtensionId,
  normalizeExtensionId,
} from './validation.js';

// Extension types
export {
  Extension,
  ExtensionSchema,
  InstalledExtension,
  InstalledExtensionSchema,
  ExtensionManifest,
  ExtensionManifestSchema,
  ExtensionIdSchema,
} from './extension.js';

// Marketplace types
export {
  Marketplace,
  MarketplaceSchema,
  MarketplaceType,
  MarketplaceTypeSchema,
  ResolvedExtension,
  ResolvedExtensionSchema,
  ResolutionStatus,
  ResolutionStatusSchema,
  ResolutionResult,
  ResolutionResultSchema,
} from './marketplace.js';

// IDE types
export {
  IDE,
  IDESchema,
  IDEType,
  IDETypeSchema,
  Platform,
  PlatformSchema,
  IDEDetectionResult,
  IDEDetectionResultSchema,
} from './ide.js';

// Sync types
export {
  SyncResult,
  SyncResultSchema,
  SyncStatus,
  SyncStatusSchema,
  SyncSummary,
  SyncSummarySchema,
  ExtensionDiff,
  ExtensionDiffSchema,
} from './sync.js';
