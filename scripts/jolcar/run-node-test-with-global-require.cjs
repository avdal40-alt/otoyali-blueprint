/* Host verification shim for one historical CommonJS test harness.
   PowerShell validates the target as an existing apps/web/scripts JS file
   before invoking this file. This file does not modify product/test sources. */
"use strict";

const path = require("path");
const { createRequire } = require("module");

if (process.argv.length !== 3) {
  console.error("Expected exactly one test-file argument.");
  process.exit(2);
}

const target = path.resolve(process.argv[2]);
const targetRequire = createRequire(target);

/*
 * The historical ai-01g-a harness compiles server-only source through
 * Function/eval, where CommonJS `require` is not lexical. Give that compiled
 * code a require function rooted at the task's apps/web tree.
 *
 * `server-only` is a framework marker, not runtime behavior under test here.
 * Stub ONLY that marker; delegate every other module to Node resolution rooted
 * at the real target test file.
 */
global.require = (id) => {
  if (id === "server-only") {
    return {};
  }
  return targetRequire(id);
};

targetRequire(target);
