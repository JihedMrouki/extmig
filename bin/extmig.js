#!/usr/bin/env node

/**
 * extmig CLI executable
 * Entry point that runs interactive mode by default, or CLI if arguments provided
 */

const args = process.argv.slice(2);

// Meta-flags that Commander handles and exits immediately — skip the banner
const skipBanner = args.includes('--help') || args.includes('-h')
                || args.includes('--version') || args.includes('-V');

if (args.length === 0 || args[0] === '--interactive' || args[0] === '-i') {
  // Interactive mode — the banner is rendered inside interactive.ts
  await import('../dist/src/cli/interactive.js');
} else {
  // CLI command path — show banner here, then hand off to Commander
  if (!skipBanner) {
    const { showBanner } = await import('../dist/src/cli/banner.js');
    await showBanner();
  }
  await import('../dist/src/cli/index.js');
}
