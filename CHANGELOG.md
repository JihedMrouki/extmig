# Changelog

## [Unreleased]

### Added - 2026-02-03

- **AntiGravity IDE Support** 🎉
  - Added AntiGravity to supported IDEs list
  - Auto-detection of AntiGravity installations
  - Extension scanning from `~/.antigravity/extensions`
  - CLI integration with `antigravity` command
  - Full support in all commands (list, scan, diff, sync, export, import)
  - Interactive mode integration (Auto & Manual modes)
  - See [ANTIGRAVITY-SUPPORT.md](ANTIGRAVITY-SUPPORT.md) for details

- **Enhanced Error Handling** 🛡️
  - **IDE Running Detection**: Automatically detects if target IDE is running before installation
  - **Automatic Retry**: Failed installations retry up to 2 times for transient errors
  - **Detailed Error Messages**: Specific reasons for each failure (timeout, not found, network)
  - **Troubleshooting Tips**: Actionable suggestions in installation summary
  - **Post-Installation Instructions**: Clear next steps after sync completes
  - **Interactive Warnings**: User can choose to close IDE or continue anyway
  - See [ERROR-HANDLING-IMPROVEMENTS.md](ERROR-HANDLING-IMPROVEMENTS.md) for details

### Improved - 2026-02-03
- Sync summary now shows specific error details for failed extensions
- Better timeout handling with exponential backoff retry
- Cross-platform IDE process detection (macOS, Linux, Windows)

## [0.1.0] - 2026-02-03

### Added
- **Interactive TUI** with two modes:
  - 🤖 Auto Mode - Fully automated migration
  - 👤 Manual Mode - Step-by-step walkthrough
- **Beautiful UI** with colors, spinners, and prompts
- **One-command installation** via `install-local.sh`
- **Project renamed** from extsync to extmig
- **Complete CLI** with 6 commands:
  - `list` - List available IDEs
  - `scan` - Scan extensions
  - `diff` - Compare IDEs
  - `sync` - Synchronize extensions
  - `export` - Export to JSON
  - `import` - Import from JSON

### Core Features (Phases 1-6)
- ✅ Phase 1: Core data model with Zod validation
- ✅ Phase 2: Cross-platform extension scanner
- ✅ Phase 3: Marketplace API integration (Open VSX + VS Code)
- ✅ Phase 4: Extension matching and diff engine
- ✅ Phase 5: CLI-based installer with dry-run mode
- ✅ Phase 6: Complete CLI interface

### Supported IDEs
- Visual Studio Code (`vscode`)
- VSCodium (`vscodium`)
- Cursor (`cursor`)
- Code-OSS (`code-oss`)
- AntiGravity (`antigravity`) - NEW!

### Dependencies
- `commander` - CLI framework
- `prompts` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Progress spinners
- `zod` - Schema validation

---

## Version History

- **v0.1.0** (2026-02-03) - Initial release with interactive mode
  - All 6 phases complete
  - 5 IDE support
  - Interactive TUI
  - One-command installation

---

**Current Version**: 0.1.0
**Status**: Production Ready ✅
