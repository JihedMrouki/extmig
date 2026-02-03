# extmig

> Synchronize VS Code extensions across VS Code-based IDEs using different marketplaces

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## What is extmig?

**extmig** is a cross-platform developer tool that helps you **scan, compare, and synchronize VS Code extensions** across multiple VS Code-based IDEs — even when those IDEs rely on **different extension marketplaces**.

Think of it as:

> **“git diff + install” for VS Code extensions across IDE ecosystems**

---

## Why does this exist?

The VS Code ecosystem is fragmented:

- **VS Code** uses the **Microsoft Marketplace**
- **VSCodium, Code-OSS, AntiGravity**, and others use **Open VSX**
- Not all extensions exist on both marketplaces
- Managing multiple IDEs quickly becomes inconsistent and manual

There is currently **no reliable way** to:
- audit extension differences
- understand marketplace availability
- safely synchronize extensions across IDEs

**extmig exists to solve exactly that.**

---

## What does extmig do?

extmig gives you **visibility and control**, not hidden automation.

It allows you to:

- 🔍 **Scan** installed extensions from any VS Code-based IDE
- 🧠 **Understand availability** across marketplaces (Microsoft ↔ Open VSX)
- 📊 **Diff** extension sets between IDEs
- 🔄 **Sync** compatible extensions with dry-run support
- 📦 **Export / import** extension lists for portability
- 🧾 **Clearly report** missing, incompatible, or unavailable extensions

Nothing is installed silently.  
Nothing is hidden from the user.

---

## Supported IDEs (initial focus)

- Visual Studio Code
- VSCodium
- Code-OSS
- Other VS Code-based IDEs with a CLI interface

> extmig relies only on official IDE CLIs and filesystem inspection — no IDE internals are modified.

---

## Core principles

- **CLI-first** – scriptable, explicit, automation-friendly
- **Stateless by default** – always scan fresh, no hidden cache
- **Non-invasive** – no IDE internals touched
- **Explainable** – clear output and reporting
- **Cross-platform** – Windows, macOS, Linux

---

## Example usage

```bash
# Scan installed extensions
extmig scan

# Compare extensions between IDEs
extmig diff vscode vscodium

# Preview a sync (dry-run by default)
extmig sync vscode vscodium --dry-run

# Perform the sync
extmig sync vscode vscodium

# Export extensions to a file
extmig export extensions.json

# Import extensions into a target IDE
extmig import extensions.json --target vscodium
