/**
 * Extension Installer
 *
 * Installs extensions to target IDE with progress tracking.
 */

import {
  IDEType,
  SyncResult,
  SyncStatus,
  SyncSummary,
  MarketplaceType,
} from '../../types/index.js';
import { ExtensionDiff, ExtensionDiffReport } from '../diff/index.js';
import {
  installExtension,
  uninstallExtension,
  checkCLIAvailable,
  CLIExecutionError,
} from './cli.js';

/**
 * Installation options
 */
export interface InstallOptions {
  /**
   * Dry run mode (don't actually install)
   * @default false
   */
  dryRun?: boolean;

  /**
   * Force installation even if already installed
   * @default false
   */
  force?: boolean;

  /**
   * Concurrency (number of parallel installations)
   * @default 1
   */
  concurrency?: number;

  /**
   * Timeout per extension (ms)
   * @default 120000
   */
  timeout?: number;

  /**
   * Skip extensions that are not available
   * @default true
   */
  skipUnavailable?: boolean;

  /**
   * Continue on errors
   * @default true
   */
  continueOnError?: boolean;
}

const DEFAULT_INSTALL_OPTIONS: Required<InstallOptions> = {
  dryRun: false,
  force: false,
  concurrency: 1,
  timeout: 120000,
  skipUnavailable: true,
  continueOnError: true,
};

/**
 * Sync operation context
 */
export interface SyncContext {
  sourceIDE: IDEType;
  targetIDE: IDEType;
  targetMarketplace: MarketplaceType;
  diff: ExtensionDiff;
  options: Required<InstallOptions>;
}

/**
 * Install a single extension
 */
