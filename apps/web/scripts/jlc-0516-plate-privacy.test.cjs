const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const sharp = require("sharp");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const repo = path.resolve(root, "..", "..");
const pipelinePath = path.join(root, "src", "lib", "media", "sanitized-photo-pipeline.ts");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");

function loadPipeline() {
  const compiled = ts.transpileModule(read(pipelinePath), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const loaded = { exports: {} };
  const nodeRequire = Module.createRequire(pipelinePath);
  const requireForTest = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "@/features/ai/photo/plate-region-vision") return {};
    if (specifier === "@/features/ai/photo/plate-region-contract") return { PLATE_REGION_MAX_BYTES: 10 * 1024 * 1024 };
    return nodeRequire(specifier);
  };
  new Function("require", "module", "exports", compiled)(requireForTest, loaded, loaded.exports);
  return loaded.exports;
}

const { PrivacyProcessingError, decidePrivacyOutcome, expandPlateRedactionRegion, sanitizePrivatePhoto } = loadPipeline();
const plate = { x: 0.4, y: 0.4, width: 0.2, height: 0.1, confidence: 1 };

async function createFixture() {
  const width = 100;
  const height = 80;
  const pixels = Buffer.alloc(width * height * 3, 230);
  for (let y = 32; y < 40; y += 1) for (let x = 40; x < 60; x += 1) {
    const offset = (y * width + x) * 3;
    const dark = (x - 40) % 4 < 2;
    pixels[offset] = dark ? 0 : 250;
    pixels[offset + 1] = dark ? 0 : 250;
    pixels[offset + 2] = dark ? 0 : 250;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

function fakeVision(plates, readablePlateCount, captured) {
  return {
    detect: async (request) => { captured.normalized = request.image.bytes; return { plates }; },
    verify: async (request) => { captured.verified = request.image.bytes; return { readable_plate_count: readablePlateCount }; }
  };
}

async function rawPixels(bytes) { return sharp(bytes).raw().toBuffer({ resolveWithObject: true }); }
function pixel(data, width, x, y) { const offset = (y * width + x) * 3; return [data[offset], data[offset + 1], data[offset + 2]]; }

async function testOpaquePaddedRedaction() {
  const captured = {};
  const result = await sanitizePrivatePhoto({ bytes: await createFixture(), mimeType: "image/png", requestId: "fixture" }, fakeVision([plate], 0, captured));
  assert.equal(result.privacyOutcome, "blurred");
  assert.equal(result.telemetry.initialDetectionCount, 1);
  assert.equal(result.telemetry.compositedRegionCount, 1);
  const original = await rawPixels(captured.normalized);
  const sanitized = await rawPixels(result.variants.master);
  assert.deepEqual(expandPlateRedactionRegion({ left: 40, top: 32, width: 20, height: 8 }, 100, 80), { left: 36, top: 30, width: 28, height: 12 });
  const insideBefore = pixel(original.data, original.info.width, 46, 35);
  const insideAfter = pixel(sanitized.data, sanitized.info.width, 46, 35);
  assert.notDeepEqual(insideAfter, insideBefore);
  assert.ok(Math.max(...insideAfter) - Math.min(...insideAfter) < 8, "mask must be neutral across all channels");
  assert.ok(Math.abs(insideAfter[0] - 72) < 12, "mask must be opaque and deterministic");
  const outsideBefore = pixel(original.data, original.info.width, 10, 10);
  const outsideAfter = pixel(sanitized.data, sanitized.info.width, 10, 10);
  assert.ok(outsideAfter.every((value, index) => Math.abs(value - outsideBefore[index]) < 12), "pixels outside the padded region must remain materially unchanged");
}

async function testMultipleAndEdgeRegions() {
  assert.deepEqual(expandPlateRedactionRegion({ left: 0, top: 0, width: 10, height: 8 }, 100, 80), { left: 0, top: 0, width: 12, height: 10 });
  assert.deepEqual(expandPlateRedactionRegion({ left: 90, top: 72, width: 10, height: 8 }, 100, 80), { left: 88, top: 70, width: 12, height: 10 });
  const result = await sanitizePrivatePhoto({ bytes: await createFixture(), mimeType: "image/png", requestId: "multi" }, fakeVision([plate, { x: 0.1, y: 0.1, width: 0.2, height: 0.1, confidence: 1 }], 0, {}));
  assert.equal(result.telemetry.initialDetectionCount, 2);
  assert.equal(result.telemetry.compositedRegionCount, 2);
  assert.equal(result.privacyOutcome, "blurred");
  const sanitized = await rawPixels(result.variants.master);
  const secondMaskPixel = pixel(sanitized.data, sanitized.info.width, 16, 11);
  assert.ok(Math.max(...secondMaskPixel) - Math.min(...secondMaskPixel) < 8, "each detected region must receive its own neutral mask");
}

async function testFailClosedOutcomes() {
  assert.equal(decidePrivacyOutcome(1, 1, 0), "blurred");
  assert.equal(decidePrivacyOutcome(1, 1, 1), "manual_required");
  assert.equal(decidePrivacyOutcome(0, 0, 0), "skipped");
  assert.equal(decidePrivacyOutcome(0, 0, 1), "manual_required");
  const source = await createFixture();
  await assert.rejects(() => sanitizePrivatePhoto({ bytes: source, mimeType: "image/png", requestId: "blocked" }, fakeVision([plate], 1, {})), (error) => error instanceof PrivacyProcessingError && error.outcome === "manual_required");
}

async function main() {
  await testOpaquePaddedRedaction();
  await testMultipleAndEdgeRegions();
  await testFailClosedOutcomes();
  assert.doesNotMatch(read(pipelinePath), /\.blur\(30\)/, "plate privacy must not rely on the prior Gaussian-only redaction");
  const migration = read(repo, "supabase", "migrations", "20261019185432_jlc_0516_verified_plate_privacy_outcomes.sql");
  const route = read(root, "src", "app", "api", "listings", "[id]", "media", "route.ts");
  assert.match(route, /finalize_own_listing_sanitized_photo_v2/);
  assert.match(migration, /p_blur_status IS NULL OR p_blur_status NOT IN \('blurred', 'skipped'\)/);
  assert.match(migration, /pm\.blur_status IN \('blurred', 'skipped'\)/);
  console.log("JLC-0516 hardened plate privacy regression: PASS");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
