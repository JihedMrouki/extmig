import { z } from 'zod';
import { MarketplaceTypeSchema } from './marketplace.js';

/**
 * Supported IDE types
 */
export const IDETypeSchema = z.enum([
  'vscode',           // Visual Studio Code
  'vscodium',         // VSCodium
  'cursor',           // Cursor
  'code-oss',         // Code - OSS
]);

export type IDEType = z.infer<typeof IDETypeSchema>;

/**
 * Operating system platform
 */
export const PlatformSchema = z.enum([
  'darwin',    // macOS
  'linux',     // Linux
  'win32',     // Windows
]);

export type Platform = z.infer<typeof PlatformSchema>;

/**
 * IDE configuration and CLI information
 */
export const IDESchema = z.object({
  /** IDE type identifier */
  type: IDETypeSchema,

  /** Display name */
  name: z.string(),

  /** Default marketplace for this IDE */
  defaultMarketplace: MarketplaceTypeSchema,

  /** CLI command name */
  cliCommand: z.string(),

  /** Detected CLI path (if available) */
  cliPath: z.string().optional(),

  /** Installation directory paths per platform */
  installPaths: z.object({
    darwin: z.array(z.string()),
    linux: z.array(z.string()),
    win32: z.array(z.string()),
  }),

  /** Extensions directory paths per platform */
  extensionsPaths: z.object({
    darwin: z.array(z.string()),
    linux: z.array(z.string()),
    win32: z.array(z.string()),
  }),

  /** Whether this IDE is detected on the system */
  detected: z.boolean().default(false),

  /** Detected version */
  version: z.string().optional(),
});

export type IDE = z.infer<typeof IDESchema>;

/**
 * IDE detection result
 */
export const IDEDetectionResultSchema = z.object({
  /** Full IDE configuration */
  ide: IDESchema,

  /** Extensions directory path if found */
  extensionsPath: z.string().optional(),

  /** Whether IDE is available (detected + extensions directory exists) */
  available: z.boolean(),
});

export type IDEDetectionResult = z.infer<typeof IDEDetectionResultSchema>;
