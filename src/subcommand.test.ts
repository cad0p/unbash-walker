// SPDX-License-Identifier: MIT
// Tests for subcommand extraction (issue #8). Part of unbash-walker.
//
// Covers `getSubcommandWords` (acceptance bullets from the issue), the
// internal boundary primitive `locateSubcommandStart`, and
// `bundleContains`. Every value-trap test pins BOTH sides of the
// caller-declares-arity contract: a declared consuming flag hides its
// value from the scan; an undeclared one lets the value leak through —
// pinned as documented known-limitation (garbage-in contract, not a bug).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Word } from "unbash";
import { parse as parseBash } from "unbash";
import { extractAllCommandsFromAST } from "./extract.ts";
import {
  bundleContains,
  DEFAULT_POSITION_POLICIES,
  getSubcommandWords,
  locateSubcommandStart,
} from "./subcommand.ts";
import type { CommandRef } from "./types.ts";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Parse `raw` and return its first extracted CommandRef. */
function refOf(raw: string): CommandRef {
  const refs = extractAllCommandsFromAST(parseBash(raw), raw);
  const first = refs[0];
  if (!first) throw new Error(`no command extracted from: ${raw}`);
  return first;
}

/** Quote-aware projection of a word run — what callers compare against. */
function texts(words: readonly Word[] | null): string[] | null {
  return words === null ? null : words.map((w) => w.value ?? w.text);
}

/** Suffix word at `i` of the first command in `raw`. */
function suffixWord(raw: string, i: number): Word {
  const words = refOf(raw).node.suffix;
  const w = words[i];
  if (!w) throw new Error(`no suffix word ${i} in: ${raw}`);
  return w;
}

