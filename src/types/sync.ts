import { z } from 'zod';
import { ExtensionIdSchema } from './extension.js';
import { IDETypeSchema } from './ide.js';
import { MarketplaceTypeSchema } from './marketplace.js';

/**
 * Sync operation status
 */
export const SyncStatusSchema = z.enum([
  'installed',         // Successfully installed
  'already_installed', // Already present in target
  'skipped',          // User chose to skip
  'not_available',    // Not available on target marketplace
  'failed',           // Installation failed
  'pending',          // Queued for installation
]);

export type SyncStatus = z.infer<typeof SyncStatusSchema>;

/**
 * Individual extension sync result
 */
export const SyncResultSchema = z.object({
  /** Extension ID */
  extensionId: ExtensionIdSchema,

  /** Display name */
  displayName: z.string().optional(),

  /** Source version */
  sourceVersion: z.string().optional(),

  /** Target version (if resolved/installed) */
  targetVersion: z.string().optional(),

  /** Sync status */
  status: SyncStatusSchema,

  /** Error message if failed */
  error: z.string().optional(),

  /** Source marketplace */
  sourceMarketplace: MarketplaceTypeSchema.optional(),

  /** Target marketplace */
  targetMarketplace: MarketplaceTypeSchema.optional(),

  /** Timestamp of sync attempt */
  timestamp: z.date().default(() => new Date()),
});

export type SyncResult = z.infer<typeof SyncResultSchema>;

/**
 * Overall sync operation summary
 */
export const SyncSummarySchema = z.object({
  /** Source IDE */
  sourceIDE: IDETypeSchema,

  /** Target IDE */
  targetIDE: IDETypeSchema,

  /** Total extensions scanned */
  totalScanned: z.number(),

  /** Successfully installed */
  installed: z.number(),

  /** Already installed */
  alreadyInstalled: z.number(),

  /** Skipped by user */
  skipped: z.number(),

  /** Not available on target marketplace */
  notAvailable: z.number(),

  /** Failed installations */
  failed: z.number(),

  /** Individual results */
  results: z.array(SyncResultSchema),

  /** Whether this was a dry run */
  dryRun: z.boolean(),

  /** Start time */
  startTime: z.date(),

  /** End time */
  endTime: z.date().optional(),

  /** Duration in milliseconds */
  duration: z.number().optional(),
});

export type SyncSummary = z.infer<typeof SyncSummarySchema>;

/**
 * Diff between source and target extensions
 */
export const ExtensionDiffSchema = z.object({
  /** Extensions only in source */
  onlyInSource: z.array(
    z.object({
      extensionId: ExtensionIdSchema,
      displayName: z.string().optional(),
      version: z.string(),
      availableInTarget: z.boolean(),
    })
  ),

  /** Extensions only in target */
  onlyInTarget: z.array(
    z.object({
      extensionId: ExtensionIdSchema,
      displayName: z.string().optional(),
      version: z.string(),
    })
  ),

  /** Extensions in both (version may differ) */
  inBoth: z.array(
    z.object({
      extensionId: ExtensionIdSchema,
      displayName: z.string().optional(),
      sourceVersion: z.string(),
      targetVersion: z.string(),
      versionMatch: z.boolean(),
    })
  ),

  /** Summary counts */
  summary: z.object({
    totalInSource: z.number(),
    totalInTarget: z.number(),
    onlyInSourceCount: z.number(),
    onlyInTargetCount: z.number(),
    inBothCount: z.number(),
    availableForSync: z.number(),
    notAvailableForSync: z.number(),
  }),
});

export type ExtensionDiff = z.infer<typeof ExtensionDiffSchema>;
