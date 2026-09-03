// SPDX-License-Identifier: MIT
// Part of unbash-walker (internal helpers).

/**
 * Canonical read of a possibly-absent `Word`'s resolved value.
 * Upstream `unbash` declares `Word.value: string` non-optional, so a
 * present word's `.value` is read directly — no `?? text` fallback.
 * The `?.` survives only for the WORD itself, which may be absent
 * (optional `node.name`, `noUncheckedIndexedAccess` indexing).
 *
 * Not exported from the package root — callers outside
 * `unbash-walker/src/**` shouldn't depend on this helper (use
 * `resolveWord` for word-level resolution).
 */
import type { Word } from "unbash";

export function wordValue(w: Word | undefined): string | undefined {
  return w?.value;
}
