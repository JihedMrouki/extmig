/**
 * Extension Parser
 *
 * Parses package.json files from extension directories.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  InstalledExtension,
  ExtensionManifest,
  ExtensionManifestSchema,
  createExtensionId,
  ValidationError,
} from '../../types/index.js';

/**
 * Parse error with context
 */
export class ExtensionParseError extends Error {
  constructor(
    message: string,
    public readonly extensionPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ExtensionParseError';
  }
}

/**
 * Read and parse package.json from an extension directory
 */
export async function parsePackageJson(
  extensionPath: string
): Promise<ExtensionManifest> {
  const packageJsonPath = path.join(extensionPath, 'package.json');

  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const json = JSON.parse(content);

    // Validate against schema
    const result = ExtensionManifestSchema.safeParse(json);

    if (!result.success) {
      throw new ExtensionParseError(
        `Invalid package.json schema: ${result.error.message}`,
        extensionPath,
        result.error
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ExtensionParseError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ExtensionParseError(
        `Failed to parse package.json: ${error.message}`,
        extensionPath,
        error
      );
    }

    throw new ExtensionParseError(
      'Failed to parse package.json: Unknown error',
      extensionPath
    );
  }
}

/**
 * Extract extension metadata from package.json
 */
export async function parseExtensionMetadata(
  extensionPath: string
): Promise<Omit<InstalledExtension, 'path' | 'enabled'>> {
  const manifest = await parsePackageJson(extensionPath);

  const publisher = manifest.publisher;
  const name = manifest.name;
  const version = manifest.version;
  const id = createExtensionId(publisher, name);

  return {
    id,
    publisher,
    name,
    version,
    displayName: manifest.displayName,
    description: manifest.description,
    packageJson: manifest as unknown as Record<string, unknown>,
  };
}

/**
 * Check if a directory contains a valid extension
 */
export async function isValidExtensionDirectory(
  extensionPath: string
): Promise<boolean> {
  try {
    const packageJsonPath = path.join(extensionPath, 'package.json');
    await fs.access(packageJsonPath);

    // Try to parse it to ensure it's valid
    await parsePackageJson(extensionPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get extension directory stats (for installedAt timestamp)
 */
export async function getExtensionStats(
  extensionPath: string
): Promise<{ installedAt?: Date }> {
  try {
    const stats = await fs.stat(extensionPath);
    return {
      installedAt: stats.birthtime || stats.ctime,
    };
  } catch {
    return {};
  }
}

/**
 * Parse a complete installed extension
 */
export async function parseInstalledExtension(
  extensionPath: string,
  enabled: boolean = true
): Promise<InstalledExtension> {
  const metadata = await parseExtensionMetadata(extensionPath);
  const stats = await getExtensionStats(extensionPath);

  return {
    ...metadata,
    path: extensionPath,
    enabled,
    installedAt: stats.installedAt,
  };
}
