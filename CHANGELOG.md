# Changelog

All notable changes to this project will be documented in this file.

## [calver-released]

<!-- USER-EDITABLE SECTION START -->
<!-- Add your curated release notes here. -->
<!-- USER-EDITABLE SECTION END -->

### 🚀 Features

- ResolveWordText — text-mode word resolution with process-substitution inner expansion (closes #5)
- GetSubcommandWords + bundleContains — argv-structured subcommand extraction (closes #8)
- Expose subcommand boundary metadata via SubcommandRun (closes #12)
- Export expandTildeIfLeading from the barrel (closes #20)

### 🐛 Bug Fixes

- *(env)* Tilde expansion in assignment RHS (VAR=~/x) (closes #13)
- *(env)* Raw-text tilde gate for unbash v4 (closes #16)

### 🚜 Refactor

- Trust upstream Word.value, drop dead ?? text fallbacks (closes #10)

### ⚙️ Miscellaneous Tasks

- Upgrade unbash ^3.0.0 → ^4.0.11 (closes #11)


## [0.1.0] — 2026-08-10

### Added

- First public npm release (`@cad0p/unbash-walker@0.1.0`), published from the standalone repo (post-monorepo-split).

## [Unreleased]

Split out of the cad0p/pi-steering monorepo into its own repository (2026-08-10). Pre-publish package (0.0.0-poc.0).
