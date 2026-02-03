/**
 * Cross-IDE Resolution
 *
 * Maps JetBrains plugins to their VS Code equivalents using a static
 * well-known map with a marketplace-search fallback for unknown plugins.
 */

import { InstalledExtension, MarketplaceType, ResolvedExtension } from '../../types/index.js';
import { getMarketplaceClient } from '../../marketplaces/index.js';

/**
 * Static map: JetBrains plugin ID → VS Code extension ID.
 * Seed with widely-used cross-IDE pairs.
 */
const KNOWN_MAPPINGS: Record<string, string> = {
  'com.intellij.prettierPlugin':        'esbenp.prettier-vscode',
  'org.jetbrains.plugins.eslint':       'dbaeok.eslintrc',
  'com.intellij.editorconfig':          'editorconfig.editorconfig',
  'org.jetbrains.plugins.git-flow':     'nvkv.vscode-git-flow',
  'com.intellij.css':                   'prlandau.vscode-css-intellisense',
  'com.intellij.markdown':              'yadjoshak.markdown-preview-enhanced',
  'org.jetbrains.plugins.debugger':     'msjsdiag.debugger-for-chrome',
  'com.intellij.docker':                'ms-azuretools.vscode-docker',
  'org.jetbrains.plugins.docker':       'ms-azuretools.vscode-docker',
  'com.intellij.rest':                  'humao.rest-client',
  'net.golds.vscode-gitbox':           'andystone.gitbox',
  'com.intellij.sonarLint':            'SonarSource.sonarlint-vscode',
  'org.jetbrains.plugins.terminal':    'peshay.vscode-terminal',
  'com.intellij.spring':               'vmware.spring-boot-dashboard',
  'com.intellij.docker-compose':       'ms-azuretools.vscode-docker',
};

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AutoMatchedPlugin {
  jetbrainsId: string;
  vsCodeId: string;
  vsCodeExtension: ResolvedExtension;
}

export interface NeedsReviewPlugin {
  jetbrainsId: string;
  pluginName: string;
  candidates: ResolvedExtension[];
}

export interface NoEquivalentPlugin {
  jetbrainsId: string;
  pluginName: string;
}

export interface CrossIDEResolutionResult {
  autoMatched: AutoMatchedPlugin[];
  needsReview: NeedsReviewPlugin[];
  noEquivalent: NoEquivalentPlugin[];
}

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a list of JetBrains plugins to their VS Code equivalents.
 *
 * Strategy per plugin:
 *   1. If the plugin ID is in KNOWN_MAPPINGS, confirm the VS Code extension
 *      exists on the target marketplace → autoMatched.
 *   2. Otherwise, search the target marketplace by the plugin's display name:
 *        • 0 hits  → noEquivalent
 *        • 1 hit   → autoMatched
 *        • 2+ hits → needsReview (user picks)
 */
export async function resolveJetBrainsToVSCode(
  plugins: InstalledExtension[],
  targetMarketplace: MarketplaceType
): Promise<CrossIDEResolutionResult> {
  const client = getMarketplaceClient(targetMarketplace);

  const autoMatched: AutoMatchedPlugin[] = [];
  const needsReview: NeedsReviewPlugin[] = [];
  const noEquivalent: NoEquivalentPlugin[] = [];

  for (const plugin of plugins) {
    const knownVsCodeId = KNOWN_MAPPINGS[plugin.id];

    if (knownVsCodeId) {
      // Confirm it exists on the target marketplace
      const resolved = await client.queryExtensionById(knownVsCodeId);
      if (resolved) {
        autoMatched.push({
          jetbrainsId: plugin.id,
          vsCodeId: knownVsCodeId,
          vsCodeExtension: resolved,
        });
        continue;
      }
      // Mapping exists but extension not found on marketplace — fall through to search
    }

    // Search marketplace by plugin display name
    const searchName = plugin.displayName || plugin.name;
    const candidates = await client.searchExtensions(searchName, { limit: 5 });

    if (candidates.length === 0) {
      noEquivalent.push({ jetbrainsId: plugin.id, pluginName: searchName });
    } else if (candidates.length === 1) {
      autoMatched.push({
        jetbrainsId: plugin.id,
        vsCodeId: candidates[0].id,
        vsCodeExtension: candidates[0],
      });
    } else {
      needsReview.push({
        jetbrainsId: plugin.id,
        pluginName: searchName,
        candidates,
      });
    }
  }

  return { autoMatched, needsReview, noEquivalent };
}
