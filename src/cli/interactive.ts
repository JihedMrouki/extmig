#!/usr/bin/env node

/**
 * extmig Interactive Mode
 * Automated extension migration with guided workflows
 */

import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import { scanIDE } from '../core/scanner/index.js';
import { diffIDEs } from '../core/diff/index.js';
import { syncFromDiff } from '../core/installer/index.js';
import { checkCLIAvailable, isIDERunning, getCloseIDEMessage } from '../core/installer/index.js';
import type { IDEType, MarketplaceType } from '../types/index.js';

// Welcome screen
function showWelcome() {
  console.clear();
  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║                                                       ║'));
  console.log(chalk.bold.cyan('║') + chalk.bold.white('              🚀  extmig  🚀                      ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('║                                                       ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════╝'));
  console.log();
  console.log(chalk.white('  Synchronize VS Code extensions across different IDEs'));
  console.log(chalk.gray('  Supports: VS Code, VSCodium, Cursor, Code-OSS, AntiGravity'));
  console.log();
  console.log(chalk.gray('  ────────────────────────────────────────────────────────'));
  console.log();
}

// Detect available IDEs
async function detectIDEs(): Promise<IDEType[]> {
  const spinner = ora('Detecting installed IDEs...').start();
  const ideTypes: IDEType[] = ['vscode', 'vscodium', 'cursor', 'code-oss', 'antigravity'];
  const available: IDEType[] = [];

  for (const ide of ideTypes) {
    const isAvailable = await checkCLIAvailable(ide);
    if (isAvailable) {
      available.push(ide);
    }
  }

  spinner.succeed(`Found ${available.length} IDE(s): ${available.join(', ')}`);
  return available;
}

// Auto Mode - Fully automated migration
async function autoMode() {
  console.log(chalk.bold.green('\n🤖 Auto Mode - Automatic Migration\n'));

  // Step 1: Detect IDEs
  const availableIDEs = await detectIDEs();

  if (availableIDEs.length === 0) {
    console.log(chalk.red('\n✗ No VS Code-based IDEs found on your system.'));
    console.log(chalk.gray('  Please install VS Code, VSCodium, or Cursor first.'));
    process.exit(1);
  }

  if (availableIDEs.length === 1) {
    console.log(chalk.yellow(`\n⚠ Only one IDE found: ${availableIDEs[0]}`));
    console.log(chalk.gray('  You need at least two IDEs to migrate extensions.'));
    process.exit(0);
  }

  // Step 2: Auto-select source (prefer vscode)
  const sourceIDE = availableIDEs.includes('vscode') ? 'vscode' : availableIDEs[0];
  console.log(chalk.blue(`\n📂 Source IDE: ${chalk.bold(sourceIDE)}`));

  // Step 3: Ask for target IDE
  const targetOptions = availableIDEs.filter(ide => ide !== sourceIDE);

  if (targetOptions.length === 0) {
    console.log(chalk.red('\n✗ No target IDE available.'));
    process.exit(1);
  }

  const { targetIDE } = await prompts({
    type: 'select',
    name: 'targetIDE',
    message: 'Select target IDE to migrate to:',
    choices: targetOptions.map(ide => ({ title: ide, value: ide })),
  });

  if (!targetIDE) {
    console.log(chalk.yellow('\n✗ Migration cancelled.'));
    process.exit(0);
  }

  console.log(chalk.blue(`📥 Target IDE: ${chalk.bold(targetIDE)}\n`));

  // Step 4: Select marketplace
  const { marketplace } = await prompts({
    type: 'select',
    name: 'marketplace',
    message: 'Select target marketplace:',
    choices: [
      { title: 'Open VSX (Recommended for open-source IDEs)', value: 'openvsx' },
      { title: 'VS Code Marketplace', value: 'vscode' },
    ],
    initial: 0,
  });

  if (!marketplace) {
    console.log(chalk.yellow('\n✗ Migration cancelled.'));
    process.exit(0);
  }

  console.log();

  // Step 5: Scan source IDE
  let spinner = ora(`Scanning ${sourceIDE} extensions...`).start();
  const sourceScan = await scanIDE(sourceIDE);

  if (!sourceScan || sourceScan.extensions.length === 0) {
    spinner.fail(`No extensions found in ${sourceIDE}`);
    process.exit(0);
  }

  spinner.succeed(`Found ${sourceScan.extensions.length} extension(s) in ${sourceIDE}`);

  // Step 6: Generate diff
  spinner = ora('Analyzing marketplace availability...').start();
  const diffReport = await diffIDEs(sourceIDE, targetIDE, {
    targetMarketplace: marketplace as MarketplaceType,
    fallbackMarketplaces: marketplace === 'openvsx' ? ['vscode'] : ['openvsx'],
  });

  spinner.succeed('Analysis complete');

  // Show summary
  console.log();
  console.log(chalk.bold('📊 Migration Summary:'));
  console.log(chalk.gray('  ──────────────────────────────────'));
  console.log(`  Extensions in ${sourceIDE}: ${chalk.cyan(diffReport.diff.summary.totalInSource)}`);
  console.log(`  Extensions to migrate: ${chalk.cyan(diffReport.diff.summary.onlyInSourceCount)}`);
  console.log(`  Available on ${marketplace}: ${chalk.green(diffReport.diff.summary.availableForSync)}`);
  console.log(`  Not available: ${chalk.red(diffReport.diff.summary.notAvailableForSync)}`);
  console.log();

  if (diffReport.diff.summary.availableForSync === 0) {
    console.log(chalk.yellow('✗ No extensions available to migrate.'));
    process.exit(0);
  }

  // Step 7: Confirm and sync
  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: `Migrate ${diffReport.diff.summary.availableForSync} extension(s) to ${targetIDE}?`,
    initial: true,
  });

  if (!confirm) {
    console.log(chalk.yellow('\n✗ Migration cancelled.'));
    process.exit(0);
  }

  // Step 8: Perform migration
  console.log();

  // Check if IDE is running
  const ideRunning = await isIDERunning(targetIDE);
  if (ideRunning) {
    console.log(chalk.yellow(`\n${getCloseIDEMessage(targetIDE)}`));
    console.log(chalk.gray('Some extensions may fail to install while the IDE is running.'));

    const { continueAnyway } = await prompts({
      type: 'confirm',
      name: 'continueAnyway',
      message: 'Continue anyway?',
      initial: true,
    });

    if (!continueAnyway) {
      console.log(chalk.yellow('\n✗ Migration cancelled. Please close the IDE and try again.'));
      process.exit(0);
    }
    console.log();
  }

  spinner = ora('Installing extensions...').start();

  try {
    const syncReport = await syncFromDiff(diffReport, {
      dryRun: false,
      skipUnavailable: true,
      concurrency: 3,
      continueOnError: true,
    });

    spinner.succeed('Migration complete!');

    // Show results
    console.log();
    console.log(chalk.bold.green('✓ Migration Complete!'));
    console.log(chalk.gray('  ──────────────────────────────────'));
    console.log(`  Total: ${syncReport.summary.results.length}`);
    console.log(`  Installed: ${chalk.green(syncReport.summary.installed)}`);
    console.log(`  Failed: ${chalk.red(syncReport.summary.failed)}`);
    console.log(`  Skipped: ${chalk.yellow(syncReport.summary.skipped)}`);

    if (syncReport.summary.failed > 0) {
      console.log();
      console.log(chalk.yellow('⚠ Some extensions failed to install. See details above.'));
    }

    // Post-installation instructions
    console.log();
    console.log(chalk.cyan('📌 Next Steps:'));
    console.log(chalk.gray(`  1. Restart ${targetIDE} to activate newly installed extensions`));
    console.log(chalk.gray(`  2. Check that all extensions are enabled in ${targetIDE}`));
    if (syncReport.summary.failed > 0) {
      console.log(chalk.gray(`  3. Retry failed extensions after closing ${targetIDE}`));
    }
  } catch (error) {
    spinner.fail('Migration failed');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Manual Mode - Step-by-step guided workflow
async function manualMode() {
  console.log(chalk.bold.blue('\n👤 Manual Mode - Step-by-Step Guide\n'));

  // Step 1: Detect IDEs
  const availableIDEs = await detectIDEs();

  if (availableIDEs.length === 0) {
    console.log(chalk.red('\n✗ No VS Code-based IDEs found on your system.'));
    process.exit(1);
  }

  console.log();

  // Step 2: Select source IDE
  const { sourceIDE } = await prompts({
    type: 'select',
    name: 'sourceIDE',
    message: 'Step 1: Select source IDE (where extensions are currently installed):',
    choices: availableIDEs.map(ide => ({ title: ide, value: ide })),
  });

  if (!sourceIDE) {
    console.log(chalk.yellow('\n✗ Cancelled.'));
    process.exit(0);
  }

  // Step 3: Select target IDE
  const targetOptions = availableIDEs.filter(ide => ide !== sourceIDE);

  if (targetOptions.length === 0) {
    console.log(chalk.red('\n✗ No other IDE available as target.'));
    process.exit(1);
  }

  const { targetIDE } = await prompts({
    type: 'select',
    name: 'targetIDE',
    message: 'Step 2: Select target IDE (where extensions will be installed):',
    choices: targetOptions.map(ide => ({ title: ide, value: ide })),
  });

  if (!targetIDE) {
    console.log(chalk.yellow('\n✗ Cancelled.'));
    process.exit(0);
  }

  // Step 4: Select marketplace
  const { marketplace } = await prompts({
    type: 'select',
    name: 'marketplace',
    message: 'Step 3: Select marketplace for target IDE:',
    choices: [
      { title: 'Open VSX (Recommended for VSCodium, Cursor)', value: 'openvsx' },
      { title: 'VS Code Marketplace', value: 'vscode' },
    ],
    initial: 0,
  });

  if (!marketplace) {
    console.log(chalk.yellow('\n✗ Cancelled.'));
    process.exit(0);
  }

  console.log();

  // Step 5: Scan
  let spinner = ora(`Step 4: Scanning ${sourceIDE}...`).start();
  const sourceScan = await scanIDE(sourceIDE);

  if (!sourceScan || sourceScan.extensions.length === 0) {
    spinner.fail(`No extensions found in ${sourceIDE}`);
    process.exit(0);
  }

  spinner.succeed(`Found ${sourceScan.extensions.length} extension(s)`);

  // Step 6: Generate diff
  spinner = ora('Step 5: Analyzing differences...').start();
  const diffReport = await diffIDEs(sourceIDE, targetIDE, {
    targetMarketplace: marketplace as MarketplaceType,
    fallbackMarketplaces: marketplace === 'openvsx' ? ['vscode'] : ['openvsx'],
  });

  spinner.succeed('Analysis complete');

  // Show detailed diff
  console.log();
  console.log(chalk.bold('📊 Diff Summary:'));
  console.log(chalk.gray('  ──────────────────────────────────'));
  console.log(`  Only in ${sourceIDE}: ${chalk.cyan(diffReport.diff.summary.onlyInSourceCount)}`);
  console.log(`  Only in ${targetIDE}: ${chalk.cyan(diffReport.diff.summary.onlyInTargetCount)}`);
  console.log(`  In both: ${chalk.cyan(diffReport.diff.summary.inBothCount)}`);
  console.log();
  console.log(`  Available to sync: ${chalk.green(diffReport.diff.summary.availableForSync)}`);
  console.log(`  Not available: ${chalk.red(diffReport.diff.summary.notAvailableForSync)}`);

  if (diffReport.diff.summary.availableForSync === 0) {
    console.log(chalk.yellow('\n✗ No extensions available to sync.'));
    process.exit(0);
  }

  console.log();

  // Step 7: Sync options
  const { syncMode } = await prompts({
    type: 'select',
    name: 'syncMode',
    message: 'Step 6: Choose sync mode:',
    choices: [
      { title: 'Dry-run (Preview only, no installation)', value: 'dry' },
      { title: 'Install extensions', value: 'install' },
    ],
    initial: 0,
  });

  if (!syncMode) {
    console.log(chalk.yellow('\n✗ Cancelled.'));
    process.exit(0);
  }

  const isDryRun = syncMode === 'dry';

  // Step 8: Concurrency
  const { concurrency } = await prompts({
    type: 'number',
    name: 'concurrency',
    message: 'Step 7: Concurrent installations (1-5):',
    initial: 3,
    min: 1,
    max: 5,
  });

  console.log();

  // Check if IDE is running (only for actual install)
  if (!isDryRun) {
    const ideRunning = await isIDERunning(targetIDE);
    if (ideRunning) {
      console.log(chalk.yellow(`\n${getCloseIDEMessage(targetIDE)}`));
      console.log(chalk.gray('Some extensions may fail to install while the IDE is running.'));

      const { continueAnyway } = await prompts({
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Continue anyway?',
        initial: true,
      });

      if (!continueAnyway) {
        console.log(chalk.yellow('\n✗ Sync cancelled. Please close the IDE and try again.'));
        process.exit(0);
      }
      console.log();
    }
  }

  // Step 9: Execute
  if (isDryRun) {
    spinner = ora('Running dry-run...').start();
  } else {
    spinner = ora('Installing extensions...').start();
  }

  try {
    const syncReport = await syncFromDiff(diffReport, {
      dryRun: isDryRun,
      skipUnavailable: true,
      concurrency: concurrency || 3,
      continueOnError: true,
    });

    spinner.succeed(isDryRun ? 'Dry-run complete' : 'Sync complete!');

    // Show results
    console.log();
    console.log(chalk.bold.green(isDryRun ? '✓ Dry-Run Results:' : '✓ Sync Complete!'));
    console.log(chalk.gray('  ──────────────────────────────────'));
    console.log(`  Total: ${syncReport.summary.results.length}`);

    if (isDryRun) {
      console.log(`  Would install: ${chalk.cyan(syncReport.summary.results.filter((r: any) => r.status === 'pending').length)}`);
    } else {
      console.log(`  Installed: ${chalk.green(syncReport.summary.installed)}`);
      console.log(`  Failed: ${chalk.red(syncReport.summary.failed)}`);
      console.log(`  Skipped: ${chalk.yellow(syncReport.summary.skipped)}`);

      // Post-installation instructions
      if (syncReport.summary.installed > 0) {
        console.log();
        console.log(chalk.cyan('📌 Next Steps:'));
        console.log(chalk.gray(`  1. Restart ${targetIDE} to activate newly installed extensions`));
        if (syncReport.summary.failed > 0) {
          console.log(chalk.gray(`  2. Close ${targetIDE} and retry failed extensions`));
        }
      }
    }
  } catch (error) {
    spinner.fail('Sync failed');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Main interactive flow
async function main() {
  showWelcome();

  const { mode } = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Choose a mode:',
    choices: [
      {
        title: '🤖 Auto Mode - Automatic migration (quick and easy)',
        value: 'auto',
        description: 'Automatically migrate from VS Code to another IDE with minimal input',
      },
      {
        title: '👤 Manual Mode - Step-by-step guide (full control)',
        value: 'manual',
        description: 'Walk through each step with detailed options',
      },
    ],
    initial: 0,
  });

  if (!mode) {
    console.log(chalk.yellow('\n✗ Cancelled.'));
    process.exit(0);
  }

  console.log();

  if (mode === 'auto') {
    await autoMode();
  } else {
    await manualMode();
  }

  console.log();
  console.log(chalk.gray('──────────────────────────────────────────────────────────'));
  console.log(chalk.green('Thank you for using extmig! 🎉'));
  console.log();
}

// Handle interrupts gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n✗ Cancelled by user.'));
  process.exit(0);
});

// Run
main().catch(error => {
  console.error(chalk.red('\nFatal error:'), error);
  process.exit(1);
});
