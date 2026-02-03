/**
 * IDE Process Checker
 *
 * Checks if an IDE is currently running, which can interfere with extension installation.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { IDEType } from '../../types/index.js';

const execFileAsync = promisify(execFile);

/**
 * IDE process names to check
 */
const IDE_PROCESS_NAMES: Record<IDEType, string[]> = {
  vscode: ['Code', 'code', 'Visual Studio Code'],
  vscodium: ['VSCodium', 'codium'],
  cursor: ['Cursor', 'cursor'],
  'code-oss': ['code-oss', 'Code - OSS'],
  antigravity: ['Antigravity', 'antigravity'],
  intellij: ['idea', 'IntelliJ IDEA'],
  androidstudio: ['studio', 'Android Studio'],
};

/**
 * Check if a process is running on macOS/Linux
 */
async function isProcessRunningUnix(processNames: string[]): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('ps', ['aux']);
    const processes = stdout.toLowerCase();

    return processNames.some(name =>
      processes.includes(name.toLowerCase())
    );
  } catch {
    // If ps fails, assume not running
    return false;
  }
}

/**
 * Check if a process is running on Windows
 */
async function isProcessRunningWindows(processNames: string[]): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('tasklist', []);
    const processes = stdout.toLowerCase();

    return processNames.some(name =>
      processes.includes(name.toLowerCase() + '.exe')
    );
  } catch {
    // If tasklist fails, assume not running
    return false;
  }
}

/**
 * Check if an IDE is currently running
 */
export async function isIDERunning(ideType: IDEType): Promise<boolean> {
  const processNames = IDE_PROCESS_NAMES[ideType];
  const platform = process.platform;

  if (platform === 'win32') {
    return isProcessRunningWindows(processNames);
  } else {
    return isProcessRunningUnix(processNames);
  }
}

/**
 * Get a user-friendly message about closing the IDE
 */
export function getCloseIDEMessage(ideType: IDEType): string {
  const ideName = ideType === 'vscode' ? 'VS Code'
    : ideType === 'vscodium' ? 'VSCodium'
    : ideType === 'cursor' ? 'Cursor'
    : ideType === 'code-oss' ? 'Code-OSS'
    : ideType === 'antigravity' ? 'AntiGravity'
    : ideType === 'intellij' ? 'IntelliJ IDEA'
    : ideType === 'androidstudio' ? 'Android Studio'
    : ideType;

  return `⚠️  ${ideName} is currently running. For best results, please close ${ideName} before installing extensions.`;
}
