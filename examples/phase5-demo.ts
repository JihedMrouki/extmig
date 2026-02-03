/**
 * Phase 5 Installer Engine Demo
 *
 * Demonstrates extension installation and sync operations.
 */

import {
  checkCLIAvailable,
  getCLIPath,
  listExtensions,
  getIDEVersion,
  installFromDiff,
  syncFromDiff,
  generateSyncSummary,
  printSyncSummary,
} from '../src/core/installer/index.js';
import { diffIDEs } from '../src/core/diff/index.js';
import { scanIDE } from '../src/core/scanner/index.js';
import { InstalledExtension, ExtensionDiff } from '../src/types/index.js';

async function main() {
  console.log('=== Phase 5: Installer Engine Demo ===\n');

  // Example 1: Check CLI availability
  console.log('--- Example 1: Check CLI Availability ---');

  const ideTypes = ['vscode', 'vscodium', 'cursor', 'code-oss'] as const;

  for (const ideType of ideTypes) {
    try {
      const available = await checkCLIAvailable(ideType);
      const status = available ? '✓ Available' : '✗ Not available';
      console.log(`  ${status}: ${ideType}`);

      if (available) {
        const cliPath = await getCLIPath(ideType);
        console.log(`     CLI: ${cliPath}`);

        const version = await getIDEVersion(ideType);
        if (version) {
          console.log(`     Version: ${version}`);
        }
      }
    } catch (error) {
      console.log(`  ✗ Not available: ${ideType}`);
    }
  }

  // Example 2: List installed extensions via CLI
  console.log('\n--- Example 2: List Extensions via CLI ---');

  try {
    const vscodeAvailable = await checkCLIAvailable('vscode');

    if (vscodeAvailable) {
      console.log('Listing VS Code extensions via CLI...');
      const extensions = await listExtensions('vscode', {
        showVersions: false,
      });

      console.log(`Found ${extensions.length} extension(s):`);
      for (const ext of extensions.slice(0, 5)) {
        console.log(`  • ${ext}`);
      }
      if (extensions.length > 5) {
        console.log(`  ... and ${extensions.length - 5} more`);
      }
    } else {
      console.log('VS Code CLI not available. Skipping this example.');
    }
  } catch (error) {
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 3: Mock dry-run installation
  console.log('\n--- Example 3: Dry Run Installation (Mock Data) ---');

  // Create mock diff data
  const mockDiff: ExtensionDiff = {
    onlyInSource: [
      {
        extensionId: 'esbenp.prettier-vscode',
        displayName: 'Prettier',
        version: '10.1.0',
        availableInTarget: true,
      },
      {
        extensionId: 'dbaeumer.vscode-eslint',
        displayName: 'ESLint',
        version: '2.4.2',
        availableInTarget: true,
      },
      {
        extensionId: 'fake.unavailable-extension',
        displayName: 'Unavailable Extension',
        version: '1.0.0',
        availableInTarget: false,
      },
    ],
    onlyInTarget: [],
    inBoth: [],
    summary: {
      totalInSource: 3,
      totalInTarget: 0,
      onlyInSourceCount: 3,
      onlyInTargetCount: 0,
      inBothCount: 0,
      availableForSync: 2,
      notAvailableForSync: 1,
    },
  };

  console.log('Mock diff: 3 extensions to sync');
  console.log('  ✓ 2 available on target marketplace');
  console.log('  ✗ 1 not available');

  const dryRunResults = await installFromDiff(
    mockDiff,
    'vscodium',
    'openvsx',
    {
      dryRun: true,
      skipUnavailable: true,
    }
  );

  console.log('\nDry run results:');
  for (const result of dryRunResults) {
    console.log(`  → ${result.extensionId}`);
    console.log(`     Status: ${result.status}`);
    console.log(`     Version: ${result.sourceVersion}`);
  }

  const mockContext = {
    sourceIDE: 'vscode' as const,
    targetIDE: 'vscodium' as const,
    targetMarketplace: 'openvsx' as const,
    diff: mockDiff,
    options: {
      dryRun: true,
      force: false,
      concurrency: 1,
      timeout: 120000,
      skipUnavailable: true,
      continueOnError: true,
    },
  };

  const summary = generateSyncSummary(
    dryRunResults,
    mockDiff,
    mockContext,
    new Date(),
    new Date()
  );

  console.log('\nSummary:');
  const pendingCount = summary.results.filter((r: any) => r.status === 'pending').length;
  console.log(`  Would install: ${pendingCount}`);
  console.log(`  Not available: ${summary.notAvailable}`);

  // Example 4: Full sync report (dry run)
  console.log('\n--- Example 4: Full Sync Report (Dry Run) ---');

  try {
    const vscodeAvailable = await checkCLIAvailable('vscode');

    if (vscodeAvailable) {
      console.log('Scanning VS Code extensions...');
      const vsScan = await scanIDE('vscode');

      if (!vsScan || vsScan.extensions.length === 0) {
        console.log('No VS Code extensions found. Skipping this example.');
      } else {
        console.log(`Found ${vsScan.extensions.length} VS Code extensions`);

        // Simulate sync by comparing with empty target
        console.log('\nSimulating: VS Code → VSCodium (first 3 extensions only)');

        const subset = vsScan.extensions.slice(0, 3);
        const emptyTarget: InstalledExtension[] = [];

        // Use Phase 2-4 to create diff
        const { diffExtensions } = await import('../src/core/diff/index.js');

        const diff = await diffExtensions(subset, emptyTarget, {
          targetMarketplace: 'openvsx',
          fallbackMarketplaces: ['vscode'],
          concurrency: 2,
        });

        console.log('\nDiff Summary:');
        console.log(`  Extensions to sync: ${diff.summary.onlyInSourceCount}`);
        console.log(`  Available: ${diff.summary.availableForSync}`);
        console.log(`  Not available: ${diff.summary.notAvailableForSync}`);

        // Create mock diff report for sync
        const mockDiffReport = {
          sourceIDE: 'vscode' as const,
          targetIDE: 'vscodium' as const,
          targetMarketplace: 'openvsx' as const,
          diff,
          matches: [],
          generatedAt: new Date(),
        };

        // Dry run sync
        console.log('\n🔍 Running dry-run sync...');
        const syncReport = await syncFromDiff(mockDiffReport, {
          dryRun: true,
          skipUnavailable: true,
          concurrency: 1,
        });

        printSyncSummary(syncReport);
      }
    } else {
      console.log('VS Code CLI not available. Skipping this example.');
    }
  } catch (error) {
    console.log('Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 5: Explain real sync (without executing)
  console.log('\n--- Example 5: How to Run Real Sync ---');

  console.log('\nTo perform a real sync (NOT dry-run):');
  console.log('');
  console.log('```typescript');
  console.log('// 1. Generate diff between IDEs');
  console.log('const diffReport = await diffIDEs("vscode", "vscodium", {');
  console.log('  targetMarketplace: "openvsx",');
  console.log('  fallbackMarketplaces: ["vscode"],');
  console.log('});');
  console.log('');
  console.log('// 2. Run sync (with dryRun: false)');
  console.log('const syncReport = await syncFromDiff(diffReport, {');
  console.log('  dryRun: false,           // Actually install');
  console.log('  skipUnavailable: true,   // Skip unavailable extensions');
  console.log('  concurrency: 1,          // Install one at a time');
  console.log('  continueOnError: true,   // Continue if one fails');
  console.log('  force: false,            // Don\'t reinstall existing');
  console.log('});');
  console.log('');
  console.log('// 3. View results');
  console.log('printSyncSummary(syncReport);');
  console.log('```');
  console.log('');
  console.log('⚠️  This demo uses dry-run mode only for safety.');
  console.log('    To test real installation, modify the demo code.');

  // Example 6: Error handling demonstration
  console.log('\n--- Example 6: Error Handling ---');

  console.log('The installer handles various error scenarios:');
  console.log('  • CLI not found → Friendly error message');
  console.log('  • Extension already installed → Skip with status');
  console.log('  • Installation timeout → Fail with timeout error');
  console.log('  • Network issues → Retry or fail gracefully');
  console.log('  • Invalid extension ID → Fail with clear message');
  console.log('');
  console.log('All errors are captured in SyncResult with:');
  console.log('  • status: "failed"');
  console.log('  • error: Detailed error message');
  console.log('  • Continuation to next extension (if continueOnError: true)');

  // Example 7: Performance notes
  console.log('\n--- Example 7: Performance Characteristics ---');

  console.log('Installation timing estimates:');
  console.log('  • Single extension: 5-15 seconds');
  console.log('  • 10 extensions (sequential): 50-150 seconds');
  console.log('  • 10 extensions (concurrency: 3): 20-50 seconds');
  console.log('  • Dry-run: < 1 second (no actual installation)');
  console.log('');
  console.log('Concurrency recommendations:');
  console.log('  • concurrency: 1 → Safest, slowest');
  console.log('  • concurrency: 3 → Balanced (recommended)');
  console.log('  • concurrency: 5+ → Faster, but may hit rate limits');

  console.log('\n=== Phase 5 Demo Complete ===');
  console.log('\n✓ All Phase 5 features demonstrated');
  console.log('✓ Dry-run mode ensures no unwanted installations');
  console.log('✓ Ready for Phase 6 (CLI UX & Polish)');
}

// Run demo
main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
