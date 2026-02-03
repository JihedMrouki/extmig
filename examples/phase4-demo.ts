/**
 * Phase 4 Matcher & Diff Engine Demo
 *
 * Demonstrates extension matching and diff generation.
 */

import {
  matchExtensions,
  compareVersions,
  getMatchStatistics,
  getSourceOnlyExtensions,
  getTargetOnlyExtensions,
  getVersionMismatches,
} from '../src/core/matcher/index.js';
import {
  diffExtensions,
  diffIDEs,
  quickDiffIDEs,
  printDiffSummary,
} from '../src/core/diff/index.js';
import { InstalledExtension } from '../src/types/index.js';
import { scanIDE } from '../src/core/scanner/index.js';

async function main() {
  console.log('=== Phase 4: Matcher & Diff Engine Demo ===\n');

  // Example 1: Version comparison
  console.log('--- Example 1: Version Comparison ---');
  const versionPairs = [
    ['1.0.0', '1.0.0'],
    ['1.0.0', '1.0.1'],
    ['1.2.3', '1.2.2'],
    ['2.0.0', '1.9.9'],
    ['10.1.0', '12.3.0'],
  ];

  for (const [v1, v2] of versionPairs) {
    const cmp = compareVersions(v1, v2);
    const symbol = cmp === 0 ? '=' : cmp < 0 ? '<' : '>';
    console.log(`  ${v1} ${symbol} ${v2}`);
  }

  // Example 2: Extension matching with mock data
  console.log('\n--- Example 2: Extension Matching (Mock Data) ---');

  const sourceExtensions: InstalledExtension[] = [
    {
      id: 'publisher1.ext1',
      publisher: 'publisher1',
      name: 'ext1',
      displayName: 'Extension 1',
      version: '1.0.0',
      path: '/path/to/ext1',
      enabled: true,
    },
    {
      id: 'publisher2.ext2',
      publisher: 'publisher2',
      name: 'ext2',
      displayName: 'Extension 2',
      version: '2.0.0',
      path: '/path/to/ext2',
      enabled: true,
    },
    {
      id: 'publisher3.ext3',
      publisher: 'publisher3',
      name: 'ext3',
      displayName: 'Extension 3',
      version: '3.0.0',
      path: '/path/to/ext3',
      enabled: true,
    },
  ];

  const targetExtensions: InstalledExtension[] = [
    {
      id: 'publisher1.ext1',
      publisher: 'publisher1',
      name: 'ext1',
      displayName: 'Extension 1',
      version: '1.0.1', // Different version
      path: '/path/to/ext1',
      enabled: true,
    },
    {
      id: 'publisher2.ext2',
      publisher: 'publisher2',
      name: 'ext2',
      displayName: 'Extension 2',
      version: '2.0.0', // Same version
      path: '/path/to/ext2',
      enabled: true,
    },
    {
      id: 'publisher4.ext4',
      publisher: 'publisher4',
      name: 'ext4',
      displayName: 'Extension 4',
      version: '4.0.0', // Only in target
      path: '/path/to/ext4',
      enabled: true,
    },
  ];

  const matches = matchExtensions(sourceExtensions, targetExtensions);

  console.log('Matches:');
  for (const match of matches) {
    const icon = match.matchType === 'exact' ? '✓'
      : match.matchType === 'version_mismatch' ? '⚠'
      : match.matchType === 'source_only' ? '→'
      : '←';

    console.log(`  ${icon} ${match.extensionId} (${match.matchType})`);

    if (match.sourceVersion && match.targetVersion) {
      console.log(`     Source: ${match.sourceVersion} | Target: ${match.targetVersion}`);
    } else if (match.sourceVersion) {
      console.log(`     Source: ${match.sourceVersion} | Target: -`);
    } else if (match.targetVersion) {
      console.log(`     Source: - | Target: ${match.targetVersion}`);
    }
  }

  const stats = getMatchStatistics(matches);
  console.log('\nStatistics:');
  console.log(`  Total in source: ${stats.totalInSource}`);
  console.log(`  Total in target: ${stats.totalInTarget}`);
  console.log(`  Exact matches: ${stats.exactMatches}`);
  console.log(`  Version mismatches: ${stats.versionMismatches}`);
  console.log(`  Source only: ${stats.sourceOnly}`);
  console.log(`  Target only: ${stats.targetOnly}`);

  // Example 3: Filter match results
  console.log('\n--- Example 3: Filtered Match Results ---');

  const sourceOnly = getSourceOnlyExtensions(matches);
  console.log(`\nSource-only extensions (${sourceOnly.length}):`);
  for (const match of sourceOnly) {
    console.log(`  → ${match.extensionId}`);
  }

  const targetOnly = getTargetOnlyExtensions(matches);
  console.log(`\nTarget-only extensions (${targetOnly.length}):`);
  for (const match of targetOnly) {
    console.log(`  ← ${match.extensionId}`);
  }

  const versionMismatches = getVersionMismatches(matches);
  console.log(`\nVersion mismatches (${versionMismatches.length}):`);
  for (const match of versionMismatches) {
    console.log(`  ⚠ ${match.extensionId}: ${match.sourceVersion} → ${match.targetVersion}`);
  }

  // Example 4: Generate diff without availability check
  console.log('\n--- Example 4: Generate Diff (Mock Data) ---');

  const diff = await diffExtensions(sourceExtensions, targetExtensions, {
    targetMarketplace: 'openvsx',
    skipAvailabilityCheck: true,
  });

  console.log('Diff Summary:');
  console.log(`  Total in source: ${diff.summary.totalInSource}`);
  console.log(`  Total in target: ${diff.summary.totalInTarget}`);
  console.log(`  Only in source: ${diff.summary.onlyInSourceCount}`);
  console.log(`  Only in target: ${diff.summary.onlyInTargetCount}`);
  console.log(`  In both: ${diff.summary.inBothCount}`);

  console.log('\nOnly in source:');
  for (const ext of diff.onlyInSource) {
    console.log(`  • ${ext.displayName || ext.extensionId} (${ext.version})`);
  }

  console.log('\nOnly in target:');
  for (const ext of diff.onlyInTarget) {
    console.log(`  • ${ext.displayName || ext.extensionId} (${ext.version})`);
  }

  console.log('\nIn both:');
  for (const ext of diff.inBoth) {
    const match = ext.versionMatch ? '✓' : '⚠';
    console.log(`  ${match} ${ext.displayName || ext.extensionId}`);
    if (!ext.versionMatch) {
      console.log(`     ${ext.sourceVersion} → ${ext.targetVersion}`);
    }
  }

  // Example 5: Diff with availability check
  console.log('\n--- Example 5: Diff with Marketplace Availability ---');
  console.log('Checking availability on Open VSX...');

  const diffWithAvailability = await diffExtensions(
    sourceExtensions.slice(0, 2), // Only check first 2 to speed up demo
    targetExtensions.slice(0, 1),
    {
      targetMarketplace: 'openvsx',
      fallbackMarketplaces: ['vscode'],
      concurrency: 2,
    }
  );

  console.log('\nDiff with availability:');
  console.log(`  Available for sync: ${diffWithAvailability.summary.availableForSync}`);
  console.log(`  Not available: ${diffWithAvailability.summary.notAvailableForSync}`);

  console.log('\nOnly in source (with availability):');
  for (const ext of diffWithAvailability.onlyInSource) {
    const status = ext.availableInTarget ? '✓ Available' : '✗ Not available';
    console.log(`  ${status}: ${ext.displayName || ext.extensionId}`);
  }

  // Example 6: Real IDE diff (if VS Code is installed)
  console.log('\n--- Example 6: Real IDE Diff ---');

  try {
    const vsScan = await scanIDE('vscode');

    if (!vsScan || vsScan.extensions.length === 0) {
      console.log('No VS Code installation found. Skipping real IDE diff.');
      console.log('(Install VS Code and extensions to test this feature)');
    } else {
      console.log(`Found ${vsScan.extensions.length} extensions in VS Code`);

      // Simulate a diff by comparing VS Code with a subset of itself
      // (In real usage, this would be VS Code vs VSCodium)
      console.log('\nSimulating: VS Code → VSCodium (using subset for demo)');

      const fullSet = vsScan.extensions;
      const subSet = vsScan.extensions.slice(0, Math.floor(fullSet.length * 0.7)); // 70% of extensions

      const simulatedDiff = await diffExtensions(fullSet, subSet, {
        targetMarketplace: 'openvsx',
        skipAvailabilityCheck: true, // Skip for demo speed
      });

      console.log('\nSimulated Diff Summary:');
      console.log(`  Total in "VS Code": ${simulatedDiff.summary.totalInSource}`);
      console.log(`  Total in "VSCodium": ${simulatedDiff.summary.totalInTarget}`);
      console.log(`  Missing in target: ${simulatedDiff.summary.onlyInSourceCount}`);
      console.log(`  Extra in target: ${simulatedDiff.summary.onlyInTargetCount}`);
      console.log(`  In both: ${simulatedDiff.summary.inBothCount}`);

      if (simulatedDiff.onlyInSource.length > 0) {
        console.log(`\nExtensions missing in target (first 5):`);
        for (const ext of simulatedDiff.onlyInSource.slice(0, 5)) {
          console.log(`  → ${ext.displayName || ext.extensionId} (${ext.version})`);
        }
        if (simulatedDiff.onlyInSource.length > 5) {
          console.log(`  ... and ${simulatedDiff.onlyInSource.length - 5} more`);
        }
      }
    }
  } catch (error) {
    console.log('Error scanning VS Code:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 7: Real diff with availability check
  console.log('\n--- Example 7: Real Extensions with Availability Check ---');

  try {
    const vsScan = await scanIDE('vscode');

    if (vsScan && vsScan.extensions.length > 0) {
      console.log('Checking first 3 extensions on Open VSX...');

      const sample = vsScan.extensions.slice(0, 3);
      const emptyTarget: InstalledExtension[] = [];

      const realDiff = await diffExtensions(sample, emptyTarget, {
        targetMarketplace: 'openvsx',
        fallbackMarketplaces: ['vscode'],
        concurrency: 2,
      });

      console.log('\nResults:');
      for (const ext of realDiff.onlyInSource) {
        const status = ext.availableInTarget ? '✓' : '✗';
        console.log(`  ${status} ${ext.displayName || ext.extensionId}`);
        console.log(`     Version: ${ext.version}`);
        console.log(`     Open VSX: ${ext.availableInTarget ? 'Available' : 'Not available'}`);
      }

      console.log(`\nSummary:`);
      console.log(`  Available for sync: ${realDiff.summary.availableForSync} / ${realDiff.summary.onlyInSourceCount}`);

      const coverage = realDiff.summary.onlyInSourceCount > 0
        ? Math.round((realDiff.summary.availableForSync / realDiff.summary.onlyInSourceCount) * 100)
        : 0;
      console.log(`  Open VSX coverage: ${coverage}%`);
    }
  } catch (error) {
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n=== Phase 4 Demo Complete ===');
}

// Run demo
main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
