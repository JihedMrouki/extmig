#!/usr/bin/env node

/**
 * extmig CLI executable
 * Entry point that runs interactive mode by default, or CLI if arguments provided
 */

// If no arguments provided (or only --help/-h), run interactive mode
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--interactive' || args[0] === '-i') {
  // Run interactive mode
  import('../dist/src/cli/interactive.js');
} else {
  // Run CLI with commands
  import('../dist/src/cli/index.js');
}
