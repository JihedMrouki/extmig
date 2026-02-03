/**
 * Scan command - Lists installed extensions from an IDE
 */

import { scanIDE } from '../../core/scanner/index.js';
import type { IDEType } from '../../types/index.js';

export interface ScanOptions {
  json?: boolean;
}

export async function scanCommand(ideType: string, options: ScanOptions) {
  try {
    // Validate IDE type
    const validIDEs = ['vscode', 'vscodium', 'cursor', 'code-oss'];
    if (!validIDEs.includes(ideType)) {
      console.error(`Error: Invalid IDE type "${ideType}"`);
      console.error(`Valid options: ${validIDEs.join(', ')}`);
      process.exit(1);
    }

    console.log(`Scanning ${ideType}...`);
    const result = await scanIDE(ideType as IDEType);

    if (!result || result.extensions.length === 0) {
      console.log(`No extensions found in ${ideType}`);
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nFound ${result.extensions.length} extension(s) in ${ideType}:\n`);
      result.extensions.forEach((ext, index) => {
        console.log(`${index + 1}. ${ext.displayName || ext.extensionId}`);
        console.log(`   ID: ${ext.extensionId}`);
        console.log(`   Version: ${ext.version}`);
        if (ext.publisher) {
          console.log(`   Publisher: ${ext.publisher}`);
        }
        console.log('');
      });
      console.log(`Total: ${result.extensions.length} extensions`);
    }
  } catch (error) {
    console.error('Error scanning IDE:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
