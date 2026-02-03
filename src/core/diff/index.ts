/**
 * Extension Diff Engine
 *
 * Generates comprehensive diffs between IDE extension sets.
 */

import {
  InstalledExtension,
  ExtensionDiff,
  MarketplaceType,
  IDEType,
} from '../../types/index.js';

// Re-export for convenience
export type { ExtensionDiff } from '../../types/index.js';
import {
  matchExtensions,
  getSourceOnlyExtensions,
  getTargetOnlyExtensions,
  getVersionMismatches,
  getExactMatches,
  ExtensionMatch,
  MatchOptions,
} from '../matcher/index.js';
import {
  resolveInstalledExtensions,
  ResolveOptions,
  ExtendedResolutionResult,
} from '../resolver/index.js';
import { scanIDE } from '../scanner/index.js';

/**
 * Diff options
 */
export interface DiffOptions {
  /**
   * Target marketplace to check availability
   */
  targetMarketplace: MarketplaceType;

  /**
   * Fallback marketplaces
   */
  fallbackMarketplaces?: MarketplaceType[];

  /**
   * Matching options
   */
  matchOptions?: MatchOptions;

  /**
   * Concurrency for marketplace resolution
   */
  concurrency?: number;

  /**
   * Skip marketplace availability check
   * @default false
   */
  skipAvailabilityCheck?: boolean;
}

/**
 * Extended diff result with IDE information
 */
export interface ExtensionDiffReport {
  /** Source IDE type */
  sourceIDE: IDEType;

  /** Target IDE type */
  targetIDE: IDEType;

  /** Target marketplace */
  targetMarketplace: MarketplaceType;

  /** Generated diff */
  diff: ExtensionDiff;

  /** Raw matches (before availability check) */
  matches: ExtensionMatch[];

  /** Timestamp */
  generatedAt: Date;
}

/**
 * Generate extension diff from matches and availability check
 */
async function generateDiff(
  matches: ExtensionMatch[],
  targetMarketplace: MarketplaceType,
  options: DiffOptions
): Promise<ExtensionDiff> {
  const sourceOnlyMatches = getSourceOnlyExtensions(matches);
  const targetOnlyMatches = getTargetOnlyExtensions(matches);
  const versionMismatchMatches = getVersionMismatches(matches);
  const exactMatchMatches = getExactMatches(matches);

  let availabilityResults: Map<string, ExtendedResolutionResult> = new Map();

  // Check availability for source-only extensions
  if (!options.skipAvailabilityCheck && sourceOnlyMatches.length > 0) {
    const sourceOnlyExtensions = sourceOnlyMatches
      .map(m => m.sourceExtension!)
      .filter(Boolean);

    const resolutionReport = await resolveInstalledExtensions(
      sourceOnlyExtensions,
      {
        targetMarketplace,
        fallbackMarketplaces: options.fallbackMarketplaces,
        concurrency: options.concurrency || 5,
      }
    );

    // Create map for fast lookup
    for (const result of resolutionReport.results) {
      availabilityResults.set(result.extensionId, result);
    }
  }

  // Build onlyInSource list with availability info
  const onlyInSource = sourceOnlyMatches.map(match => {
    const ext = match.sourceExtension!;
    const availability = availabilityResults.get(ext.id);

    return {
      extensionId: ext.id,
      displayName: ext.displayName || ext.name,
      version: ext.version,
      availableInTarget: availability?.status === 'found' || false,
    };
  });

  // Build onlyInTarget list
  const onlyInTarget = targetOnlyMatches.map(match => {
    const ext = match.targetExtension!;

    return {
      extensionId: ext.id,
      displayName: ext.displayName || ext.name,
      version: ext.version,
    };
  });

  // Build inBoth list (version mismatches + exact matches)
  const inBoth = [
    ...versionMismatchMatches.map(match => ({
      extensionId: match.extensionId,
      displayName: match.sourceExtension?.displayName || match.sourceExtension?.name || match.extensionId,
      sourceVersion: match.sourceVersion!,
      targetVersion: match.targetVersion!,
      versionMatch: false,
    })),
    ...exactMatchMatches.map(match => ({
      extensionId: match.extensionId,
      displayName: match.sourceExtension?.displayName || match.sourceExtension?.name || match.extensionId,
      sourceVersion: match.sourceVersion!,
      targetVersion: match.targetVersion!,
      versionMatch: true,
    })),
  ];

  // Calculate summary
  const availableForSync = onlyInSource.filter(e => e.availableInTarget).length;
  const notAvailableForSync = onlyInSource.filter(e => !e.availableInTarget).length;

  const summary = {
    totalInSource: matches.filter(m => m.sourceExtension).length,
    totalInTarget: matches.filter(m => m.targetExtension).length,
    onlyInSourceCount: onlyInSource.length,
    onlyInTargetCount: onlyInTarget.length,
    inBothCount: inBoth.length,
    availableForSync,
    notAvailableForSync,
  };

  return {
    onlyInSource,
    onlyInTarget,
    inBoth,
    summary,
  };
}

