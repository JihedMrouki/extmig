/**
 * Extension Scanner
 *
 * Main scanner module that detects IDEs and scans their installed extensions.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IDEType,
  IDE,
  InstalledExtension,
  IDEDetectionResult,
} from '../../types/index.js';
import {
  detectIDE,
  detectAllIDEs,
  findAvailableIDEs,
  getExtensionsDirectory,
  getCurrentPlatform,
} from './paths.js';
import {
  parseInstalledExtension,
  isValidExtensionDirectory,
  ExtensionParseError,
  parseJetBrainsPlugin,
} from './parser.js';

/**
 * Scan result for a single IDE
 */
export interface ScanResult {
  ide: IDE;
  extensionsPath: string;
  extensions: InstalledExtension[];
  errors: Array<{
    extensionPath: string;
    error: string;
  }>;
}

/**
 * Options for scanning extensions
 */
export interface ScanOptions {
  /**
   * Skip extensions that fail to parse
   * @default true
   */
  skipInvalid?: boolean;

  /**
   * Include disabled extensions
   * @default true
   */
  includeDisabled?: boolean;

  /**
   * Maximum concurrent parsers
   * @default 10
   */
  concurrency?: number;
}

const DEFAULT_SCAN_OPTIONS: Required<ScanOptions> = {
  skipInvalid: true,
  includeDisabled: true,
  concurrency: 10,
};

/**
 * Scan extensions in a specific directory
 */
export async function scanExtensionsDirectory(
  extensionsPath: string,
  options: ScanOptions = {}
): Promise<{
  extensions: InstalledExtension[];
  errors: Array<{ extensionPath: string; error: string }>;
}> {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const extensions: InstalledExtension[] = [];
  const errors: Array<{ extensionPath: string; error: string }> = [];

  try {
    // Read all entries in extensions directory
    const entries = await fs.readdir(extensionsPath, { withFileTypes: true });

    // Filter to only directories
    const extensionDirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(extensionsPath, entry.name));

    // Parse extensions with concurrency control
    const chunks: string[][] = [];
    for (let i = 0; i < extensionDirs.length; i += opts.concurrency) {
      chunks.push(extensionDirs.slice(i, i + opts.concurrency));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (extPath) => {
          // Check if valid extension directory
          if (!(await isValidExtensionDirectory(extPath))) {
            throw new ExtensionParseError(
              'Not a valid extension directory',
              extPath
            );
          }

          // Parse extension
          const extension = await parseInstalledExtension(extPath, true);
          return extension;
        })
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const extPath = chunk[i];

        if (result.status === 'fulfilled') {
          extensions.push(result.value);
        } else {
          const errorMsg = result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error';

          errors.push({
            extensionPath: extPath,
            error: errorMsg,
          });

          if (!opts.skipInvalid) {
            throw result.reason;
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      errors.push({
        extensionPath: extensionsPath,
        error: `Failed to scan directory: ${error.message}`,
      });
    }
  }

  return { extensions, errors };
}

/**
 * Scan JetBrains plugins in a plugins directory.
 * Each entry may be an unpacked directory or a .jar file.
 */
export async function scanJetBrainsPlugins(
  pluginsDir: string,
  options: ScanOptions = {}
): Promise<{
  extensions: InstalledExtension[];
  errors: Array<{ extensionPath: string; error: string }>;
}> {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const extensions: InstalledExtension[] = [];
  const errors: Array<{ extensionPath: string; error: string }> = [];

  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

    const entryPaths = entries
      .filter(e => e.isDirectory() || (e.isFile() && e.name.endsWith('.jar')))
      .map(e => path.join(pluginsDir, e.name));

    // Process with concurrency control
    const chunks: string[][] = [];
    for (let i = 0; i < entryPaths.length; i += opts.concurrency) {
      chunks.push(entryPaths.slice(i, i + opts.concurrency));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(entryPath => parseJetBrainsPlugin(entryPath))
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const entryPath = chunk[i];

        if (result.status === 'fulfilled') {
          if (result.value) {
            extensions.push(result.value);
          }
          // null means no plugin.xml found — silently skip (e.g. .idea helpers)
        } else {
          const errorMsg = result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error';
          errors.push({ extensionPath: entryPath, error: errorMsg });
          if (!opts.skipInvalid) throw result.reason;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      errors.push({
        extensionPath: pluginsDir,
        error: `Failed to scan JetBrains plugins directory: ${error.message}`,
      });
    }
  }

  return { extensions, errors };
}

/**
 * Scan extensions for a specific IDE
 */
export async function scanIDE(
  ideType: IDEType,
  options: ScanOptions = {}
): Promise<ScanResult | null> {
  const detection = await detectIDE(ideType);

  if (!detection.available || !detection.extensionsPath) {
    return null;
  }

  const isJetBrains = ideType === 'intellij' || ideType === 'androidstudio';
  const { extensions, errors } = isJetBrains
    ? await scanJetBrainsPlugins(detection.extensionsPath, options)
    : await scanExtensionsDirectory(detection.extensionsPath, options);

  return {
    ide: detection.ide,
    extensionsPath: detection.extensionsPath,
    extensions,
    errors,
  };
}

/**
 * Scan all available IDEs
 */
export async function scanAllIDEs(
  options: ScanOptions = {}
): Promise<ScanResult[]> {
  const availableIDEs = await findAvailableIDEs();

  const scanPromises = availableIDEs.map(async (detection) => {
    if (!detection.extensionsPath) {
      return null;
    }

    const { extensions, errors } = await scanExtensionsDirectory(
      detection.extensionsPath,
      options
    );

    return {
      ide: detection.ide,
      extensionsPath: detection.extensionsPath,
      extensions,
      errors,
    };
  });

  const results = await Promise.all(scanPromises);
  return results.filter((r): r is ScanResult => r !== null);
}

/**
 * Get a summary of installed extensions across all IDEs
 */
export async function getExtensionsSummary(): Promise<{
  totalIDEs: number;
  totalExtensions: number;
  byIDE: Array<{
    ide: string;
    count: number;
  }>;
}> {
  const results = await scanAllIDEs();

  return {
    totalIDEs: results.length,
    totalExtensions: results.reduce((sum, r) => sum + r.extensions.length, 0),
    byIDE: results.map(r => ({
      ide: r.ide.name,
      count: r.extensions.length,
    })),
  };
}

// Re-export utilities
export { detectIDE, detectAllIDEs, findAvailableIDEs } from './paths.js';
export {
  parseInstalledExtension,
  parseExtensionMetadata,
  parsePackageJson,
  isValidExtensionDirectory,
  ExtensionParseError,
} from './parser.js';
