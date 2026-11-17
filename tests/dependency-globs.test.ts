import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);

test("installed glob matchers bound the repeated-extglob ReDoS regression", () => {
  // Check both consumers: micromatch previously loaded v2, tinyglobby loaded v4.
  // Isolate adversarial matching so a vulnerable dependency fails by timeout.
  const matchers = new Set(
    ["micromatch", "tinyglobby"].map((consumer) =>
      createRequire(require.resolve(consumer)).resolve("picomatch"),
    ),
  );
  for (const matcher of matchers) {
    execFileSync(
      process.execPath,
      [
        "-e",
        `const assert = require('node:assert/strict');
         const pm = require(process.argv[1]);
         for (const [pattern, input] of [
           ['+(*a)', 'a'.repeat(80) + 'b'],
           ['+(*)', 'a'.repeat(80) + '/'],
           ['*(*)', 'a'.repeat(80) + '/'],
           ['+(*a).js', 'a'.repeat(80) + 'b.js'],
         ]) assert.equal(pm.isMatch(input, pattern), false, pattern);
         assert.equal(pm.isMatch('aaaa', '+(*a)'), true);
         assert.equal(pm.isMatch('src/page.tsx', '**/*.{ts,tsx}'), true);`,
        matcher,
      ],
      { timeout: 5000, stdio: "pipe" },
    );
  }
});

test("lint glob consumers retain file discovery, braces, extglobs and exclusions", async () => {
  const micromatch = require("micromatch");
  const fastGlob = require("fast-glob");
  const { glob } = require("tinyglobby");
  const files = [
    "src/app/page.tsx",
    "src/app/sign-in/page.tsx",
    "src/lib/security.ts",
    "src/lib/security.test.ts",
    "scripts/check.mjs",
    "node_modules/fixture/index.ts",
  ];
  const expected = files.slice(0, 3).sort();
  assert.deepEqual(
    micromatch(files, ["src/**/*.{ts,tsx}", "!**/*.test.ts"]).sort(),
    expected,
  );
  assert.deepEqual(
    micromatch(files, "src/**/+(page|security).{ts,tsx}").sort(),
    expected,
  );
  const cwd = await mkdtemp(join(tmpdir(), "lostlink-globs-"));
  try {
    for (const file of files) {
      const path = join(cwd, file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, "// synthetic discovery fixture\n");
    }
    const options = { cwd, ignore: ["**/*.test.ts", "**/node_modules/**"] };
    assert.deepEqual(
      fastGlob.sync("**/*.{ts,tsx}", options).sort(),
      expected,
    );
    assert.deepEqual((await glob("**/*.{ts,tsx}", options)).sort(), expected);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