async function installSingleExtension(
  targetIDE: IDEType,
  extensionId: string,
  sourceVersion: string,
  targetMarketplace: MarketplaceType,
  options: Required<InstallOptions>
): Promise<SyncResult> {
  const baseResult: Omit<SyncResult, 'status' | 'error'> = {
    extensionId,
    sourceVersion,
    sourceMarketplace: targetMarketplace, // Source of truth for target
    targetMarketplace,
    timestamp: new Date(),
  };

  // Dry run
  if (options.dryRun) {
    return {
      ...baseResult,
      status: 'pending',
    };
  }

  try {
    // Execute installation
    const result = await installExtension(targetIDE, extensionId, {
      timeout: options.timeout,
      force: options.force,
    });

    return {
      ...baseResult,
      targetVersion: sourceVersion, // Assume installed version matches
      status: 'installed',
    };
  } catch (error) {
    if (error instanceof CLIExecutionError) {
      // Check if already installed
      if (
        error.message.includes('already installed') ||
        error.stderr?.includes('already installed')
      ) {
        return {
          ...baseResult,
          targetVersion: sourceVersion,
          status: 'already_installed',
        };
      }

      return {
        ...baseResult,
        status: 'failed',
        error: error.message,
      };
    }

    return {
      ...baseResult,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Install extensions from diff report
 */
export async function installFromDiff(
  diff: ExtensionDiff,
  targetIDE: IDEType,
  targetMarketplace: MarketplaceType,
  options: InstallOptions = {}
): Promise<SyncResult[]> {
  const opts = { ...DEFAULT_INSTALL_OPTIONS, ...options };

  // Filter to installable extensions (only in source + available)
  const toInstall = diff.onlyInSource.filter(ext => {
    if (opts.skipUnavailable && !ext.availableInTarget) {
      return false;
    }
    return true;
  });

  if (toInstall.length === 0) {
    return [];
  }

  const results: SyncResult[] = [];

  // Split into chunks for concurrent processing
  const chunks: typeof toInstall[] = [];
  for (let i = 0; i < toInstall.length; i += opts.concurrency) {
    chunks.push(toInstall.slice(i, i + opts.concurrency));
  }

  // Process chunks sequentially, but items within chunk concurrently
  for (const chunk of chunks) {
    const chunkResults = await Promise.allSettled(
      chunk.map(ext =>
        installSingleExtension(
          targetIDE,
          ext.extensionId,
          ext.version,
          targetMarketplace,
          opts
        )
      )
    );

    for (let i = 0; i < chunkResults.length; i++) {
      const result = chunkResults[i];
      const ext = chunk[i];

      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Promise rejected (shouldn't happen, but handle it)
        results.push({
          extensionId: ext.extensionId,
          sourceVersion: ext.version,
          sourceMarketplace: targetMarketplace,
          targetMarketplace,
          status: 'failed',
          timestamp: new Date(),
          error: result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error',
        });
      }

      // Stop on first error if continueOnError is false
      if (
        !opts.continueOnError &&
        result.status === 'fulfilled' &&
        result.value.status === 'failed'
      ) {
        return results;
      }
    }
  }

  return results;
}

/**
 * Generate sync summary from results
 */
export function generateSyncSummary(
  results: SyncResult[],
  diff: ExtensionDiff,
  context: SyncContext,
  startTime: Date,
  endTime?: Date
): SyncSummary {
  const installed = results.filter(r => r.status === 'installed').length;
  const alreadyInstalled = results.filter(r => r.status === 'already_installed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  // Extensions not available for sync
  const notAvailable = context.options.skipUnavailable
    ? diff.onlyInSource.filter((e: any) => !e.availableInTarget).length
    : 0;

  return {
    sourceIDE: context.sourceIDE,
    targetIDE: context.targetIDE,
    totalScanned: diff.summary.totalInSource,
    installed,
    alreadyInstalled,
    skipped,
    notAvailable,
    failed,
    results,
    dryRun: context.options.dryRun,
    startTime,
    endTime,
    duration: endTime ? endTime.getTime() - startTime.getTime() : undefined,
  };
}

/**
 * Sync extensions from diff report
 */
export interface SyncReport {
  context: SyncContext;
  summary: SyncSummary;
}

export async function syncFromDiff(
  diffReport: ExtensionDiffReport,
  options: InstallOptions = {}
): Promise<SyncReport> {
  const opts = { ...DEFAULT_INSTALL_OPTIONS, ...options };
  const startTime = new Date();

  // Check if target IDE CLI is available
  const cliAvailable = await checkCLIAvailable(diffReport.targetIDE);

  if (!cliAvailable && !opts.dryRun) {
    throw new Error(
      `CLI not available for ${diffReport.targetIDE}. Please ensure the IDE is installed and CLI is in PATH.`
    );
  }

  // Create context
  const context: SyncContext = {
    sourceIDE: diffReport.sourceIDE,
    targetIDE: diffReport.targetIDE,
    targetMarketplace: diffReport.targetMarketplace,
    diff: diffReport.diff,
    options: opts,
  };

  // Install extensions
  const results = await installFromDiff(
    diffReport.diff,
    diffReport.targetIDE,
    diffReport.targetMarketplace,
    options
  );

  const endTime = new Date();

  // Generate summary
  const summary = generateSyncSummary(
    results,
    diffReport.diff,
    context,
    startTime,
    endTime
  );

  return {
    context,
    summary,
  };
}

/**
 * Print sync summary to console
 */
export function printSyncSummary(report: SyncReport): void {
  const { context, summary } = report;

  console.log(`\n=== Sync Report: ${context.sourceIDE} → ${context.targetIDE} ===\n`);

  if (summary.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes made\n');
  }

  console.log('Summary:');
  console.log(`  Total extensions scanned: ${summary.totalScanned}`);

  const pendingCount = summary.results.filter(r => r.status === 'pending').length;

  if (summary.dryRun) {
    console.log(`  Would install: ${pendingCount}`);
  } else {
    console.log(`  ✓ Installed: ${summary.installed}`);
    console.log(`  ✓ Already installed: ${summary.alreadyInstalled}`);
    console.log(`  ✗ Failed: ${summary.failed}`);
    console.log(`  ⊘ Skipped: ${summary.skipped}`);
  }

  if (summary.notAvailable > 0) {
    console.log(`  ⚠ Not available on ${context.targetMarketplace}: ${summary.notAvailable}`);
  }

  if (summary.duration) {
    console.log(`\nDuration: ${(summary.duration / 1000).toFixed(1)}s`);
  }

  // Show details for failed installations
  const failedResults = summary.results.filter(r => r.status === 'failed');
  if (failedResults.length > 0 && !summary.dryRun) {
    console.log(`\nFailed Installations:`);
    for (const result of failedResults) {
      console.log(`  ✗ ${result.extensionId}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
  }

  // Show successful installations (first 5)
  const successResults = summary.results.filter(
    r => r.status === 'installed' || (summary.dryRun && r.status === 'pending')
  );
  if (successResults.length > 0) {
    const label = summary.dryRun ? 'Would Install:' : 'Installed:';
    console.log(`\n${label}`);
    for (const result of successResults.slice(0, 5)) {
      const icon = summary.dryRun ? '→' : '✓';
      console.log(`  ${icon} ${result.extensionId} (${result.sourceVersion})`);
    }
    if (successResults.length > 5) {
      console.log(`  ... and ${successResults.length - 5} more`);
    }
  }
}

/**
 * Export sync report to JSON
 */
export function exportSyncReport(report: SyncReport): string {
  return JSON.stringify(report, null, 2);
}

// Re-export CLI utilities
export {
  installExtension,
  uninstallExtension,
  checkCLIAvailable,
  getCLIPath,
  listExtensions,
  getIDEVersion,
  CLIExecutionError,
} from './cli.js';
