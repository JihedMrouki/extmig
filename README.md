# extmig

> Scan, compare, and synchronize extensions across VS Code-based IDEs and JetBrains IDEs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-green.svg)](https://nodejs.org/)

---

## Demo

![extmig CLI demo](assets/extmig_gif.gif)

---

## What is extmig?

- CLI tool for scanning, comparing, and syncing IDE extensions
- Supports VS Code-based IDEs talking to each other (same extension ID space)
- Supports JetBrains → VS Code migration (different ID spaces, auto-translated)
- Dry-run by default — nothing installs until you explicitly say so

---

## Why does this exist?

- VS Code and Cursor use **Microsoft Marketplace**; VSCodium, Code-OSS, AntiGravity use **Open VSX** — not every extension exists on both
- JetBrains plugins use a completely different format (`META-INF/plugin.xml`, reverse-domain IDs) with no direct equivalent mapping to VS Code extensions
- No single tool previously handled scanning, availability checks, diffing, and installing across these boundaries

---

## Supported IDEs

### VS Code-based

| IDE                | Identifier    | Default Marketplace |
| ------------------ | ------------- | ------------------- |
| Visual Studio Code | `vscode`      | vscode              |
| Cursor             | `cursor`      | vscode              |
| VSCodium           | `vscodium`    | openvsx             |
| Code - OSS         | `code-oss`    | openvsx             |
| AntiGravity        | `antigravity` | openvsx             |

### JetBrains

| IDE            | Identifier      | Notes            |
| -------------- | --------------- | ---------------- |
| IntelliJ IDEA  | `intellij`      | Scan source only |
| Android Studio | `androidstudio` | Scan source only |

- Versioned config directories (e.g. `IntelliJIdea2024.3/plugins/`) are resolved automatically — latest version is picked

---

## Supported Marketplaces

| Marketplace           | Identifier  | Role                   |
| --------------------- | ----------- | ---------------------- |
| Microsoft Marketplace | `vscode`    | Query + install target |
| Open VSX Registry     | `openvsx`   | Query + install target |
| JetBrains (local)     | `jetbrains` | Scan source only       |

---

## Core principles

- **CLI-first** — scriptable, composable, automation-friendly
- **Dry-run by default** — `sync` simulates before it touches anything
- **Stateless** — every run scans fresh; no local cache to go stale
- **Non-invasive** — relies only on official IDE CLIs and filesystem inspection
- **Explainable** — every extension's status is reported explicitly
- **Cross-platform** — macOS, Linux, Windows
