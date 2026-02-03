/**
 * Sync command - Synchronize extensions from source to target IDE
 */

import { diffIDEs } from '../../core/diff/index.js';
import { syncFromDiff, printSyncSummary } from '../../core/installer/index.js';
import type { IDEType, MarketplaceType } from '../../types/index.js';

export interface SyncOptions {
  marketplace?: string;
  dryRun?: boolean;
  concurrency?: number;
  skipUnavailable?: boolean;
  force?: boolean;
}

export async function syncCommand(
  sourceIDE: string,
  targetIDE: string,
  options: SyncOptions
) {
  try {
    // Validate IDE types
    const validIDEs = ['vscode', 'vscodium', 'cursor', 'code-oss'];
    if (!validIDEs.includes(sourceIDE) || !validIDEs.includes(targetIDE)) {
      console.error('Error: Invalid IDE type');
      console.error(`Valid options: ${validIDEs.join(', ')}`);
      process.exit(1);
    }

    // Validate marketplace
    const marketplace = (options.marketplace || 'openvsx') as MarketplaceType;
    const validMarketplaces = ['openvsx', 'vscode'];
    if (!validMarketplaces.includes(marketplace)) {
      console.error('Error: Invalid marketplace');
      console.error(`Valid options: ${validMarketplaces.join(', ')}`);
      process.exit(1);
    }

    const isDryRun = options.dryRun !== false; // Default to true for safety
    const concurrency = options.concurrency || 3;

    console.log(`${isDryRun ? '[DRY RUN] ' : ''}Syncing ${sourceIDE} → ${targetIDE}...`);
    console.log(`Target marketplace: ${marketplace}`);
    console.log(`Concurrency: ${concurrency}\n`);

    // Step 1: Generate diff
    console.log('Step 1: Generating diff...');
    const diffReport = await diffIDEs(sourceIDE as IDEType, targetIDE as IDEType, {
      targetMarketplace: marketplace,
      fallbackMarketplaces: marketplace === 'openvsx' ? ['vscode'] : ['openvsx'],
    });

    console.log(`Found ${diffReport.diff.summary.onlyInSourceCount} extension(s) to sync`);
    console.log(`Available: ${diffReport.diff.summary.availableForSync}`);
    console.log(`Not available: ${diffReport.diff.summary.notAvailableForSync}\n`);

    if (diffReport.diff.summary.availableForSync === 0) {
      console.log('Nothing to sync!');
      return;
    }

    // Step 2: Sync extensions
    console.log(`Step 2: ${isDryRun ? 'Simulating' : 'Installing'} extensions...\n`);
    const syncReport = await syncFromDiff(diffReport, {
      dryRun: isDryRun,
      concurrency,
      skipUnavailable: options.skipUnavailable !== false,
      continueOnError: true,
      force: options.force || false,
    });

    // Step 3: Display results
    console.log('');
    printSyncSummary(syncReport);

    if (isDryRun) {
      console.log('\n💡 This was a dry run. To actually install, use:');
      console.log(`   extsync sync ${sourceIDE} ${targetIDE} --no-dry-run\n`);
    }
  } catch (error) {
    console.error('Error during sync:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
