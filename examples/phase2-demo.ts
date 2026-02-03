/**
 * Phase 2 Scanner Demo
 *
 * Demonstrates IDE detection and extension scanning.
 */

import {
  detectAllIDEs,
  findAvailableIDEs,
  scanIDE,
  scanAllIDEs,
  getExtensionsSummary,
} from '../src/core/scanner/index.js';

async function main() {
  console.log('=== Phase 2: Extension Scanner Demo ===\n');

  // Example 1: Detect all IDEs
  console.log('--- Example 1: IDE Detection ---');
  const allIDEs = await detectAllIDEs();

  console.log(`Found ${allIDEs.length} IDE configurations:`);
  for (const detection of allIDEs) {
    const { ide, available, extensionsPath } = detection;
    const status = available ? '✓' : '✗';
    const version = ide.version ? ` (${ide.version})` : '';

    console.log(`  ${status} ${ide.name}${version}`);
    if (ide.cliPath) {
      console.log(`     CLI: ${ide.cliPath}`);
    }
    if (extensionsPath) {
      console.log(`     Extensions: ${extensionsPath}`);
    }
  }

  // Example 2: Find available IDEs (detected + extensions directory exists)
  console.log('\n--- Example 2: Available IDEs ---');
  const availableIDEs = await findAvailableIDEs();

  if (availableIDEs.length === 0) {
    console.log('  No available IDEs found.');
    console.log('  (This is expected if no VS Code-based IDEs are installed)');
    return;
  }

  console.log(`Found ${availableIDEs.length} available IDE(s):`);
  for (const detection of availableIDEs) {
    console.log(`  ✓ ${detection.ide.name}`);
    console.log(`     Default marketplace: ${detection.ide.defaultMarketplace}`);
  }

  // Example 3: Scan extensions for the first available IDE
  console.log('\n--- Example 3: Scan Extensions ---');
  const firstIDE = availableIDEs[0];
  console.log(`Scanning extensions for ${firstIDE.ide.name}...`);

  const scanResult = await scanIDE(firstIDE.ide.type);

  if (!scanResult) {
    console.log('  Failed to scan IDE');
    return;
  }

  console.log(`Found ${scanResult.extensions.length} extension(s):`);

  // Show first 5 extensions
  const samplesToShow = Math.min(5, scanResult.extensions.length);
  for (let i = 0; i < samplesToShow; i++) {
    const ext = scanResult.extensions[i];
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

  if (scanResult.extensions.length > samplesToShow) {
    console.log(`  ... and ${scanResult.extensions.length - samplesToShow} more`);
  }

  // Show errors if any
  if (scanResult.errors.length > 0) {
    console.log(`\n  Encountered ${scanResult.errors.length} error(s):`);
    for (const error of scanResult.errors.slice(0, 3)) {
      console.log(`  ✗ ${path.basename(error.extensionPath)}: ${error.error}`);
    }
    if (scanResult.errors.length > 3) {
      console.log(`  ... and ${scanResult.errors.length - 3} more`);
    }
  }

  // Example 4: Scan all available IDEs
  console.log('\n--- Example 4: Scan All IDEs ---');
  const allScans = await scanAllIDEs();

  console.log(`Scanned ${allScans.length} IDE(s):`);
  for (const scan of allScans) {
    console.log(`  • ${scan.ide.name}: ${scan.extensions.length} extension(s)`);
  }

  // Example 5: Get summary
  console.log('\n--- Example 5: Extensions Summary ---');
  const summary = await getExtensionsSummary();

  console.log(`Total IDEs: ${summary.totalIDEs}`);
  console.log(`Total Extensions: ${summary.totalExtensions}`);
  console.log('By IDE:');
  for (const item of summary.byIDE) {
    console.log(`  • ${item.ide}: ${item.count}`);
  }

  console.log('\n=== Phase 2 Demo Complete ===');
}

// Import path for error display
import * as path from 'path';

// Run demo
main().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
