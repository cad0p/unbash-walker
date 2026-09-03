# Changelog

All notable changes to `@cad0p/unbash-walker` are documented in this file.

## [0.1.0] — 2026-08-10

### Added

- First public npm release (`@cad0p/unbash-walker@0.1.0`), published from the standalone repo (post-monorepo-split).

## [Unreleased]

### Added

- Subcommand boundary metadata (refs #12): `SubcommandRun` (`{indices, words, start}`, no `end`) via `locateSubcommandRun(words, opts)` (bare-words core, `positionPolicy` required — throws `TypeError` when missing/invalid) and `getSubcommandRun(ref, opts?)` (basename table lookup twin). Both project the shared subcommand scan; `locateSubcommandStart` now also throws on a missing/invalid policy (fail-closed for JS callers). Defined in `src/subcommand.ts`, not re-exported from the package root.

Split out of the cad0p/pi-steering monorepo into its own repository (2026-08-10). Pre-publish package (0.0.0-poc.0).