describe("getSubcommandWords", () => {
  describe("acceptance: gh (globals-anywhere)", () => {
    it('gh -R x/y pr merge, depth=1 → ["pr"] (-R declared consuming)', () => {
      const got = getSubcommandWords(refOf("gh -R x/y pr merge"), {
        valueConsumingFlags: ["-R"],
      });
      assert.deepEqual(texts(got), ["pr"]);
    });

    it('gh -R x/y pr merge, depth=2 → ["pr","merge"]', () => {
      const got = getSubcommandWords(refOf("gh -R x/y pr merge"), {
        depth: 2,
        valueConsumingFlags: ["-R"],
      });
      assert.deepEqual(texts(got), ["pr", "merge"]);
    });

    it("no options: defaults kick in (depth=1, table policy)", () => {
      const got = getSubcommandWords(refOf("gh -R x/y pr merge"), {
        valueConsumingFlags: ["-R"],
      });
      assert.deepEqual(texts(got), ["pr"]);
    });
  });

  describe("acceptance: git (globals-before-only)", () => {
    it('git -C /path push → ["push"] (-C consumes /path)', () => {
      const got = getSubcommandWords(refOf("git -C /path push"), {
        valueConsumingFlags: ["-C"],
      });
      assert.deepEqual(texts(got), ["push"]);
    });

    it('git push -C x → ["push"] (post-subcommand flags are plain args)', () => {
      const got = getSubcommandWords(refOf("git push -C x"), {
        valueConsumingFlags: ["-C"],
      });
      assert.deepEqual(texts(got), ["push"]);
    });

    it("full-path binary keys the table by basename: /usr/bin/git", () => {
      const got = getSubcommandWords(refOf("/usr/bin/git -C /path push"), {
        valueConsumingFlags: ["-C"],
      });
      assert.deepEqual(texts(got), ["push"]);
      const post = getSubcommandWords(refOf("/usr/bin/git push -C x"), {
        valueConsumingFlags: ["-C"],
      });
      assert.deepEqual(texts(post), ["push"]);
    });
  });

  describe("acceptance: after-only impossibility", () => {
    it("go -v build → null (invalid shape by definition)", () => {
      assert.equal(texts(getSubcommandWords(refOf("go -v build"))), null);
    });

    it('go build → ["build"] (no leading flag, fine)', () => {
      assert.deepEqual(texts(getSubcommandWords(refOf("go build"))), ["build"]);
    });

    it('terraform apply -input=false → ["apply"] (post-sub flags are args)', () => {
      assert.deepEqual(
        texts(getSubcommandWords(refOf("terraform apply -input=false"))),
        ["apply"],
      );
    });
  });

  describe("acceptance: noun-verb depth", () => {
    it('aws s3 ls, depth=2 → ["s3","ls"]', () => {
      assert.deepEqual(
        texts(getSubcommandWords(refOf("aws s3 ls"), { depth: 2 })),
        ["s3", "ls"],
      );
    });

    it("unknown binary falls back to globals-anywhere", () => {
      assert.deepEqual(texts(getSubcommandWords(refOf("mytool --flag sub"))), [
        "sub",
      ]);
    });
  });

  describe("value traps: caller-declares-arity contract", () => {
    it("git -m push with -m DECLARED → null (value consumed, nothing left)", () => {
      const got = getSubcommandWords(refOf("git -m push"), {
        valueConsumingFlags: ["-m"],
      });
      assert.equal(texts(got), null);
    });

    it('git -m push UNDECLARED → ["push"] (pinned known-limitation)', () => {
      // Garbage-in contract: without the declaration the walker cannot know
      // -m consumes. The leaked value is documented behavior, not a bug.
      assert.deepEqual(texts(getSubcommandWords(refOf("git -m push"))), [
        "push",
      ]);
    });

    it('git commit -m push with -m DECLARED → ["commit"] (scan already stopped)', () => {
      // The boundary lands on the first positional; -m sits after it, so
      // declaring it changes nothing here — extraction stays correct.
      const got = getSubcommandWords(refOf("git commit -m push"), {
        valueConsumingFlags: ["-m"],
      });
      assert.deepEqual(texts(got), ["commit"]);
    });

    it('same shape depth=2 DECLARED → partial run ["commit"], not padded', () => {
      const got = getSubcommandWords(refOf("git commit -m push"), {
        depth: 2,
        valueConsumingFlags: ["-m"],
      });
      assert.deepEqual(texts(got), ["commit"]);
    });

    it('gh -R pr merge with -R DECLARED → ["merge"] ("pr" never extracted)', () => {
      const got = getSubcommandWords(refOf("gh -R pr merge"), {
        valueConsumingFlags: ["-R"],
      });
      assert.deepEqual(texts(got), ["merge"]);
    });

    it('gh -R pr merge UNDECLARED → ["pr"] (pinned known-limitation)', () => {
      assert.deepEqual(texts(getSubcommandWords(refOf("gh -R pr merge"))), [
        "pr",
      ]);
    });

    it('quoted "pr" value resolves via .value and is consumed', () => {
      const got = getSubcommandWords(refOf('gh -R "pr" merge'), {
        valueConsumingFlags: ["-R"],
      });
      assert.deepEqual(texts(got), ["merge"]);
    });

    it('quoted "-v" still classifies flag-shaped via .value', () => {
      assert.deepEqual(texts(getSubcommandWords(refOf('gh "-v" pr'))), ["pr"]);
    });

    it('quoted "pr" positional extracts via .value (quote-awareness symmetric)', () => {
      assert.deepEqual(texts(getSubcommandWords(refOf('gh "pr" merge'))), [
        "pr",
        "merge",
      ]);
    });

    it('--repo=x/y attached form: one token, "pr" extracted', () => {
      const got = getSubcommandWords(refOf("gh --repo=x/y pr"));
      assert.deepEqual(texts(got), ["pr"]);
    });

    it('-Rebased lookalike is flag-shaped: gh -Rebased onto main → ["onto"]', () => {
      assert.deepEqual(
        texts(getSubcommandWords(refOf("gh -Rebased onto main"))),
        ["onto"],
      );
    });
  });

  describe("motivating shapes (the #13154 failure class)", () => {
    it('gh --hostname h pr merge, DECLARED, depth=2 → ["pr","merge"]', () => {
      const got = getSubcommandWords(refOf("gh --hostname h pr merge"), {
        depth: 2,
        valueConsumingFlags: ["--hostname"],
      });
      assert.deepEqual(texts(got), ["pr", "merge"]);
    });

    it('UNDECLARED → ["h"] (flag value as subcommand — pinned limitation)', () => {
      assert.deepEqual(
        texts(getSubcommandWords(refOf("gh --hostname h pr merge"))),
        ["h"],
      );
    });

    it('aws s3 --profile x ls depth=2 DECLARED --profile → ["s3","ls"]', () => {
      const got = getSubcommandWords(refOf("aws s3 --profile x ls"), {
        depth: 2,
        valueConsumingFlags: ["--profile"],
      });
      assert.deepEqual(texts(got), ["s3", "ls"]);
    });

    it('aws s3 --profile x ls UNDECLARED → ["s3","x"] (pinned limitation)', () => {
      const got = getSubcommandWords(refOf("aws s3 --profile x ls"), {
        depth: 2,
      });
      assert.deepEqual(texts(got), ["s3", "x"]);
    });
  });

  describe("null semantics (deliberate conflation)", () => {
    it("all flags → null", () => {
      assert.equal(texts(getSubcommandWords(refOf("gh -v --no-pager"))), null);
    });

    it("trailing consuming flag → null (git -C)", () => {
      const got = getSubcommandWords(refOf("git -C"), {
        valueConsumingFlags: ["-C"],
      });
      assert.equal(texts(got), null);
    });

    it("no suffix at all → null (bare `git`)", () => {
      assert.equal(texts(getSubcommandWords(refOf("git"))), null);
    });

    it("depth > available positionals → partial run returned (gh pr, depth=2)", () => {
      assert.deepEqual(
        texts(getSubcommandWords(refOf("gh pr"), { depth: 2 })),
        ["pr"],
      );
    });

    it("nameless command (bare assignment) → null", () => {
      assert.equal(texts(getSubcommandWords(refOf("FOO=bar"))), null);
    });
  });

  describe("documented edge semantics", () => {
    it("`--` treated as flag-shaped (skipped); post-`--` semantics NOT modeled", () => {
      assert.deepEqual(texts(getSubcommandWords(refOf("gh -- pr merge"))), [
        "pr",
      ]);
    });

    it("$VAR values are NOT expanded (structural scan): taken literally", () => {
      assert.deepEqual(texts(getSubcommandWords(refOf("mytool $VAR sub"))), [
        "$VAR",
      ]);
    });

    it("$VAR consumed structurally when the caller declares the flag", () => {
      const got = getSubcommandWords(refOf("git -C $WS push"), {
        valueConsumingFlags: ["-C"],
      });
      assert.deepEqual(texts(got), ["push"]);
    });

    it("negative-number-looking tokens classify flag-shaped (-1)", () => {
      assert.deepEqual(texts(getSubcommandWords(refOf("mytool -1 sub"))), [
        "sub",
      ]);
    });

    it('caller override wins over the table: go -v build with anywhere → ["build"]', () => {
      const got = getSubcommandWords(refOf("go -v build"), {
        positionPolicy: "globals-anywhere",
      });
      assert.deepEqual(texts(got), ["build"]);
    });
  });

  describe("purity", () => {
    it("same ref twice → equal result", () => {
      const ref = refOf("gh -R x/y pr merge");
      const a = getSubcommandWords(ref, { valueConsumingFlags: ["-R"] });
      const b = getSubcommandWords(ref, { valueConsumingFlags: ["-R"] });
      assert.deepEqual(a, b);
    });

    it("does not mutate the ref", () => {
      const ref = refOf("git -C /path push");
      const before = ref.node.suffix.length;
      getSubcommandWords(ref, { valueConsumingFlags: ["-C"] });
      assert.equal(ref.node.suffix.length, before);
      assert.deepEqual(
        ref.node.suffix.map((w) => w.text),
        ["-C", "/path", "push"],
      );
    });
  });

  describe("DEFAULT_POSITION_POLICIES", () => {
    it("survey-backed entries", () => {
      assert.equal(DEFAULT_POSITION_POLICIES.git, "globals-before-only");
      assert.equal(DEFAULT_POSITION_POLICIES.go, "globals-after-only");
      assert.equal(DEFAULT_POSITION_POLICIES.terraform, "globals-after-only");
      assert.equal(DEFAULT_POSITION_POLICIES.gh, "globals-anywhere");
      assert.equal(DEFAULT_POSITION_POLICIES.kubectl, "globals-anywhere");
      assert.equal(DEFAULT_POSITION_POLICIES.aws, "globals-anywhere");
    });

    it("unknown binaries absent (fallback lives at the call site)", () => {
      assert.equal("mytool" in DEFAULT_POSITION_POLICIES, false);
    });
  });
});

