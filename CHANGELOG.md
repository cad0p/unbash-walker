# Changelog

All notable changes to `@cad0p/unbash-walker` are documented in this file.

## [0.1.0] — 2026-08-10

### Added

- First public npm release (`@cad0p/unbash-walker@0.1.0`), published from the standalone repo (post-monorepo-split).

## [Unreleased]

### Added

- `getSubcommandWords(ref, options?)` — argv-structured subcommand extraction: returns the subcommand token run of a multi-command binary (up to `depth` positionals) or `null`, skipping flag tokens and caller-declared value-consuming flags by position. Position policy is a per-binary property with a survey-backed, overridable default table (`DEFAULT_POSITION_POLICIES`); only `globals-after-only` binaries reject leading-global-flag shapes.
- `bundleContains(word, letter)` — short-flag bundle expansion over one word; body cut at the first `=`, long options never match, glued values over-match by documented design.

### Changed

- `cwdTracker`'s git modifier now locates the subcommand boundary via the shared `locateSubcommandStart` primitive instead of a hand-rolled stop condition — behavior identical, all existing pins green.

Split out of the cad0p/pi-steering monorepo into its own repository (2026-08-10). Pre-publish package (0.0.0-poc.0).
