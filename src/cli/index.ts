#!/usr/bin/env node

/**
 * extsync CLI
 * Synchronize VS Code extensions across VS Code-based IDEs
 */

import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { diffCommand } from './commands/diff.js';
import { syncCommand } from './commands/sync.js';

const program = new Command();

program
  .name('extsync')
  .description('Synchronize VS Code extensions across VS Code-based IDEs')
  .version('0.1.0');

// Scan command
program
  .command('scan')
  .description('Scan and list installed extensions from an IDE')
  .argument('<ide>', 'IDE to scan (vscode, vscodium, cursor, code-oss)')
  .option('-j, --json', 'Output as JSON')
  .action(scanCommand);

// Diff command
program
  .command('diff')
  .description('Compare extensions between two IDEs')
  .argument('<source>', 'Source IDE (vscode, vscodium, cursor, code-oss)')
  .argument('<target>', 'Target IDE (vscode, vscodium, cursor, code-oss)')
  .option('-m, --marketplace <type>', 'Target marketplace (openvsx, vscode)', 'openvsx')
  .option('-j, --json', 'Output as JSON')
  .option('--fast', 'Skip marketplace availability checks (faster)')
  .action(diffCommand);

// Sync command
program
  .command('sync')
  .description('Sync extensions from source to target IDE')
  .argument('<source>', 'Source IDE (vscode, vscodium, cursor, code-oss)')
  .argument('<target>', 'Target IDE (vscode, vscodium, cursor, code-oss)')
  .option('-m, --marketplace <type>', 'Target marketplace (openvsx, vscode)', 'openvsx')
  .option('--no-dry-run', 'Actually install extensions (default is dry-run)')
  .option('-c, --concurrency <n>', 'Number of concurrent installations', '3')
  .option('--no-skip-unavailable', 'Fail if any extension is unavailable')
  .option('-f, --force', 'Force reinstall even if already installed')
  .action((source, target, options) => {
    syncCommand(source, target, {
      ...options,
      concurrency: parseInt(options.concurrency, 10),
    });
  });

// Parse arguments
program.parse();
