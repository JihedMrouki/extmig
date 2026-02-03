/**
 * Export command - Export extension list to a file
 */

import { writeFile } from 'fs/promises';
import { scanIDE } from '../../core/scanner/index.js';
import type { IDEType } from '../../types/index.js';

export interface ExportOptions {
  output?: string;
  pretty?: boolean;
}

export async function exportCommand(ideType: string, options: ExportOptions) {
  try {
    // Validate IDE type
    const validIDEs = ['vscode', 'vscodium', 'cursor', 'code-oss', 'antigravity', 'intellij', 'androidstudio'];
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

    // Prepare export data
    const exportData = {
      exportedFrom: ideType,
      exportedAt: new Date().toISOString(),
      totalExtensions: result.extensions.length,
      extensions: result.extensions.map(ext => ({
        id: ext.id,
        version: ext.version,
        displayName: ext.displayName,
        publisher: ext.publisher,
        description: ext.description,
      })),
    };

    // Determine output file
    const outputFile = options.output || `${ideType}-extensions.json`;

    // Write to file
    const jsonContent = options.pretty !== false
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    await writeFile(outputFile, jsonContent, 'utf-8');

    console.log(`\n✓ Exported ${result.extensions.length} extension(s) to: ${outputFile}`);
  } catch (error) {
    console.error('Error exporting extensions:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}
