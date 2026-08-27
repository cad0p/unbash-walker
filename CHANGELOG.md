# Changelog

All notable changes to `@cad0p/unbash-walker` are documented in this file.

## [Unreleased]

### Fixed

- Tilde expansion in assignment RHS: `VAULT=~/x` now stores the HOME-expanded path (matches bash; quoted `"~/x"` stays literal). Fixes downstream predicate path validation and `cd "$D"` cwd tracking (issue #13).

## [0.1.0] — 2026-08-10

### Added

- First public npm release (`@cad0p/unbash-walker@0.1.0`), published from the standalone repo (post-monorepo-split).
- Split out of the cad0p/pi-steering monorepo into its own repository (2026-08-10). Pre-publish package (0.0.0-poc.0).