describe("locateSubcommandStart", () => {
  it("boundary = index of first subcommand word (flags skipped by index)", () => {
    assert.equal(
      locateSubcommandStart(refOf("git -C /path push").node.suffix, {
        positionPolicy: "globals-before-only",
        valueConsumingFlags: ["-C"],
      }),
      2,
    );
  });

  it("boundary = 0 when the first token is already positional", () => {
    assert.equal(
      locateSubcommandStart(refOf("git push -C x").node.suffix, {
        positionPolicy: "globals-before-only",
        valueConsumingFlags: ["-C"],
      }),
      0,
    );
  });

  it("all flags → null (caller rebases to words.length)", () => {
    assert.equal(
      locateSubcommandStart(refOf("git -C /path").node.suffix, {
        positionPolicy: "globals-before-only",
        valueConsumingFlags: ["-C"],
      }),
      null,
    );
  });

  it("after-only invalid shape → null", () => {
    assert.equal(
      locateSubcommandStart(refOf("go -v build").node.suffix, {
        positionPolicy: "globals-after-only",
      }),
      null,
    );
  });

  it("noun-verb depth respected: aws s3 ls depth=2 → boundary 0", () => {
    assert.equal(
      locateSubcommandStart(refOf("aws s3 ls").node.suffix, {
        positionPolicy: "globals-anywhere",
        depth: 2,
      }),
      0,
    );
  });
});

