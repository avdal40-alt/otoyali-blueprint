const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const executablePatterns = [
  /supabase\s*\(\s*["']db["']\s*,\s*["']reset["']/i,
  /(?:npx(?:\.cmd)?\s+)?supabase(?:\.cmd)?\s+db\s+reset\b/i,
  /db\s+reset\s+--local\b/i
];
const visited = new Set();
const scripts = new Set();

function visit(name) {
  if (visited.has(name)) return;
  visited.add(name);
  const command = packageJson.scripts[name];
  assert.equal(typeof command, "string", `JLC-1301 script dependency must exist: ${name}`);
  for (const nested of command.matchAll(/npm run ([\w:-]+)/g)) visit(nested[1]);
  for (const match of command.matchAll(/node scripts\/([\w.-]+\.cjs)/g)) scripts.add(match[1]);
}

visit("test:jlc-1301");
assert.ok(scripts.size > 1, "JLC-1301 must resolve its transitive script closure");

for (const script of scripts) {
  const source = fs.readFileSync(path.join(__dirname, script), "utf8");
  for (const pattern of executablePatterns) {
    assert.doesNotMatch(source, pattern, `${script} must not contain an executable local database reset path`);
  }
}

console.log("JLC-1301 reset-path guard passed");
