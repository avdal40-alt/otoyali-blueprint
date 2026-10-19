const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const helperSource = fs.readFileSync(path.join(projectRoot, "src", "lib", "media", "storage-urls.ts"), "utf8");
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const helperModule = { exports: {} };
new Function("exports", "require", "module", compiled)(helperModule.exports, require, helperModule);

const { storageObjectPathFromUrl, finalizedListingMediaPath, signListingImageVariantUrlMap } = helperModule.exports;
const profileId = "11111111-1111-1111-1111-111111111111";
const mediaId = "22222222-2222-2222-2222-222222222222";
const largePath = `public/${profileId}/${mediaId}/large.webp`;

assert.equal(storageObjectPathFromUrl(largePath, "listing-media"), largePath);
assert.equal(finalizedListingMediaPath(largePath, "large"), largePath);
assert.equal(finalizedListingMediaPath(largePath, "card"), `public/${profileId}/${mediaId}/card.webp`);
assert.equal(finalizedListingMediaPath(largePath, "thumb"), `public/${profileId}/${mediaId}/thumb.webp`);
for (const invalidPath of [
  `temp/${profileId}/source.jpg`,
  `public/${profileId}/${mediaId}/master.webp`,
  `public/${profileId}/${mediaId}/original.jpg`,
  "public/not-a-uuid/not-a-uuid/large.webp",
  "https://attacker.example/public/path/large.webp"
]) {
  assert.equal(storageObjectPathFromUrl(invalidPath, "listing-media"), null, `${invalidPath} must be rejected`);
}

const signedPaths = [];
const supabase = {
  storage: {
    from(bucket) {
      assert.equal(bucket, "listing-media");
      return {
        async createSignedUrl(objectPath) {
          signedPaths.push(objectPath);
          return { data: { signedUrl: `https://example.test/signed/${objectPath}` }, error: null };
        }
      };
    }
  }
};

(async () => {
  for (const variant of ["large", "card", "thumb"]) {
    const signed = await signListingImageVariantUrlMap(supabase, [largePath], variant);
    assert.equal(signed.get(largePath), `https://example.test/signed/public/${profileId}/${mediaId}/${variant}.webp`);
  }
  assert.deepEqual(signedPaths, [
    `public/${profileId}/${mediaId}/large.webp`,
    `public/${profileId}/${mediaId}/card.webp`,
    `public/${profileId}/${mediaId}/thumb.webp`
  ]);

  const invalid = await signListingImageVariantUrlMap(supabase, [null, `temp/${profileId}/source.jpg`], "card");
  assert.equal(invalid.get(`temp/${profileId}/source.jpg`), null, "missing covers must retain the placeholder");
  assert.equal(signedPaths.length, 3, "invalid paths must never be signed");

  const listings = fs.readFileSync(path.join(projectRoot, "src", "lib", "queries", "listings.ts"), "utf8");
  const search = fs.readFileSync(path.join(projectRoot, "src", "lib", "search", "server-search.ts"), "utf8");
  const media = fs.readFileSync(path.join(projectRoot, "src", "lib", "queries", "media.ts"), "utf8");
  const card = fs.readFileSync(path.join(projectRoot, "src", "components", "vehicle", "VehicleCard.tsx"), "utf8");

  assert.match(listings, /signListingImageVariantUrlMap\(supabase, rows\.map\(\(row\) => row\.cover_image_url\), "card"\)/);
  assert.match(listings, /signImageStorageUrlMap\(supabase, \[row\.cover_image_url\]\)/, "detail covers must use the signer");
  assert.match(search, /signListingImageVariantUrlMap\(supabase, items\.map\(\(item\) => item\.cover_image_url\), "card"\)/);
  assert.match(media, /signListingImageVariantUrlMap\(supabase, canonicalSources, "large"\)/);
  assert.match(media, /signListingImageVariantUrlMap\(supabase, canonicalSources, "thumb"\)/);
  assert.match(card, /src=\{currentImage\?\.url\}/, "cards receive a loader-resolved browser URL");
  assert.doesNotMatch(card, /public\/.*large\.webp/, "cards must not embed raw private Storage paths");

  console.log("LAUNCH-03D3C7 public private-media URL resolution contract: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