describe("bundleContains", () => {
  it("-uf / f → true (bundle)", () => {
    assert.equal(bundleContains(suffixWord("git push -uf", 1), "f"), true);
    assert.equal(bundleContains(suffixWord("git push -uf", 1), "u"), true);
  });

  it("-f=x / f → true (= cut from body)", () => {
    assert.equal(bundleContains(suffixWord("cmd -f=x", 0), "f"), true);
  });

  it("-f=x / x → false (post-= never scanned)", () => {
    assert.equal(bundleContains(suffixWord("cmd -f=x", 0), "x"), false);
  });

  it("--force / f → false (long option, not a bundle)", () => {
    assert.equal(bundleContains(suffixWord("git push --force", 1), "f"), false);
  });

  it("--format=json / f → false (starts with --, value irrelevant)", () => {
    assert.equal(bundleContains(suffixWord("gh --format=json", 0), "f"), false);
  });

  it("-fx reports BOTH f and x (glued-value over-match, pinned + documented)", () => {
    const w = suffixWord("cmd -fx", 0);
    assert.equal(bundleContains(w, "f"), true);
    assert.equal(bundleContains(w, "x"), true);
  });

  it("-Rebased / R → true (lookalike shares bundle shape)", () => {
    assert.equal(
      bundleContains(suffixWord("gh -Rebased onto main", 0), "R"),
      true,
    );
  });

  it("non-single-char letter → false", () => {
    const w = suffixWord("git push -uf", 1);
    assert.equal(bundleContains(w, ""), false);
    assert.equal(bundleContains(w, "fo"), false);
  });

  it("non-bundle words → false (bare dash, plain word)", () => {
    assert.equal(bundleContains(suffixWord("cmd -", 0), "f"), false);
    assert.equal(bundleContains(suffixWord("cmd file.txt", 0), "f"), false);
  });

  it('quote-aware: "-uf" resolves via .value', () => {
    assert.equal(bundleContains(suffixWord('cmd "-uf"', 0), "u"), true);
  });
});
