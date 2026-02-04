/**
 * IDE CLI Executor
 *
 * Executes IDE CLI commands for extension installation.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { IDE, IDEType } from '../../types/index.js';
import { detectIDE } from '../scanner/paths.js';

const execFileAsync = promisify(execFile);

/**
 * CLI execution error
 */
export class CLIExecutionError extends Error {
  constructor(
    message: string,
    public readonly exitCode?: number,
    public readonly stderr?: string,
    public readonly stdout?: string
  ) {
    super(message);
    this.name = 'CLIExecutionError';
  }
}

/**
 * CLI execution result
 */
export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 * Execute IDE CLI command
 */
export async function executeCommand(
  cliPath: string,
  args: string[],
  options: {
    timeout?: number;
    cwd?: string;
  } = {}
): Promise<CLIResult> {
  const timeout = options.timeout || 120000; // 2 minutes default

  try {
    const { stdout, stderr } = await execFileAsync(cliPath, args, {
      timeout,
      cwd: options.cwd,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      shell: process.platform === 'win32', // .cmd wrappers need a shell on Windows
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      success: true,
    };
  } catch (error: any) {
    // execFile throws on non-zero exit code
    const exitCode = error.code || error.exitCode || 1;
    const stdout = error.stdout?.toString().trim() || '';
    const stderr = error.stderr?.toString().trim() || '';

    return {
      stdout,
      stderr,
      exitCode,
      success: false,
    };
  }
}

/**
 * Find CLI path for IDE
 */
export async function getCLIPath(ideType: IDEType): Promise<string> {
  const detection = await detectIDE(ideType);

  if (!detection.ide.cliPath) {
    throw new CLIExecutionError(
      `CLI not found for ${ideType}. Please ensure the IDE is installed and CLI is in PATH.`
    );
  }

  return detection.ide.cliPath;
}

/**
 * Install extension via CLI
 */
export async function installExtension(
  ideType: IDEType,
  extensionId: string,
  options: {
    timeout?: number;
    force?: boolean;
  } = {}
): Promise<CLIResult> {
  const cliPath = await getCLIPath(ideType);

  const args = ['--install-extension', extensionId];

  if (options.force) {
    args.push('--force');
  }

  const result = await executeCommand(cliPath, args, {
    timeout: options.timeout || 120000,
  });

  if (!result.success) {
    throw new CLIExecutionError(
      `Failed to install ${extensionId}: ${result.stderr || result.stdout}`,
      result.exitCode,
      result.stderr,
      result.stdout
    );
  }

  return result;
}

/**
 * Uninstall extension via CLI
 */
export async function uninstallExtension(
  ideType: IDEType,
  extensionId: string,
  options: {
    timeout?: number;
  } = {}
): Promise<CLIResult> {
  const cliPath = await getCLIPath(ideType);

  const args = ['--uninstall-extension', extensionId];

  const result = await executeCommand(cliPath, args, {
    timeout: options.timeout || 120000,
  });

  if (!result.success) {
    throw new CLIExecutionError(
      `Failed to uninstall ${extensionId}: ${result.stderr || result.stdout}`,
      result.exitCode,
      result.stderr,
      result.stdout
    );
  }

  return result;
}

/**
 * List installed extensions via CLI
 */
export async function listExtensions(
  ideType: IDEType,
  options: {
    timeout?: number;
    showVersions?: boolean;
  } = {}
): Promise<string[]> {
  const cliPath = await getCLIPath(ideType);

  const args = ['--list-extensions'];

  if (options.showVersions) {
    args.push('--show-versions');
  }

  const result = await executeCommand(cliPath, args, {
    timeout: options.timeout || 30000,
  });

  if (!result.success) {
    throw new CLIExecutionError(
      `Failed to list extensions: ${result.stderr || result.stdout}`,
      result.exitCode,
      result.stderr,
      result.stdout
    );
  }

  return result.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Check if CLI is available
 */
export async function checkCLIAvailable(ideType: IDEType): Promise<boolean> {
  try {
    const cliPath = await getCLIPath(ideType);
    const result = await executeCommand(cliPath, ['--version'], {
      timeout: 5000,
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get IDE version via CLI
 */
export async function getIDEVersion(ideType: IDEType): Promise<string | null> {
  try {
    const cliPath = await getCLIPath(ideType);
    const result = await executeCommand(cliPath, ['--version'], {
      timeout: 5000,
    });

    if (result.success) {
      // Return first line of output
      return result.stdout.split('\n')[0].trim();
    }

    return null;
  } catch {
    return null;
  }
}
