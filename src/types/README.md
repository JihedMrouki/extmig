# extsync Core Data Model

Phase 1: Core Data Model - **COMPLETE** ✓

## Overview

This directory contains all core type definitions and schemas for extsync, built with TypeScript and validated using Zod for runtime type safety.

## Design Principles

1. **Marketplace-agnostic**: Types don't assume any specific marketplace
2. **Strict validation**: All data is validated at runtime using Zod schemas
3. **Type safety**: Full TypeScript support with generated declaration files
4. **Extensible**: Easy to add new marketplaces, IDEs, or fields

## Core Types

### Extension Types (`extension.ts`)

**Extension** - Abstract representation of an extension, independent of where it's installed
```typescript
{
  id: string,              // Format: "publisher.name"
  displayName?: string,
  description?: string,
  publisher: string,
  name: string,
  version?: string,
}
```

**InstalledExtension** - Extension found on disk in an IDE
```typescript
{
  ...Extension,
  path: string,            // Absolute path to extension directory
  version: string,         // Required for installed extensions
  enabled: boolean,        // Whether extension is active
  packageJson?: object,    // Raw package.json data
  installedAt?: Date,
}
```

**ExtensionManifest** - Parsed package.json structure
```typescript
{
  name: string,
  displayName?: string,
  description?: string,
  version: string,
  publisher: string,
  engines: { vscode: string },
  categories?: string[],
  keywords?: string[],
  repository?: string | { type, url },
}
```

### Marketplace Types (`marketplace.ts`)

**MarketplaceType** - Supported marketplaces
```typescript
'vscode' | 'openvsx'
```

**Marketplace** - Marketplace configuration
```typescript
{
  type: MarketplaceType,
  name: string,
  apiUrl: string,          // Base API URL
  webUrl: string,          // Web browsing URL
  requiresAuth: boolean,
}
```

**ResolvedExtension** - Result of querying a marketplace
```typescript
{
  id: string,
  displayName?: string,
  description?: string,
  publisher: string,
  name: string,
  version: string,         // Latest available version
  marketplace: MarketplaceType,
  available: boolean,
  downloadUrl?: string,
  url?: string,
  allVersions?: string[],
  metadata?: {
    downloadCount?: number,
    rating?: number,
    verified?: boolean,
    deprecated?: boolean,
  },
}
```

**ResolutionStatus**
```typescript
'found' | 'not_found' | 'error' | 'unsupported'
```

**ResolutionResult** - Outcome of marketplace lookup
```typescript
{
  extensionId: string,
  status: ResolutionStatus,
  extension?: ResolvedExtension,
  error?: string,
  marketplace: MarketplaceType,
}
```

### IDE Types (`ide.ts`)

**IDEType** - Supported IDEs
```typescript
'vscode' | 'vscodium' | 'cursor' | 'code-oss'
```

**Platform** - Operating systems
```typescript
'darwin' | 'linux' | 'win32'
```

**IDE** - IDE configuration
```typescript
{
  type: IDEType,
  name: string,
  defaultMarketplace: MarketplaceType,
  cliCommand: string,      // e.g., "code", "codium"
  cliPath?: string,        // Detected CLI path
  installPaths: {          // Per-platform install directories
    darwin: string[],
    linux: string[],
    win32: string[],
  },
  extensionsPaths: {       // Per-platform extension directories
    darwin: string[],
    linux: string[],
    win32: string[],
  },
  detected: boolean,       // Whether found on system
  version?: string,
}
```

**IDEDetectionResult** - IDE detection outcome
```typescript
{
  type: IDEType,
  found: boolean,
  cliPath?: string,
  extensionsPath?: string,
  version?: string,
  error?: string,
}
```

### Sync Types (`sync.ts`)

**SyncStatus**
```typescript
'installed' | 'already_installed' | 'skipped' | 'not_available' | 'failed' | 'pending'
```

