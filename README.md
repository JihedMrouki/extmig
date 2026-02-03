# extmig

> Synchronize VS Code extensions across VS Code-based IDEs using different marketplaces

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## What is extmig?

**extmig** is a cross-platform tool that helps you **scan, compare, and synchronize VS Code extensions** across multiple VS Code-based IDEs — even when those IDEs rely on **different extension marketplaces**.

Think of it as:

> **“git diff + install” for VS Code extensions across IDE ecosystems**

---

## Why does this exist?

The VS Code ecosystem is fragmented:

- **VS Code** uses the **Microsoft Marketplace**
- **VSCodium, Code-OSS, Cursor, AntiGravity**, and others use **Open VSX**
- Not all extensions exist on both marketplaces
- Managing extensions across multiple IDEs is manual and error-prone

There has been **no reliable way** to:

- audit extension differences
- understand marketplace availability
- safely synchronize extensions across IDEs

**extmig exists to solve exactly that — transparently and safely.**

---

## What does extmig do?

extmig focuses on **visibility and control**, not hidden automation.

It allows you to:

- 🔍 **Scan** installed extensions from VS Code–based IDEs
- 🧠 **Check availability** across marketplaces (Microsoft ↔ Open VSX)
- 📊 **Diff** extension sets between IDEs
- 🔄 **Sync** compatible extensions (dry-run by default)
- 📦 **Export / import** extension lists for portability
- 🧾 **Clearly report** missing, incompatible, or unavailable extensions

Nothing is installed silently.  
Nothing is hidden from the user.

---

## Supported IDEs

- Visual Studio Code (`vscode`)
- VSCodium (`vscodium`)
- Cursor (`cursor`)
- Code-OSS (`code-oss`)
- AntiGravity (`antigravity`)

> extmig relies only on official IDE CLIs and filesystem inspection.  
> No IDE internals are modified.

---

## Core principles

- **CLI-first** – scriptable, explicit, automation-friendly
- **Stateless by default** – always scan fresh
- **Non-invasive** – no IDE internals touched
- **Explainable** – clear output and reporting
- **Cross-platform** – Windows, macOS, Linux

---

## Usage

### Interactive mode (recommended)

```bash
extmig
```
