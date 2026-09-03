// SPDX-License-Identifier: MIT
// Part of unbash-walker.
//
// Root-import pin for `expandTildeIfLeading` (issue #20): the helper
// must be importable from the package barrel, not just the deep path.
// Contract mirrors the deep-path pins in resolve-word.test.ts.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expandTildeIfLeading } from "./index.ts";

describe("expandTildeIfLeading (package root, issue #20)", () => {
  const HOME = new Map([["HOME", "/home/me"]]);

  it("~ → HOME", () => {
    assert.equal(expandTildeIfLeading("~", HOME), "/home/me");
  });

  it("~/x → $HOME/x", () => {
    assert.equal(expandTildeIfLeading("~/x", HOME), "/home/me/x");
  });

  it("~user unchanged", () => {
    assert.equal(expandTildeIfLeading("~user", HOME), "~user");
    assert.equal(expandTildeIfLeading("~alice/docs", HOME), "~alice/docs");
  });

  it("HOME absent → undefined (fail-closed)", () => {
    assert.equal(expandTildeIfLeading("~", new Map()), undefined);
    assert.equal(expandTildeIfLeading("~/x", new Map()), undefined);
  });

  it("non-~ input unchanged", () => {
    assert.equal(expandTildeIfLeading("plain", HOME), "plain");
    assert.equal(expandTildeIfLeading("/a/~", HOME), "/a/~");
    assert.equal(expandTildeIfLeading("", HOME), "");
  });
});
