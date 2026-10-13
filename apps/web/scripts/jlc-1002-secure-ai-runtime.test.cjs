const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const route = read("src", "app", "api", "ai", "assistant", "route.ts");
const actor = read("src", "features", "ai", "services", "actor.ts");
const context = read("src", "features", "ai", "services", "server-context.ts");
const redaction = read("src", "features", "ai", "services", "redaction.ts");
const schemas = read("src", "features", "ai", "schemas.ts");
const tools = read("src", "features", "ai", "tools", "registry.ts");
const rateLimit = read("src", "features", "ai", "services", "rate-limit.ts");
const config = read("src", "features", "ai", "config.ts");

// Actor identity is derived from a verified Supabase token, never a browser payload field.
assert.match(route, /deriveAiActor\(request\.headers\.get\("authorization"\)/);
assert.match(actor, /supabase\.auth\.getUser\(\)/);
assert.doesNotMatch(actor, /request\.json|userId:\s*.*payload/i);

// Outbound listing context is rebuilt from the canonical public projection and redacted.
assert.match(context, /getListingDetails\(listingId\)/);
assert.match(context, /redactAiOutboundText\(row\.title/);
assert.match(context, /redactAiOutboundText\(row\.description/);
assert.match(redaction, /\[redacted\]/);
assert.match(redaction, /authorization\|bearer\|service_role/);

// Tool and provider contracts reject unstructured input/output and private tool names.
assert.match(schemas, /aiToolRequestSchema = z\.object/);
assert.match(schemas, /aiProviderResponseSchema = z\.object/);
assert.match(schemas, /\.strict\(\)/);
assert.match(tools, /Record<AiTool\["name"\], AiTool>/);
assert.match(tools, /search.*listing.*catalog.*video/s);
assert.doesNotMatch(tools, /seller.?contact|saved.?search|service_role|rpc\(/i);

// Cost/rate limiting is present and external traffic is unavailable without a distributed limiter.
assert.match(rateLimit, /actor\.kind === "guest" \? 10 : 30/);
assert.match(rateLimit, /NODE_ENV === "production" && process\.env\.AI_PROVIDER === "openai"/);
assert.match(config, /AI_DISTRIBUTED_RATE_LIMIT_ENABLED === "true"/);

console.log("JLC-1002 secure AI runtime contract passed");
