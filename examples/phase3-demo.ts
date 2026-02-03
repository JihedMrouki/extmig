/**
 * Phase 3 Marketplace Resolver Demo
 *
 * Demonstrates marketplace API clients and extension resolution.
 */

import { OpenVSX, VSCode, queryExtensionMultiple } from '../src/marketplaces/index.js';
import { resolveExtensions, resolveInstalledExtensions } from '../src/core/resolver/index.js';
import { scanIDE } from '../src/core/scanner/index.js';

async function main() {
  console.log('=== Phase 3: Marketplace Resolver Demo ===\n');

  // Example 1: Query single extension on Open VSX
  console.log('--- Example 1: Query Extension on Open VSX ---');
  try {
    const openvsxExt = await OpenVSX.queryExtensionById('esbenp.prettier-vscode');

    if (openvsxExt) {
      console.log('✓ Found on Open VSX:');
      console.log(`  Name: ${openvsxExt.displayName}`);
      console.log(`  ID: ${openvsxExt.id}`);
      console.log(`  Version: ${openvsxExt.version}`);
      console.log(`  Downloads: ${openvsxExt.metadata?.downloadCount?.toLocaleString() || 'N/A'}`);
      console.log(`  Verified: ${openvsxExt.metadata?.verified ? 'Yes' : 'No'}`);
      console.log(`  URL: ${openvsxExt.url}`);
    } else {
      console.log('✗ Not found on Open VSX');
    }
  } catch (error) {
    console.log('✗ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 2: Query same extension on VS Code Marketplace
  console.log('\n--- Example 2: Query Extension on VS Code Marketplace ---');
  try {
    const vscodeExt = await VSCode.queryExtensionById('esbenp.prettier-vscode');

    if (vscodeExt) {
      console.log('✓ Found on VS Code Marketplace:');
      console.log(`  Name: ${vscodeExt.displayName}`);
      console.log(`  ID: ${vscodeExt.id}`);
      console.log(`  Version: ${vscodeExt.version}`);
      console.log(`  Downloads: ${vscodeExt.metadata?.downloadCount?.toLocaleString() || 'N/A'}`);
      console.log(`  Verified: ${vscodeExt.metadata?.verified ? 'Yes' : 'No'}`);
      console.log(`  URL: ${vscodeExt.url}`);
    } else {
      console.log('✗ Not found on VS Code Marketplace');
    }
  } catch (error) {
    console.log('✗ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 3: Query extension on multiple marketplaces
  console.log('\n--- Example 3: Query on Multiple Marketplaces ---');
  try {
    const multiResult = await queryExtensionMultiple(
      'rust-lang.rust-analyzer',
      ['vscode', 'openvsx']
    );

    console.log('Extension: rust-analyzer');
    for (const result of multiResult.results) {
      const status = result.extension ? '✓' : '✗';
      const version = result.extension?.version || 'Not found';
      console.log(`  ${status} ${result.marketplace}: ${version}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }

    if (multiResult.firstAvailable) {
      console.log(`\nFirst available: ${multiResult.firstAvailable.marketplace} v${multiResult.firstAvailable.version}`);
    }
  } catch (error) {
    console.log('✗ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 4: Search for extensions
  console.log('\n--- Example 4: Search Extensions ---');
  try {
    console.log('Searching Open VSX for "python"...');
    const searchResults = await OpenVSX.searchExtensions('python', { limit: 3 });

    console.log(`Found ${searchResults.length} result(s):`);
    for (const ext of searchResults) {
      console.log(`  • ${ext.displayName || ext.id}`);
      console.log(`     ID: ${ext.id}`);
      console.log(`     Version: ${ext.version}`);
      if (ext.description) {
        const desc = ext.description.length > 60
          ? ext.description.substring(0, 57) + '...'
          : ext.description;
        console.log(`     Description: ${desc}`);
      }
    }
  } catch (error) {
    console.log('✗ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 5: Resolve extensions with resolver
  console.log('\n--- Example 5: Resolve Test Extensions ---');
  const testExtensions = [
    {
      id: 'esbenp.prettier-vscode',
      publisher: 'esbenp',
      name: 'prettier-vscode',
      displayName: 'Prettier',
      version: '10.1.0',
    },
    {
      id: 'rust-lang.rust-analyzer',
      publisher: 'rust-lang',
      name: 'rust-analyzer',
      displayName: 'rust-analyzer',
      version: '0.3.1',
    },
    {
      id: 'nonexistent.fake-extension',
      publisher: 'nonexistent',
      name: 'fake-extension',
      displayName: 'Fake Extension',
      version: '1.0.0',
    },
  ];

  try {
    console.log('Resolving against Open VSX with VS Code fallback...');
    const report = await resolveExtensions(testExtensions, {
      targetMarketplace: 'openvsx',
      fallbackMarketplaces: ['vscode'],
      concurrency: 3,
    });

    console.log('\nResults:');
    for (const result of report.results) {
      const status = result.status === 'found' ? '✓' : '✗';
      console.log(`  ${status} ${result.extensionId}`);
      console.log(`     Target (${report.targetMarketplace}): ${result.status === 'found' ? 'Available' : 'Not available'}`);

      if (result.fallbackExtension) {
        console.log(`     Fallback (${result.fallbackMarketplace}): Available v${result.fallbackExtension.version}`);
      }

      if (result.error && !result.fallbackExtension) {
        console.log(`     Error: ${result.error}`);
      }
    }

    console.log('\nSummary:');
    console.log(`  Total: ${report.summary.total}`);
    console.log(`  Available on target: ${report.summary.available}`);
    console.log(`  Available on fallback: ${report.summary.fallbackAvailable}`);
    console.log(`  Unavailable: ${report.summary.unavailable}`);
  } catch (error) {
    console.log('✗ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Example 6: Real-world scenario - resolve installed extensions
  console.log('\n--- Example 6: Resolve Real Installed Extensions ---');
  try {
    // Scan VS Code extensions
    const scanResult = await scanIDE('vscode');

    if (!scanResult || scanResult.extensions.length === 0) {
      console.log('No VS Code installation or extensions found. Skipping this example.');
      console.log('(Install VS Code and some extensions to test this feature)');
    } else {
      console.log(`Found ${scanResult.extensions.length} installed extension(s) in VS Code`);
      console.log('Checking availability on Open VSX...\n');

      // Take first 5 extensions for demo
      const samplesToResolve = scanResult.extensions.slice(0, 5);

      const report = await resolveInstalledExtensions(samplesToResolve, {
        targetMarketplace: 'openvsx',
        fallbackMarketplaces: ['vscode'],
        concurrency: 3,
      });

      console.log('Results:');
      for (const result of report.results) {
        const status = result.status === 'found' ? '✓' : '⚠';
        const installed = result.installedExtension;
        console.log(`  ${status} ${installed?.displayName || result.extensionId}`);
        console.log(`     Installed version: ${installed?.version}`);

        if (result.status === 'found' && result.extension) {
          console.log(`     Open VSX version: ${result.extension.version}`);
          const match = installed?.version === result.extension.version ? 'Exact match' : 'Different version';
          console.log(`     ${match}`);
        } else if (result.fallbackExtension) {
          console.log(`     Not on Open VSX, but available on ${result.fallbackMarketplace}`);
          console.log(`     ${result.fallbackMarketplace} version: ${result.fallbackExtension.version}`);
        } else {
          console.log(`     Not available on Open VSX or fallback`);
        }
      }

      console.log('\nSummary:');
      console.log(`  Available on Open VSX: ${report.summary.available} / ${report.summary.total}`);
      console.log(`  Available on fallback only: ${report.summary.fallbackAvailable}`);
      console.log(`  Not available anywhere: ${report.summary.unavailable}`);

      const coverage = Math.round((report.summary.available / report.summary.total) * 100);
      console.log(`  Open VSX coverage: ${coverage}%`);
    }
  } catch (error) {
    console.log('✗ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n=== Phase 3 Demo Complete ===');
}

// Run demo
main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
