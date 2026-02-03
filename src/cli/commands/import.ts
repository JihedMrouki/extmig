/**
 * Import command - Import and install extensions from a file
 */

import { readFile } from 'fs/promises';
import { installExtension } from '../../core/installer/index.js';
import type { IDEType } from '../../types/index.js';

export interface ImportOptions {
  dryRun?: boolean;
  concurrency?: number;
  force?: boolean;
}

interface ImportData {
  extensions: Array<{
    id: string;
    version: string;
    displayName?: string;
  }>;
}

export async function importCommand(
  file: string,
  targetIDE: string,
  options: ImportOptions
) {
  try {
    // Validate IDE type
    const validIDEs = ['vscode', 'vscodium', 'cursor', 'code-oss', 'antigravity'];
    if (!validIDEs.includes(targetIDE)) {
      console.error(`Error: Invalid IDE type "${targetIDE}"`);
      console.error(`Valid options: ${validIDEs.join(', ')}`);
      process.exit(1);
    }

    const isDryRun = options.dryRun !== false; // Default to true for safety
    const concurrency = options.concurrency || 3;

    console.log(`${isDryRun ? '[DRY RUN] ' : ''}Importing extensions to ${targetIDE}...`);
    console.log(`Source file: ${file}\n`);

    // Read import file
    const fileContent = await readFile(file, 'utf-8');
    const importData: ImportData = JSON.parse(fileContent);

    if (!importData.extensions || importData.extensions.length === 0) {
      console.log('No extensions found in import file');
      return;
    }

    console.log(`Found ${importData.extensions.length} extension(s) to import\n`);

    // Install extensions
    const results: Array<{ id: string; status: string; error?: string }> = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    console.log(`${isDryRun ? 'Simulating' : 'Installing'} extensions...\n`);

    for (const ext of importData.extensions) {
      const displayName = ext.displayName || ext.id;

      if (isDryRun) {
        console.log(`  Would install: ${displayName} (${ext.id})`);
        results.push({ id: ext.id, status: 'pending' });
        skippedCount++;
      } else {
        try {
          console.log(`  Installing: ${displayName}...`);
          await installExtension(targetIDE as IDEType, ext.id, {
            force: options.force || false,
            timeout: 120000,
          });
          console.log(`  ✓ Installed: ${displayName}`);
          results.push({ id: ext.id, status: 'success' });
          successCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.log(`  ✗ Failed: ${displayName} - ${errorMsg}`);
          results.push({ id: ext.id, status: 'failed', error: errorMsg });
          failCount++;
        }
      }
    }

    // Summary
    console.log('\n=== Import Summary ===\n');
    if (isDryRun) {
      console.log(`Would install: ${skippedCount} extension(s)`);
      console.log('\n💡 This was a dry run. To actually install, use:');
      console.log(`   extsync import ${file} ${targetIDE} --no-dry-run\n`);
    } else {
      console.log(`Total: ${importData.extensions.length}`);
      console.log(`Success: ${successCount}`);
      console.log(`Failed: ${failCount}`);
    }
  } catch (error) {
    console.error('Error importing extensions:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
