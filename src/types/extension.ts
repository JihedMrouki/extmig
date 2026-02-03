import { z } from 'zod';

/**
 * Base extension schema - marketplace-agnostic representation
 * Format: publisher.name (e.g., "esbenp.prettier-vscode")
 */
export const ExtensionIdSchema = z.string().regex(
  /^[a-zA-Z0-9-_]+(\.[a-zA-Z0-9-_]+)+$/,
  'Extension ID must be in format: publisher.name (or reverse-domain like com.org.plugin)'
);

/**
 * Extension - Abstract representation independent of marketplace
 */
export const ExtensionSchema = z.object({
  /** Unique identifier in publisher.name format */
  id: ExtensionIdSchema,

  /** Display name for humans */
  displayName: z.string().optional(),

  /** Extension description */
  description: z.string().optional(),

  /** Publisher/namespace */
  publisher: z.string(),

  /** Extension name */
  name: z.string(),

  /** Installed version (if known) */
  version: z.string().optional(),
});

export type Extension = z.infer<typeof ExtensionSchema>;

/**
 * InstalledExtension - Extension found on disk in an IDE
 */
export const InstalledExtensionSchema = ExtensionSchema.extend({
  /** Absolute path to extension directory */
  path: z.string(),

  /** Version is required for installed extensions */
  version: z.string(),

  /** Whether extension is enabled */
  enabled: z.boolean().default(true),

  /** Raw package.json data */
  packageJson: z.record(z.string(), z.unknown()).optional(),

  /** Installation timestamp if available */
  installedAt: z.date().optional(),
});

export type InstalledExtension = z.infer<typeof InstalledExtensionSchema>;

/**
 * Extension metadata from package.json
 */
export const ExtensionManifestSchema = z.object({
  name: z.string(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  version: z.string(),
  publisher: z.string(),
  engines: z.object({
    vscode: z.string(),
  }),
  categories: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  repository: z.union([
    z.string(),
    z.object({
      type: z.string(),
      url: z.string(),
    }),
  ]).optional(),
});

export type ExtensionManifest = z.infer<typeof ExtensionManifestSchema>;

/**
 * JetBrains plugin metadata extracted from META-INF/plugin.xml
 */
export const JetBrainsPluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  vendor: z.string().optional(),
  description: z.string().optional(),
});

export type JetBrainsPluginManifest = z.infer<typeof JetBrainsPluginManifestSchema>;
