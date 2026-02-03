/**
 * Path Detection Utilities
 *
 * Detects IDE installations and extension directories across platforms.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IDEType, Platform, IDE, IDEDetectionResult } from '../../types/index.js';

/**
 * Get the current platform
 */
export function getCurrentPlatform(): Platform {
  const platform = os.platform();
  if (platform === 'darwin') return 'darwin';
  if (platform === 'linux') return 'linux';
  if (platform === 'win32') return 'win32';
  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * IDE Configuration Database
 * Defines install paths and extension directories for each IDE type
 */
const IDE_CONFIGS: Record<IDEType, Omit<IDE, 'detected' | 'version' | 'cliPath'>> = {
  vscode: {
    type: 'vscode',
    name: 'Visual Studio Code',
    defaultMarketplace: 'vscode',
    cliCommand: 'code',
    installPaths: {
      darwin: ['/Applications/Visual Studio Code.app'],
      linux: ['/usr/share/code', '/usr/bin/code'],
      win32: ['C:\\Program Files\\Microsoft VS Code'],
    },
    extensionsPaths: {
      darwin: [path.join(os.homedir(), '.vscode/extensions')],
      linux: [path.join(os.homedir(), '.vscode/extensions')],
      win32: [path.join(os.homedir(), '.vscode\\extensions')],
    },
  },
  vscodium: {
    type: 'vscodium',
    name: 'VSCodium',
    defaultMarketplace: 'openvsx',
    cliCommand: 'codium',
    installPaths: {
      darwin: ['/Applications/VSCodium.app'],
      linux: ['/usr/share/codium', '/usr/bin/codium'],
      win32: ['C:\\Program Files\\VSCodium'],
    },
    extensionsPaths: {
      darwin: [path.join(os.homedir(), '.vscode-oss/extensions')],
      linux: [path.join(os.homedir(), '.vscode-oss/extensions')],
      win32: [path.join(os.homedir(), '.vscode-oss\\extensions')],
    },
  },
  cursor: {
    type: 'cursor',
    name: 'Cursor',
    defaultMarketplace: 'vscode',
    cliCommand: 'cursor',
    installPaths: {
      darwin: ['/Applications/Cursor.app'],
      linux: ['/usr/share/cursor', '/usr/bin/cursor'],
      win32: ['C:\\Program Files\\Cursor'],
    },
    extensionsPaths: {
      darwin: [path.join(os.homedir(), '.cursor/extensions')],
      linux: [path.join(os.homedir(), '.cursor/extensions')],
      win32: [path.join(os.homedir(), '.cursor\\extensions')],
    },
  },
  'code-oss': {
    type: 'code-oss',
    name: 'Code - OSS',
    defaultMarketplace: 'openvsx',
    cliCommand: 'code-oss',
    installPaths: {
      darwin: ['/Applications/Code - OSS.app'],
      linux: ['/usr/share/code-oss', '/usr/bin/code-oss'],
      win32: ['C:\\Program Files\\Code - OSS'],
    },
    extensionsPaths: {
      darwin: [path.join(os.homedir(), '.vscode-oss/extensions')],
      linux: [path.join(os.homedir(), '.vscode-oss/extensions')],
      win32: [path.join(os.homedir(), '.vscode-oss\\extensions')],
    },
  },
};

/**
 * Check if a path exists
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find CLI command in PATH
 */
async function findCliCommand(command: string): Promise<string | undefined> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const isWindows = getCurrentPlatform() === 'win32';
    const whichCommand = isWindows ? 'where' : 'which';

    const { stdout } = await execFileAsync(whichCommand, [command]);
    const cliPath = stdout.trim().split('\n')[0];
    return cliPath || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get IDE version from CLI
 */
async function getIdeVersion(cliPath: string): Promise<string | undefined> {
  try {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const { stdout } = await execFileAsync(cliPath, ['--version']);
    const firstLine = stdout.trim().split('\n')[0];
    return firstLine || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Detect a specific IDE installation
 */
export async function detectIDE(ideType: IDEType): Promise<IDEDetectionResult> {
  const config = IDE_CONFIGS[ideType];
  const platform = getCurrentPlatform();

  // Check if any install path exists
  const installPaths = config.installPaths[platform];
  let detected = false;

  for (const installPath of installPaths) {
    if (await pathExists(installPath)) {
      detected = true;
      break;
    }
  }

  // Try to find CLI command
  const cliPath = await findCliCommand(config.cliCommand);
  if (cliPath) {
    detected = true;
  }

  // Get version if CLI is available
  const version = cliPath ? await getIdeVersion(cliPath) : undefined;

  // Check if extensions directory exists
  const extensionsPaths = config.extensionsPaths[platform];
  let extensionsPath: string | undefined;

  for (const extPath of extensionsPaths) {
    if (await pathExists(extPath)) {
      extensionsPath = extPath;
      break;
    }
  }

  const ide: IDE = {
    ...config,
    detected,
    cliPath,
    version,
  };

  return {
    ide,
    extensionsPath,
    available: detected && extensionsPath !== undefined,
  };
}

/**
 * Detect all installed IDEs
 */
export async function detectAllIDEs(): Promise<IDEDetectionResult[]> {
  const ideTypes: IDEType[] = ['vscode', 'vscodium', 'cursor', 'code-oss'];

  const detectionPromises = ideTypes.map(type => detectIDE(type));
  const results = await Promise.all(detectionPromises);

  return results;
}

/**
 * Find available IDEs (detected with extensions path)
 */
export async function findAvailableIDEs(): Promise<IDEDetectionResult[]> {
  const allIDEs = await detectAllIDEs();
  return allIDEs.filter(result => result.available);
}

/**
 * Get extensions directory for a specific IDE
 */
export function getExtensionsDirectory(
  ideType: IDEType,
  platform: Platform = getCurrentPlatform()
): string {
  const config = IDE_CONFIGS[ideType];
  return config.extensionsPaths[platform][0];
}
