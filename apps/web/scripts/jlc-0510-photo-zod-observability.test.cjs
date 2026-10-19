const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { z } = require("zod");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const observability = read("src", "features", "ai", "photo", "plate-region-observability.ts");
const vision = read("src", "features", "ai", "photo", "plate-region-vision.ts");
const provider = read("src", "features", "ai", "providers", "openai-provider.ts");
const safeLogger = read("src", "lib", "observability", "safe-logger.ts");

assert.match(vision, /logPlateRegionZodFailure\("normalized_image_input", error, metadata\)/);
assert.match(provider, /logPlateRegionZodFailure\("openai_plate_output", error, getNormalizedImageMetadata\(request\.image, request\.requestId\)\)/);
assert.match(vision, /logPlateRegionZodFailure\("normalized_plate_regions", error, metadata\)/);

for (const field of ["validation_boundary", "zod_issue_count", "issue_fields", "issue_code", "issue_category", "normalized_image_width", "normalized_image_height", "normalized_byte_length", "normalized_mime_type", "correlation_id"]) {
  assert.match(observability, new RegExp(field));
}
assert.match(observability, /error\.issues/);
assert.doesNotMatch(observability, /issue\.message|issue\.received|JSON\.stringify|providerPayload|imageDataUrl|base64|OPENAI_API_KEY|prompt|exif/i);
assert.doesNotMatch(observability, /bytes\s*:/);
assert.match(observability, /safeIssuePath/);
assert.match(observability, /issueCategory/);

function compile(source, resolve) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "require", "module", output)(compiledModule.exports, resolve, compiledModule);
  return compiledModule.exports;
}

const safeLoggerModule = compile(safeLogger, (id) => id === "server-only" ? {} : require(id));
const observabilityModule = compile(observability, (id) => {
  if (id === "server-only") return {};
  if (id === "zod") return require("zod");
  if (id === "@/lib/observability/safe-logger") return safeLoggerModule;
  return require(id);
});

const schema = z.object({ plates: z.array(z.object({ x: z.number().min(0) })) }).strict();
let output = "";
const originalWarn = console.warn;
console.warn = (value) => { output = value; };
for (const boundary of ["normalized_image_input", "openai_plate_output", "normalized_plate_regions"]) {
  const error = schema.safeParse({ plates: [{ x: "raw-provider-payload-base64-image-data" }] }).error;
  assert.equal(observabilityModule.logPlateRegionZodFailure(boundary, error, { mimeType: "image/webp", width: 1200, height: 800, byteLength: 12345, correlationId: "request-correlation" }), true);
  assert.match(output, new RegExp(boundary));
  assert.match(output, /zod_issue_count/);
  assert.match(output, /issue_fields/);
  assert.match(output, /issue_code/);
  assert.match(output, /issue_category/);
  assert.doesNotMatch(output, /raw-provider-payload|base64-image-data/);
}
console.warn = originalWarn;

console.log("JLC-0510 safe photo Zod observability contract passed");
