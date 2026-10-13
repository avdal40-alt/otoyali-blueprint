const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const runtime = read("src", "features", "ai", "sell", "sell-runtime.ts");
const route = read("src", "app", "api", "ai", "sell", "route.ts");
const assistant = read("src", "app", "sell", "_components", "ListingDescriptionAssistant.tsx");
const wizard = read("src", "app", "sell", "_components", "SellWizard.tsx");

assert.match(route, /requireAuthenticatedRequestSupabase/, "description generation requires an authenticated server request");
assert.match(runtime, /actionSchema = z\.enum\([\s\S]*generate_description[\s\S]*apply_description/, "runtime has explicit generation and apply actions");
assert.match(runtime, /descriptionPreview: z\.string\(\)\.trim\(\)\.max\(maxDescriptionLength\)/, "applied description is length-bounded");
assert.match(runtime, /canGenerateDescription\(draft\)/, "generation requires a minimum structured vehicle context");
assert.match(runtime, /if \(!isSafeDescription\(preview\)\)/, "generated output is safety-validated server-side");
assert.match(runtime, /isSafeDescription\(request\.descriptionPreview\)/, "applied output is safety-validated server-side");
assert.match(runtime, /phone|whatsapp|telegram/, "contact-sharing output is rejected");
assert.match(assistant, /action: "generate_description"/, "wizard invokes only the explicit generate action");
assert.match(assistant, /<Textarea[^>]*value=\{preview\}/, "generated draft is editable before apply");
assert.match(assistant, /onApply\(preview\)/, "applying the draft is an explicit owner action");
assert.match(wizard, /<ListingDescriptionAssistant/, "normal listing wizard exposes the completed description flow");
assert.doesNotMatch(assistant, /confirm_create|confirm_submit|fetch\([^)]*\/api\/listings/, "description assistance cannot publish or save a listing");

console.log("JLC-1005 AI listing description assistance contract passed");
