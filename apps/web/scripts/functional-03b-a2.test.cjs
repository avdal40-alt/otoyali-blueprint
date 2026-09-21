const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const listRoute = read("src", "app", "api", "saved-searches", "route.ts");
const itemRoute = read("src", "app", "api", "saved-searches", "[id]", "route.ts");
const button = read("src", "components", "search", "SavedSearchButton.tsx");
const contract = read("src", "lib", "saved-search", "contract.ts");

for (const source of [listRoute, itemRoute]) {
  assert.match(source, /requireAuthenticatedRequest\(request\.headers\.get\("authorization"\)\)/, "private routes verify the bearer session");
  assert.match(source, /savedSearchResponseHeaders/, "private routes are no-store");
  assert.match(source, /schema\("marketplace"\)\.rpc/, "routes use only the owner-derived RPC facade");
}
assert.match(listRoute, /create_saved_search/, "create is routed through the A1 facade");
assert.match(listRoute, /list_own_saved_searches/, "list is routed through the A1 facade");
assert.match(itemRoute, /update_own_saved_search_metadata/, "metadata updates are routed through the A1 facade");
assert.match(itemRoute, /delete_own_saved_search/, "deletes are routed through the A1 facade");
assert.match(contract, /OT429/, "the max-five RPC error has a safe public mapping");
assert.match(listRoute, /legacyQueryParams/, "legacy rows have a safe display payload");
assert.match(listRoute, /isSavedSearchRequest/, "create accepts the canonical versioned request only");
assert.doesNotMatch(listRoute + itemRoute, /userId|ownerId|profileId/, "routes never accept a client-selected owner");
assert.match(button, /fetch\("\/api\/saved-searches"/, "SavedSearchButton calls the application API");
assert.match(button, /status === "saving"/, "SavedSearchButton preserves pending state");
assert.doesNotMatch(button, /from\("saved_searches"\)|\.insert\(/, "SavedSearchButton has no direct browser table mutation");

const clientFiles = [path.join(root, "src", "components"), path.join(root, "src", "app")];
for (const directory of clientFiles) {
  for (const entry of walk(directory)) {
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    const source = fs.readFileSync(entry, "utf8");
    assert.doesNotMatch(source, /\.from\(["']saved_searches["']\)/, `no direct saved-search table access remains in ${path.relative(root, entry)}`);
  }
}

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(target);
    else yield target;
  }
}

console.log("FUNCTIONAL-03B-A2 saved-search API and client migration contract passed");
