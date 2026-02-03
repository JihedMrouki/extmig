/**
 * Extension Matcher
 *
 * Matches and compares extensions between two IDE installations.
 */

import {
  Extension,
  InstalledExtension,
  ExtensionIdSchema,
  normalizeExtensionId,
} from '../../types/index.js';

/**
 * Extension match result
 */
export interface ExtensionMatch {
  /** Extension ID */
  extensionId: string;

  /** Extension in source IDE */
  sourceExtension?: InstalledExtension;

  /** Extension in target IDE */
  targetExtension?: InstalledExtension;

  /** Match type */
  matchType: 'exact' | 'version_mismatch' | 'source_only' | 'target_only';

  /** Version comparison (if both exist) */
  versionMatch?: boolean;

  /** Source version */
  sourceVersion?: string;

  /** Target version */
  targetVersion?: string;
}

/**
 * Matching options
 */
export interface MatchOptions {
  /**
   * Case-sensitive ID matching
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * Ignore version differences in match type
   * @default false
   */
  ignoreVersions?: boolean;
}

const DEFAULT_MATCH_OPTIONS: Required<MatchOptions> = {
  caseSensitive: false,
  ignoreVersions: false,
};

/**
 * Normalize extension ID for comparison
 */
function normalizeForComparison(id: string, caseSensitive: boolean): string {
  return caseSensitive ? id : id.toLowerCase();
}

/**
 * Create extension map for fast lookup
 */
function createExtensionMap(
  extensions: InstalledExtension[],
  caseSensitive: boolean
): Map<string, InstalledExtension> {
  const map = new Map<string, InstalledExtension>();

  for (const ext of extensions) {
    const key = normalizeForComparison(ext.id, caseSensitive);
    map.set(key, ext);
  }

  return map;
}

/**
 * Compare two version strings
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  // Simple lexicographic comparison
  // For semver: split by dots and compare numerically
  const parts1 = v1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Check if versions match
 */
export function versionsMatch(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) === 0;
}

/**
 * Match extensions between source and target
 */
export function matchExtensions(
  sourceExtensions: InstalledExtension[],
  targetExtensions: InstalledExtension[],
  options: MatchOptions = {}
): ExtensionMatch[] {
  const opts = { ...DEFAULT_MATCH_OPTIONS, ...options };
  const matches: ExtensionMatch[] = [];

  // Create target map for fast lookup
  const targetMap = createExtensionMap(targetExtensions, opts.caseSensitive);
  const matchedTargetIds = new Set<string>();

  // Process source extensions
  for (const sourceExt of sourceExtensions) {
    const normalizedId = normalizeForComparison(sourceExt.id, opts.caseSensitive);
    const targetExt = targetMap.get(normalizedId);

    if (targetExt) {
      // Extension exists in both
      matchedTargetIds.add(normalizedId);

      const versionMatch = versionsMatch(sourceExt.version, targetExt.version);
      const matchType = opts.ignoreVersions || versionMatch
        ? 'exact'
        : 'version_mismatch';

      matches.push({
        extensionId: sourceExt.id,
        sourceExtension: sourceExt,
        targetExtension: targetExt,
        matchType,
        versionMatch,
        sourceVersion: sourceExt.version,
        targetVersion: targetExt.version,
      });
    } else {
      // Extension only in source
      matches.push({
        extensionId: sourceExt.id,
        sourceExtension: sourceExt,
        matchType: 'source_only',
        sourceVersion: sourceExt.version,
      });
    }
  }

  // Process target-only extensions
  for (const targetExt of targetExtensions) {
    const normalizedId = normalizeForComparison(targetExt.id, opts.caseSensitive);

    if (!matchedTargetIds.has(normalizedId)) {
      matches.push({
        extensionId: targetExt.id,
        targetExtension: targetExt,
        matchType: 'target_only',
        targetVersion: targetExt.version,
      });
    }
  }

  return matches;
}

/**
 * Get extensions only in source
 */
export function getSourceOnlyExtensions(
  matches: ExtensionMatch[]
): ExtensionMatch[] {
  return matches.filter(m => m.matchType === 'source_only');
}

/**
 * Get extensions only in target
 */
export function getTargetOnlyExtensions(
  matches: ExtensionMatch[]
): ExtensionMatch[] {
  return matches.filter(m => m.matchType === 'target_only');
}

/**
 * Get extensions in both with version mismatches
 */
export function getVersionMismatches(
  matches: ExtensionMatch[]
): ExtensionMatch[] {
  return matches.filter(m => m.matchType === 'version_mismatch');
}

/**
 * Get extensions in both with exact version match
 */
export function getExactMatches(
  matches: ExtensionMatch[]
): ExtensionMatch[] {
  return matches.filter(m => m.matchType === 'exact');
}

/**
 * Get match statistics
 */
export interface MatchStatistics {
  totalInSource: number;
  totalInTarget: number;
  exactMatches: number;
  versionMismatches: number;
  sourceOnly: number;
  targetOnly: number;
}

export function getMatchStatistics(matches: ExtensionMatch[]): MatchStatistics {
  return {
    totalInSource: matches.filter(m => m.sourceExtension !== undefined).length,
    totalInTarget: matches.filter(m => m.targetExtension !== undefined).length,
    exactMatches: matches.filter(m => m.matchType === 'exact').length,
    versionMismatches: matches.filter(m => m.matchType === 'version_mismatch').length,
    sourceOnly: matches.filter(m => m.matchType === 'source_only').length,
    targetOnly: matches.filter(m => m.matchType === 'target_only').length,
  };
}
