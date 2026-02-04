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

// Use the real Windows environment variables so redirected / non-default
// profile layouts (Citrix, SCCM, roaming profiles) resolve correctly.
// On non-Windows platforms these are undefined; the values are only ever
// consumed inside win32 path arrays, so the fallbacks are never reached there.
const localAppDataPrograms = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'Programs')
  : path.join(os.homedir(), 'AppData', 'Local', 'Programs');

const programFiles     = process.env.PROGRAMFILES            || 'C:\\Program Files';
const programFilesX86  = process.env['ProgramFiles(x86)']    || 'C:\\Program Files (x86)';

const IDE_CONFIGS: Record<IDEType, Omit<IDE, 'detected' | 'version' | 'cliPath'>> = {
  vscode: {
    type: 'vscode',
    name: 'Visual Studio Code',
    defaultMarketplace: 'vscode',
    cliCommand: 'code',
    installPaths: {
      darwin: ['/Applications/Visual Studio Code.app'],
      linux: ['/usr/share/code', '/usr/bin/code'],
      win32: [path.join(programFiles, 'Microsoft VS Code'), path.join(programFilesX86, 'Microsoft VS Code'), path.join(localAppDataPrograms, 'Microsoft VS Code')],
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
      win32: [path.join(programFiles, 'VSCodium'), path.join(programFilesX86, 'VSCodium'), path.join(localAppDataPrograms, 'VSCodium')],
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
      win32: [path.join(programFiles, 'Cursor'), path.join(programFilesX86, 'Cursor'), path.join(localAppDataPrograms, 'Cursor')],
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
      win32: [path.join(programFiles, 'Code - OSS'), path.join(programFilesX86, 'Code - OSS'), path.join(localAppDataPrograms, 'Code - OSS')],
    },
    extensionsPaths: {
      darwin: [path.join(os.homedir(), '.vscode-oss/extensions')],
      linux: [path.join(os.homedir(), '.vscode-oss/extensions')],
      win32: [path.join(os.homedir(), '.vscode-oss\\extensions')],
    },
  },
  antigravity: {
    type: 'antigravity',
    name: 'AntiGravity',
    defaultMarketplace: 'openvsx',
    cliCommand: 'antigravity',
    installPaths: {
      darwin: ['/Applications/Antigravity.app', path.join(os.homedir(), '.antigravity/antigravity')],
      linux: ['/usr/share/antigravity', '/usr/bin/antigravity', path.join(os.homedir(), '.antigravity/antigravity')],
      win32: [path.join(programFiles, 'AntiGravity'), path.join(programFilesX86, 'AntiGravity'), path.join(localAppDataPrograms, 'AntiGravity'), path.join(os.homedir(), '.antigravity\\antigravity')],
    },
    extensionsPaths: {
      darwin: [path.join(os.homedir(), '.antigravity/extensions')],
      linux: [path.join(os.homedir(), '.antigravity/extensions')],
      win32: [path.join(os.homedir(), '.antigravity\\extensions')],
    },
  },
  intellij: {
    type: 'intellij',
    name: 'IntelliJ IDEA',
    defaultMarketplace: 'jetbrains',
    cliCommand: 'idea',
    installPaths: {
      darwin: ['/Applications/IntelliJ IDEA.app', '/Applications/IntelliJ IDEA Ultimate.app', '/Applications/IntelliJ IDEA Community.app'],
      linux: ['/usr/share/intellij-idea', '/usr/bin/idea', '/opt/idea'],
      win32: [
        path.join(programFiles, 'JetBrains', 'IntelliJ IDEA'),
        path.join(programFiles, 'JetBrains', 'IntelliJ IDEA Ultimate'),
        path.join(programFiles, 'JetBrains', 'IntelliJ IDEA Community'),
        path.join(programFilesX86, 'JetBrains', 'IntelliJ IDEA'),
        path.join(programFilesX86, 'JetBrains', 'IntelliJ IDEA Ultimate'),
        path.join(programFilesX86, 'JetBrains', 'IntelliJ IDEA Community'),
      ],
    },
    extensionsPaths: {
      darwin: [],
      linux: [],
      win32: [],
    },
  },
  androidstudio: {
    type: 'androidstudio',
    name: 'Android Studio',
    defaultMarketplace: 'jetbrains',
    cliCommand: 'studio',
    installPaths: {
      darwin: ['/Applications/Android Studio.app'],
      linux: ['/usr/share/android-studio', '/usr/bin/studio', '/opt/android-studio'],
      win32: [path.join(programFiles, 'Google', 'Android Studio'), path.join(programFilesX86, 'Google', 'Android Studio')],
    },
    extensionsPaths: {
      darwin: [],
      linux: [],
      win32: [],
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
 * Probe known install directories for the CLI binary when PATH lookup fails.
 *
 * Candidate layout per platform:
 *   Windows  – <installPath>/bin/<cmd>.cmd  |  <installPath>/bin/<cmd>.exe
 *   macOS    – <installPath>/Contents/Resources/app/bin/<cmd>   (inside .app bundle)
 *   Linux    – <installPath>/bin/<cmd>
 */
async function findCliInInstallPaths(
  cliCommand: string,
  installPaths: string[],
  platform: Platform
): Promise<string | undefined> {
  for (const installPath of installPaths) {
    let candidates: string[];

    if (platform === 'win32') {
      candidates = [
        path.join(installPath, 'bin', `${cliCommand}.cmd`),
        path.join(installPath, 'bin', `${cliCommand}.exe`),
      ];
    } else if (installPath.endsWith('.app')) {
      // VS Code-based IDEs:  Contents/Resources/app/bin/<cmd>
      // JetBrains IDEs:      Contents/MacOS/<cmd>
      candidates = [
        path.join(installPath, 'Contents', 'Resources', 'app', 'bin', cliCommand),
        path.join(installPath, 'Contents', 'MacOS', cliCommand),
      ];
    } else {
      candidates = [
        path.join(installPath, 'bin', cliCommand),
      ];
    }

    for (const candidate of candidates) {
      if (await pathExists(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
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
    let cliPath = stdout.trim().split('\n')[0].replace(/\r$/, '');

    // `where` on Windows may return the extensionless shell-script that lives
    // alongside the .cmd wrapper (e.g. bin/code instead of bin/code.cmd).
    // execFile cannot run .cmd files without a shell, so prefer the .cmd path.
    if (isWindows && cliPath && !cliPath.endsWith('.cmd') && !cliPath.endsWith('.exe')) {
      const { access } = await import('fs/promises');
      try {
        await access(cliPath + '.cmd');
        cliPath = cliPath + '.cmd';
      } catch { /* .cmd variant doesn't exist, keep original */ }
    }

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

    const { stdout } = await execFileAsync(cliPath, ['--version'], {
      shell: getCurrentPlatform() === 'win32',
    });
    const firstLine = stdout.trim().split('\n')[0].replace(/\r$/, '');
    return firstLine || undefined;
  } catch {
    return undefined;
  }
}

/**
 * JetBrains config-dir base paths per IDE type and platform.
 * The actual versioned dir (e.g. IntelliJIdea2024.3) lives inside these.
 */
// %APPDATA% is the roaming app-data directory; same class of env-var fix as
// LOCALAPPDATA above — redirected profiles will have a non-default location.
const appData = process.env.APPDATA
  || path.join(os.homedir(), 'AppData', 'Roaming');

const JETBRAINS_CONFIG_BASES: Record<string, Record<Platform, string>> = {
  intellij: {
    darwin: path.join(os.homedir(), 'Library', 'Application Support', 'JetBrains'),
    linux: path.join(os.homedir(), '.config', 'JetBrains'),
    win32: path.join(appData, 'JetBrains'),
  },
  androidstudio: {
    darwin: path.join(os.homedir(), 'Library', 'Application Support', 'Google'),
    linux: path.join(os.homedir(), '.config', 'Google'),
    win32: path.join(appData, 'Google'),
  },
};

/** Directory name prefixes that identify each JetBrains IDE's versioned config folder. */
const JETBRAINS_DIR_PREFIXES: Record<string, string> = {
  intellij: 'IntelliJIdea',
  androidstudio: 'AndroidStudio',
};

/**
 * Extract a comparable version tuple from a versioned directory name.
 * E.g. "IntelliJIdea2024.3" → [2024, 3]
 */
function extractVersionTuple(dirName: string, prefix: string): number[] {
  const versionPart = dirName.slice(prefix.length);
  return versionPart.split('.').map(Number).filter(n => !isNaN(n));
}

/**
 * Compare two version tuples: returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareVersionTuples(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Resolve the plugins directory for a JetBrains IDE by scanning the
 * versioned config directory and picking the latest version.
 * Returns the path to <latestVersion>/plugins/, or undefined if not found.
 */
export async function resolveJetBrainsPluginDir(
  ideType: 'intellij' | 'androidstudio',
  platform: Platform = getCurrentPlatform()
): Promise<string | undefined> {
  const base = JETBRAINS_CONFIG_BASES[ideType]?.[platform];
  const prefix = JETBRAINS_DIR_PREFIXES[ideType];
  if (!base || !prefix) return undefined;

  if (!(await pathExists(base))) return undefined;

  let candidates: string[];
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    candidates = entries
      .filter(e => e.isDirectory() && e.name.startsWith(prefix))
      .map(e => e.name);
  } catch {
    return undefined;
  }

  if (candidates.length === 0) return undefined;

  // Sort by extracted version, descending
  candidates.sort((a, b) =>
    compareVersionTuples(
      extractVersionTuple(b, prefix),
      extractVersionTuple(a, prefix)
    )
  );

  const pluginsPath = path.join(base, candidates[0], 'plugins');
  if (await pathExists(pluginsPath)) {
    return pluginsPath;
  }
  return undefined;
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

  // Try to find CLI command – fall back to probing install directories
  const cliPath = await findCliCommand(config.cliCommand)
    ?? await findCliInInstallPaths(config.cliCommand, installPaths, platform);
  if (cliPath) {
    detected = true;
  }

  // Get version if CLI is available
  const version = cliPath ? await getIdeVersion(cliPath) : undefined;

  let extensionsPath: string | undefined;

  if (ideType === 'intellij' || ideType === 'androidstudio') {
    // JetBrains: resolve plugins dir dynamically from versioned config directories
    extensionsPath = await resolveJetBrainsPluginDir(ideType, platform);
  } else {
    // VS Code-based: check static extensions directory paths
    const extensionsPaths = config.extensionsPaths[platform];
    for (const extPath of extensionsPaths) {
      if (await pathExists(extPath)) {
        extensionsPath = extPath;
        break;
      }
    }
  }

  // Finding the extensions/plugins directory is itself evidence the IDE is installed
  if (extensionsPath) {
    detected = true;
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
  const ideTypes: IDEType[] = ['vscode', 'vscodium', 'cursor', 'code-oss', 'antigravity', 'intellij', 'androidstudio'];

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
