const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const contract = read("src", "features", "ai", "moderation", "image-moderation.ts");
const provider = read("src", "features", "ai", "providers", "provider.ts");
const local = read("src", "features", "ai", "providers", "local-provider.ts");
const openai = read("src", "features", "ai", "providers", "openai-provider.ts");
const runtime = read("src", "features", "ai", "moderation", "listing-image-moderation-runtime.ts");
const plate = read("src", "lib", "media", "sanitized-photo-pipeline.ts");
const deterministic = read("src", "features", "ai", "moderation", "image-moderation-deterministic.ts")
  .replace('import "server-only";\n', "")
  .replace(/import \{ imageModerationOutputSchema, type ImageModerationProviderInput \} from "\.\/image-moderation";\n/, "");
const c1 = read("..", "..", "supabase", "migrations", "20260929135207_ai_01g_c_multimodal_moderation_signal_contract.sql");

for (const code of ["CONTACT_IN_IMAGE", "QR_CODE_PRESENT", "LOW_QUALITY_IMAGE", "POSSIBLE_VISIBLE_DAMAGE"]) {
  assert.match(contract, new RegExp(`"${code}"`));
  assert.match(c1, new RegExp(`'${code}'`));
}
for (const evidence of ["[contact-overlay]", "[qr-present]", "[low-quality-image]", "[possible-visible-damage]"]) assert.match(contract, new RegExp(evidence.replace(/[\[\]]/g, "\\$&")));
for (const fixture of ["clean", "contact", "qr", "low_quality", "damage", "contact_qr", "malformed", "unavailable"]) assert.match(contract + local, new RegExp(`"${fixture}"`));
assert.match(provider, /moderateListingImage/);
assert.match(openai, /getAiModel\("VISION"/);
assert.match(openai, /zodResponseFormat\(imageModerationOutputSchema/);
assert.match(openai, /Never transcribe OCR, phone numbers, handles, URLs, QR payloads, plates, or prose/);
assert.match(contract, /max\(imageModerationCodes\.length\)/);
assert.match(contract, /LOW_QUALITY_IMAGE.*ask_edit/s);
assert.match(runtime, /MAX_LISTING_IMAGE_MODERATION_IMAGES = 12/);
assert.match(runtime, /processed_status.*processed.*blur_status.*blurred/s);
assert.match(runtime, /trustedSanitizedStorage\.download/);
assert.match(runtime, /eq\("seller_id", authenticated\.userId\)/);
assert.match(runtime, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(runtime, /media_id|raw_response|provider_payload|base64|signedUrl|\.update\(/i);
assert.doesNotMatch(contract + openai, /POSSIBLE_DUPLICATE_IMAGE|POSSIBLE_VEHICLE_MISMATCH|PRICE_ANOMALY|raw_response|provider_payload|createSignedUrl|storage\.objects/i);
assert.match(plate, /SANITIZED_PHOTO_PLATE_CONFIDENCE_THRESHOLD = 0/);
const compile = (source, bindings) => {
  const module = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("exports", "module", ...Object.keys(bindings), output)(module.exports, module, ...Object.values(bindings));
  return module.exports;
};
const imageModerationOutputSchema = { parse(value) {
  const evidence = { CONTACT_IN_IMAGE: "[contact-overlay]", QR_CODE_PRESENT: "[qr-present]", LOW_QUALITY_IMAGE: "[low-quality-image]", POSSIBLE_VISIBLE_DAMAGE: "[possible-visible-damage]" };
  assert.ok(value.signals.length <= 4);
  for (const signal of value.signals) assert.equal(signal.evidence, evidence[signal.code]);
  return value;
} };
const { moderateListingImageDeterministically } = compile(deterministic, { imageModerationOutputSchema });
const input = (testFixture) => ({ mediaId: "00000000-0000-0000-0000-000000000001", schemaVersion: "test", testFixture, image: { mimeType: "image/webp", bytes: new Uint8Array([1]) } });
assert.deepEqual(moderateListingImageDeterministically(input("clean")).signals, []);
assert.equal(moderateListingImageDeterministically(input("contact")).signals[0].code, "CONTACT_IN_IMAGE");
assert.equal(moderateListingImageDeterministically(input("qr")).signals[0].code, "QR_CODE_PRESENT");
assert.equal(moderateListingImageDeterministically(input("low_quality")).signals[0].recommendedAction, "ask_edit");
assert.equal(moderateListingImageDeterministically(input("damage")).signals[0].code, "POSSIBLE_VISIBLE_DAMAGE");
assert.equal(moderateListingImageDeterministically(input("contact_qr")).signals.length, 2);
assert.throws(() => moderateListingImageDeterministically(input("unavailable")), /unavailable/);
console.log("AI-01G-C2A image moderation contract passed");