/**
 * Generate diff between two extension lists
 */
export async function diffExtensions(
  sourceExtensions: InstalledExtension[],
  targetExtensions: InstalledExtension[],
  options: DiffOptions
): Promise<ExtensionDiff> {
  // Match extensions
  const matches = matchExtensions(
    sourceExtensions,
    targetExtensions,
    options.matchOptions
  );

  // Generate diff with availability check
  return generateDiff(matches, options.targetMarketplace, options);
}

/**
 * Generate diff report between two IDEs
 */
export async function diffIDEs(
  sourceIDE: IDEType,
  targetIDE: IDEType,
  options: DiffOptions
): Promise<ExtensionDiffReport> {
  // Scan both IDEs
  const sourceScan = await scanIDE(sourceIDE);
  const targetScan = await scanIDE(targetIDE);

  if (!sourceScan) {
    throw new Error(`Source IDE '${sourceIDE}' not found or not available`);
  }

  if (!targetScan) {
    throw new Error(`Target IDE '${targetIDE}' not found or not available`);
  }

  // Generate matches
  const matches = matchExtensions(
    sourceScan.extensions,
    targetScan.extensions,
    options.matchOptions
  );

  // Generate diff
  const diff = await generateDiff(matches, options.targetMarketplace, options);

  return {
    sourceIDE,
    targetIDE,
    targetMarketplace: options.targetMarketplace,
    diff,
    matches,
    generatedAt: new Date(),
  };
}

/**
 * Generate a quick diff without availability check
 */
export async function quickDiffIDEs(
  sourceIDE: IDEType,
  targetIDE: IDEType,
  options?: Omit<DiffOptions, 'skipAvailabilityCheck' | 'targetMarketplace'>
): Promise<ExtensionDiffReport> {
  return diffIDEs(sourceIDE, targetIDE, {
    ...options,
    targetMarketplace: 'openvsx', // Default, won't be used
    skipAvailabilityCheck: true,
  });
}

/**
 * Export diff to JSON format
 */
export function exportDiff(report: ExtensionDiffReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Print diff summary to console
 */
export function printDiffSummary(report: ExtensionDiffReport): void {
  const { diff, sourceIDE, targetIDE } = report;

  console.log(`\n=== Extension Diff: ${sourceIDE} → ${targetIDE} ===\n`);

  console.log('Summary:');
  console.log(`  Total in ${sourceIDE}: ${diff.summary.totalInSource}`);
  console.log(`  Total in ${targetIDE}: ${diff.summary.totalInTarget}`);
  console.log(`  Only in ${sourceIDE}: ${diff.summary.onlyInSourceCount}`);
  console.log(`  Only in ${targetIDE}: ${diff.summary.onlyInTargetCount}`);
  console.log(`  In both: ${diff.summary.inBothCount}`);

  if (diff.summary.availableForSync > 0 || diff.summary.notAvailableForSync > 0) {
    console.log(`\nSync Potential:`);
    console.log(`  Available for sync: ${diff.summary.availableForSync}`);
    console.log(`  Not available: ${diff.summary.notAvailableForSync}`);
  }

  if (diff.onlyInSource.length > 0) {
    console.log(`\n--- Only in ${sourceIDE} (${diff.onlyInSource.length}) ---`);
    for (const ext of diff.onlyInSource.slice(0, 5)) {
      const status = ext.availableInTarget ? '✓' : '✗';
      console.log(`  ${status} ${ext.displayName || ext.extensionId} (${ext.version})`);
    }
    if (diff.onlyInSource.length > 5) {
      console.log(`  ... and ${diff.onlyInSource.length - 5} more`);
    }
  }

  if (diff.onlyInTarget.length > 0) {
    console.log(`\n--- Only in ${targetIDE} (${diff.onlyInTarget.length}) ---`);
    for (const ext of diff.onlyInTarget.slice(0, 5)) {
      console.log(`  • ${ext.displayName || ext.extensionId} (${ext.version})`);
    }
    if (diff.onlyInTarget.length > 5) {
      console.log(`  ... and ${diff.onlyInTarget.length - 5} more`);
    }
  }

  const versionMismatches = diff.inBoth.filter(e => !e.versionMatch);
  if (versionMismatches.length > 0) {
    console.log(`\n--- Version Mismatches (${versionMismatches.length}) ---`);
    for (const ext of versionMismatches.slice(0, 5)) {
      console.log(`  ⚠ ${ext.displayName || ext.extensionId}`);
      console.log(`     ${sourceIDE}: ${ext.sourceVersion} → ${targetIDE}: ${ext.targetVersion}`);
    }
    if (versionMismatches.length > 5) {
      console.log(`  ... and ${versionMismatches.length - 5} more`);
    }
  }
}
