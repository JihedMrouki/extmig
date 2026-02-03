/**
 * List IDEs command - Show available IDEs on the system
 */

import { checkCLIAvailable, getCLIPath, getIDEVersion } from '../../core/installer/index.js';
import type { IDEType } from '../../types/index.js';

export async function listIDEsCommand() {
  console.log('Detecting installed IDEs...\n');

  const ideTypes: IDEType[] = ['vscode', 'vscodium', 'cursor', 'code-oss', 'antigravity', 'intellij', 'androidstudio'];
  const results: Array<{
    ide: string;
    available: boolean;
    cliPath?: string;
    version?: string;
  }> = [];

  for (const ideType of ideTypes) {
    try {
      const available = await checkCLIAvailable(ideType);

      if (available) {
        const cliPath = await getCLIPath(ideType);
        const version = await getIDEVersion(ideType);
        results.push({
          ide: ideType,
          available: true,
          cliPath: cliPath || undefined,
          version: version || undefined,
        });
      } else {
        results.push({
          ide: ideType,
          available: false,
        });
      }
    } catch (error) {
      results.push({
        ide: ideType,
        available: false,
      });
    }
  }

  // Display results
  const availableIDEs = results.filter(r => r.available);
  const unavailableIDEs = results.filter(r => !r.available);

  if (availableIDEs.length > 0) {
    console.log('=== Available IDEs ===\n');
    availableIDEs.forEach(ide => {
      console.log(`✓ ${ide.ide}`);
      if (ide.version) {
        console.log(`  Version: ${ide.version}`);
      }
      if (ide.cliPath) {
        console.log(`  CLI: ${ide.cliPath}`);
      }
      console.log('');
    });
  }

  if (unavailableIDEs.length > 0) {
    console.log('=== Not Found ===\n');
    unavailableIDEs.forEach(ide => {
      console.log(`✗ ${ide.ide}`);
    });
    console.log('');
  }

  if (availableIDEs.length === 0) {
    console.log('No VS Code-based IDEs found on this system.');
    console.log('\nSupported IDEs:');
    console.log('  - Visual Studio Code (vscode)');
    console.log('  - VSCodium (vscodium)');
    console.log('  - Cursor (cursor)');
    console.log('  - Code-OSS (code-oss)');
    console.log('  - AntiGravity (antigravity)');
  } else {
    console.log(`Found ${availableIDEs.length} IDE(s) available for syncing.`);
  }
}
