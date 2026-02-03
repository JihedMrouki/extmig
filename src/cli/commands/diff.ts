/**
 * Diff command - Compare extensions between two IDEs
 */

import { diffIDEs } from '../../core/diff/index.js';
import type { IDEType, MarketplaceType } from '../../types/index.js';

export interface DiffOptions {
  marketplace?: string;
  json?: boolean;
  fast?: boolean;
}

export async function diffCommand(
  sourceIDE: string,
  targetIDE: string,
  options: DiffOptions
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

    console.log(`Comparing ${sourceIDE} → ${targetIDE}...`);
    console.log(`Target marketplace: ${marketplace}\n`);

    const result = await diffIDEs(sourceIDE as IDEType, targetIDE as IDEType, {
      targetMarketplace: marketplace,
      fallbackMarketplaces: marketplace === 'openvsx' ? ['vscode'] : ['openvsx'],
      fast: options.fast,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Display summary
    console.log('=== Diff Summary ===\n');
    console.log(`Total in ${sourceIDE}: ${result.diff.summary.totalInSource}`);
    console.log(`Total in ${targetIDE}: ${result.diff.summary.totalInTarget}`);
    console.log(`Only in ${sourceIDE}: ${result.diff.summary.onlyInSourceCount}`);
    console.log(`Only in ${targetIDE}: ${result.diff.summary.onlyInTargetCount}`);
    console.log(`In both: ${result.diff.summary.inBothCount}`);
    console.log(`\nAvailable for sync: ${result.diff.summary.availableForSync}`);
    console.log(`Not available: ${result.diff.summary.notAvailableForSync}\n`);

    // Show extensions only in source (can be synced to target)
    if (result.diff.onlyInSource.length > 0) {
      console.log(`\n=== Extensions only in ${sourceIDE} ===\n`);
      result.diff.onlyInSource.forEach((ext, index) => {
        const status = ext.availableInTarget ? '✓' : '✗';
        const availability = ext.availableInTarget ? 'Available' : 'Not available';
        console.log(`${index + 1}. ${status} ${ext.displayName || ext.extensionId}`);
        console.log(`   Version: ${ext.version}`);
        console.log(`   Status: ${availability} on ${marketplace}`);
        console.log('');
      });
    }

    // Show extensions only in target
    if (result.diff.onlyInTarget.length > 0) {
      console.log(`\n=== Extensions only in ${targetIDE} ===\n`);
      result.diff.onlyInTarget.slice(0, 10).forEach((ext, index) => {
        console.log(`${index + 1}. ${ext.displayName || ext.extensionId}`);
        console.log(`   Version: ${ext.version}`);
        console.log('');
      });
      if (result.diff.onlyInTarget.length > 10) {
        console.log(`... and ${result.diff.onlyInTarget.length - 10} more\n`);
      }
    }
  } catch (error) {
    console.error('Error generating diff:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