**SyncResult** - Individual extension sync result
```typescript
{
  extensionId: string,
  displayName?: string,
  sourceVersion?: string,
  targetVersion?: string,
  status: SyncStatus,
  error?: string,
  sourceMarketplace?: MarketplaceType,
  targetMarketplace?: MarketplaceType,
  timestamp: Date,
}
```

**SyncSummary** - Overall sync operation summary
```typescript
{
  sourceIDE: IDEType,
  targetIDE: IDEType,
  totalScanned: number,
  installed: number,
  alreadyInstalled: number,
  skipped: number,
  notAvailable: number,
  failed: number,
  results: SyncResult[],
  dryRun: boolean,
  startTime: Date,
  endTime?: Date,
  duration?: number,
}
```

**ExtensionDiff** - Comparison between source and target
```typescript
{
  onlyInSource: Array<{
    extensionId: string,
    displayName?: string,
    version: string,
    availableInTarget: boolean,
  }>,
  onlyInTarget: Array<{
    extensionId: string,
    displayName?: string,
    version: string,
  }>,
  inBoth: Array<{
    extensionId: string,
    displayName?: string,
    sourceVersion: string,
    targetVersion: string,
    versionMatch: boolean,
  }>,
  summary: {
    totalInSource: number,
    totalInTarget: number,
    onlyInSourceCount: number,
    onlyInTargetCount: number,
    inBothCount: number,
    availableForSync: number,
    notAvailableForSync: number,
  },
}
```

## Validation Utilities (`validation.ts`)

### ValidationResult<T>

Type-safe result wrapper for validation:
```typescript
{ success: true, data: T } | { success: false, error: ValidationError }
```

### Functions

**validate<T>(schema, data)** - Safe validation that returns ValidationResult
```typescript
const result = validate(ExtensionSchema, unknownData);
if (result.success) {
  console.log(result.data); // Typed as Extension
} else {
  console.error(result.error.getMessages());
}
```

**parseOrThrow<T>(schema, data)** - Parse and throw on error
```typescript
const extension = parseOrThrow(ExtensionSchema, data);
```

**Extension ID utilities**:
- `isValidExtensionId(id)` - Check format validity
- `parseExtensionId(id)` - Extract publisher and name
- `createExtensionId(publisher, name)` - Build extension ID
- `normalizeExtensionId(id)` - Lowercase normalization

## Usage Examples

### Creating and validating an extension

```typescript
import { ExtensionSchema, validate } from './types/index.js';

const data = {
  id: 'esbenp.prettier-vscode',
  displayName: 'Prettier',
  publisher: 'esbenp',
  name: 'prettier-vscode',
  version: '10.1.0',
};

const result = validate(ExtensionSchema, data);
if (result.success) {
  console.log('Valid extension:', result.data);
}
```

### Using extension ID utilities

```typescript
import { parseExtensionId, createExtensionId } from './types/index.js';

const parsed = parseExtensionId('esbenp.prettier-vscode');
// { publisher: 'esbenp', name: 'prettier-vscode' }

const id = createExtensionId('esbenp', 'prettier-vscode');
// 'esbenp.prettier-vscode'
```

### Building a sync summary

```typescript
import { SyncSummarySchema } from './types/index.js';

const summary = SyncSummarySchema.parse({
  sourceIDE: 'vscode',
  targetIDE: 'vscodium',
  totalScanned: 10,
  installed: 8,
  alreadyInstalled: 0,
  skipped: 0,
  notAvailable: 2,
  failed: 0,
  results: [],
  dryRun: false,
  startTime: new Date(),
});
```

## Next Steps

With Phase 1 complete, we can now proceed to:

- **Phase 2**: Extension Scanner - Read installed extensions from IDE directories
- **Phase 3**: Marketplace Resolvers - Query Open VSX and VS Code marketplace APIs
- **Phase 4**: Matcher & Diff Engine - Compare extensions across IDEs
- **Phase 5**: Installer Engine - Install extensions via IDE CLIs
- **Phase 6**: CLI UX & Polish - Build the command-line interface

The data model is stable and ready to support all future phases.
