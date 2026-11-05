const { execFileSync } = require("node:child_process");

const expected = "2.115.0";
const executable = process.env.SUPABASE_CLI_BIN || "supabase";

try {
  const output = execFileSync(executable, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const match = output.match(/\b(\d+\.\d+\.\d+)\b/);
  if (!match || match[1] !== expected) {
    console.error(`Expected Supabase CLI ${expected}; received ${output || "an unreadable version"}.`);
    process.exitCode = 1;
  } else {
    console.log(`Supabase CLI ${expected} verified.`);
  }
} catch {
  console.error(`Could not execute ${executable}. Install Supabase CLI ${expected}, or set SUPABASE_CLI_BIN to its portable executable.`);
  process.exitCode = 1;
}
