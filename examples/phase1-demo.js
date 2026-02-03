/**
 * Phase 1 Data Model Demo
 *
 * This file demonstrates the core types and validation utilities
 * created in Phase 1.
 */
import { ExtensionSchema, InstalledExtensionSchema, ResolvedExtensionSchema, SyncResultSchema, ExtensionDiffSchema, validate, parseExtensionId, createExtensionId, isValidExtensionId, } from '../src/types/index.js';
// Example 1: Validating an extension
console.log('=== Example 1: Extension Validation ===');
const extensionData = {
    id: 'esbenp.prettier-vscode',
    displayName: 'Prettier - Code formatter',
    description: 'Code formatter using prettier',
    publisher: 'esbenp',
    name: 'prettier-vscode',
    version: '10.1.0',
};
const extensionResult = validate(ExtensionSchema, extensionData);
if (extensionResult.success) {
    console.log('✓ Valid extension:', extensionResult.data);
}
else {
    console.error('✗ Validation failed:', extensionResult.error.getMessages());
}
// Example 2: Installed extension with path
console.log('\n=== Example 2: Installed Extension ===');
const installedData = {
    ...extensionData,
    path: '/Users/user/.vscode/extensions/esbenp.prettier-vscode-10.1.0',
    enabled: true,
};
const installedResult = validate(InstalledExtensionSchema, installedData);
if (installedResult.success) {
    console.log('✓ Valid installed extension');
    console.log('  Path:', installedResult.data.path);
    console.log('  Enabled:', installedResult.data.enabled);
}
// Example 3: Extension ID utilities
console.log('\n=== Example 3: Extension ID Utilities ===');
const extensionId = 'esbenp.prettier-vscode';
console.log('Is valid ID?', isValidExtensionId(extensionId));
const parsed = parseExtensionId(extensionId);
if (parsed) {
    console.log('Parsed:', parsed);
    console.log('Reconstructed:', createExtensionId(parsed.publisher, parsed.name));
}
// Example 4: Resolved extension from marketplace
console.log('\n=== Example 4: Marketplace Resolution ===');
const resolvedData = {
    id: 'esbenp.prettier-vscode',
    displayName: 'Prettier - Code formatter',
    description: 'Code formatter using prettier',
    publisher: 'esbenp',
    name: 'prettier-vscode',
    version: '12.3.0',
    marketplace: 'openvsx',
    available: true,
    url: 'https://open-vsx.org/extension/esbenp/prettier-vscode',
    metadata: {
        downloadCount: 4255258,
        verified: true,
        deprecated: false,
    },
};
const resolvedResult = validate(ResolvedExtensionSchema, resolvedData);
if (resolvedResult.success) {
    console.log('✓ Extension found on', resolvedResult.data.marketplace);
    console.log('  Version:', resolvedResult.data.version);
    console.log('  Downloads:', resolvedResult.data.metadata?.downloadCount);
}
// Example 5: Sync result
console.log('\n=== Example 5: Sync Result ===');
const syncResultData = {
    extensionId: 'esbenp.prettier-vscode',
    displayName: 'Prettier',
    sourceVersion: '10.1.0',
    targetVersion: '12.3.0',
    status: 'installed',
    sourceMarketplace: 'vscode',
    targetMarketplace: 'openvsx',
};
const syncResult = validate(SyncResultSchema, syncResultData);
if (syncResult.success) {
    console.log('✓ Sync completed');
    console.log('  Status:', syncResult.data.status);
    console.log('  Upgraded:', syncResult.data.sourceVersion, '→', syncResult.data.targetVersion);
}
// Example 6: Extension diff
console.log('\n=== Example 6: Extension Diff ===');
const diffData = {
    onlyInSource: [
        {
            extensionId: 'github.copilot',
            displayName: 'GitHub Copilot',
            version: '1.100.0',
            availableInTarget: false,
        },
    ],
    onlyInTarget: [
        {
            extensionId: 'jnoortheen.nix-ide',
            displayName: 'Nix IDE',
            version: '0.2.1',
        },
    ],
    inBoth: [
        {
            extensionId: 'esbenp.prettier-vscode',
            displayName: 'Prettier',
            sourceVersion: '10.1.0',
            targetVersion: '12.3.0',
            versionMatch: false,
        },
    ],
    summary: {
        totalInSource: 10,
        totalInTarget: 8,
        onlyInSourceCount: 1,
        onlyInTargetCount: 1,
        inBothCount: 1,
        availableForSync: 7,
        notAvailableForSync: 1,
    },
};
const diffResult = validate(ExtensionDiffSchema, diffData);
if (diffResult.success) {
    console.log('✓ Diff generated');
    console.log('  Only in source:', diffResult.data.summary.onlyInSourceCount);
    console.log('  Only in target:', diffResult.data.summary.onlyInTargetCount);
    console.log('  In both:', diffResult.data.summary.inBothCount);
    console.log('  Available for sync:', diffResult.data.summary.availableForSync);
    console.log('  Not available:', diffResult.data.summary.notAvailableForSync);
}
// Example 7: Invalid data handling
console.log('\n=== Example 7: Validation Error Handling ===');
const invalidData = {
    id: 'invalid-id-format', // Should be publisher.name
    publisher: 'test',
    name: 'test',
};
const invalidResult = validate(ExtensionSchema, invalidData);
if (!invalidResult.success) {
    console.log('✗ Validation failed (expected):');
    invalidResult.error.getMessages().forEach(msg => console.log('  -', msg));
}
console.log('\n=== Phase 1 Data Model Demo Complete ===');
//# sourceMappingURL=phase1-demo.js.map