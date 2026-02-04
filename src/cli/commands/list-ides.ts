/**
 * List IDEs command - Show available IDEs on the system
 */

import * as path from 'path';
import { access } from 'fs/promises';
import { detectAllIDEs, getCurrentPlatform } from '../../core/scanner/paths.js';
import type { Platform } from '../../types/index.js';

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Mirrors the candidate layout in findCliInInstallPaths — debug output only. */
function cliCandidatesInDir(installPath: string, cliCommand: string, platform: Platform): string[] {
  if (platform === 'win32') {
    return [
      path.join(installPath, 'bin', `${cliCommand}.cmd`),
      path.join(installPath, 'bin', `${cliCommand}.exe`),
    ];
  }
  if (installPath.endsWith('.app')) {
    return [
      path.join(installPath, 'Contents', 'Resources', 'app', 'bin', cliCommand),
      path.join(installPath, 'Contents', 'MacOS', cliCommand),
    ];
  }
  return [path.join(installPath, 'bin', cliCommand)];
}

export async function listIDEsCommand(options: { debug?: boolean }) {
  const platform = getCurrentPlatform();

  console.log('Detecting installed IDEs...\n');

  const results = await detectAllIDEs();

  // Three tiers:
  //   available    – detected AND extensions directory exists (fully usable)
  //   detectedOnly – install path or CLI found, but extensions dir missing
  //   notFound     – nothing matched at all
  const available    = results.filter(r =>  r.available);
  const detectedOnly = results.filter(r => !r.available && r.ide.detected);
  const notFound     = results.filter(r => !r.ide.detected);

  if (available.length > 0) {
    console.log('=== Available IDEs ===\n');
    for (const r of available) {
      console.log(`  ✓ ${r.ide.type}`);
      if (r.ide.version)    console.log(`    Version:    ${r.ide.version}`);
      if (r.ide.cliPath)    console.log(`    CLI:        ${r.ide.cliPath}`);
      if (r.extensionsPath) console.log(`    Extensions: ${r.extensionsPath}`);
      console.log('');
    }
  }

  if (detectedOnly.length > 0) {
    console.log('=== Detected (not fully usable) ===\n');
    for (const r of detectedOnly) {
      console.log(`  ⚠ ${r.ide.type}`);
      console.log(`    CLI:        ${r.ide.cliPath || 'not found'}`);
      console.log(`    Extensions: ${r.extensionsPath || 'not found'}`);
      console.log('');
    }
  }

  if (notFound.length > 0) {
    console.log('=== Not Found ===\n');
    for (const r of notFound) {
      console.log(`  ✗ ${r.ide.type}`);
    }
    console.log('');
  }

  if (available.length > 0) {
    console.log(`Found ${available.length} IDE(s) available for syncing.`);
  } else {
    console.log('No IDEs fully available on this system.');
    if (!options.debug) {
      console.log('  Run:  extmig list --debug   to see every path that was checked.');
    }
  }

  // --debug: full path audit — every path probed, existence shown
  if (options.debug) {
    console.log('\n=== Debug: path audit ===');
    console.log(`Platform: ${platform}\n`);

    for (const r of results) {
      console.log(`── ${r.ide.type} (${r.ide.name}) ──`);

      const installPaths = r.ide.installPaths[platform];
      for (const p of installPaths) {
        const exists = await pathExists(p);
        console.log(`  install  ${exists ? '✓' : '✗'}  ${p}`);

        // When the directory exists, show which CLI binaries we looked for inside it
        if (exists) {
          for (const candidate of cliCandidatesInDir(p, r.ide.cliCommand, platform)) {
            console.log(`    cli    ${await pathExists(candidate) ? '✓' : '✗'}  ${candidate}`);
          }
        }
      }

      const extPaths = r.ide.extensionsPaths[platform];
      for (const p of extPaths) {
        console.log(`  exts     ${await pathExists(p) ? '✓' : '✗'}  ${p}`);
      }

      console.log(`  → resolved CLI:        ${r.ide.cliPath || '(none)'}`);
      console.log(`  → resolved extensions: ${r.extensionsPath || '(none)'}`);
      console.log('');
    }
  }
}
