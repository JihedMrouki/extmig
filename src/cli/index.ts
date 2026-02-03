#!/usr/bin/env node

/**
 * extmig CLI
 * Synchronize VS Code extensions across VS Code-based IDEs
 */

import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { diffCommand } from './commands/diff.js';
import { syncCommand } from './commands/sync.js';
import { exportCommand } from './commands/export.js';
import { importCommand } from './commands/import.js';
import { listIDEsCommand } from './commands/list-ides.js';

const program = new Command();

program
  .name('extmig')
  .description('Synchronize VS Code extensions across VS Code-based IDEs')
  .version('0.1.0');

// List IDEs command
program
  .command('list')
  .description('List available VS Code-based IDEs on the system')
  .action(listIDEsCommand);

// Scan command
program
  .command('scan <ide>')
  .description('Scan and list installed extensions from an IDE')
  .option('-j, --json', 'Output as JSON')
  .action(scanCommand);

// Diff command
program
  .command('diff <source> <target>')
  .description('Compare extensions between two IDEs')
  .option('-m, --marketplace <type>', 'Target marketplace (openvsx, vscode). Defaults to the target IDE\'s native marketplace.')
  .option('-j, --json', 'Output as JSON')
  .action(diffCommand);

// Sync command
program
  .command('sync <source> <target>')
  .description('Sync extensions from source to target IDE')
  .option('-m, --marketplace <type>', 'Target marketplace (openvsx, vscode). Defaults to the target IDE\'s native marketplace.')
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

// Export command
program
  .command('export <ide>')
  .description('Export extension list to a JSON file')
  .option('-o, --output <file>', 'Output file path')
  .option('--no-pretty', 'Minify JSON output')
  .action(exportCommand);

// Import command
program
  .command('import <file> <target>')
  .description('Import and install extensions from a JSON file')
  .option('--no-dry-run', 'Actually install extensions (default is dry-run)')
  .option('-c, --concurrency <n>', 'Number of concurrent installations', '3')
  .option('-f, --force', 'Force reinstall even if already installed')
  .action((file, target, options) => {
    importCommand(file, target, {
      ...options,
      concurrency: parseInt(options.concurrency, 10),
    });
  });

// Parse arguments
program.parse();
