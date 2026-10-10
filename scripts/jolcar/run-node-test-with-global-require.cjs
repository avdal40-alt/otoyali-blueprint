/* Host verification shim for one historical CommonJS test harness.
   It intentionally does not load arbitrary code on its own; PowerShell validates
   the target as an existing apps/web/scripts JS file before invoking this file. */
"use strict";

if (process.argv.length !== 3) {
  console.error("Expected exactly one test-file argument.");
  process.exit(2);
}

global.require = require;
require(process.argv[2]);
