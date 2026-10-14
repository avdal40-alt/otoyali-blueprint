const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const variants = read("src/lib/media/image-variants.ts");
const safeImage = read("src/components/ui/SafeImage.tsx");
const card = read("src/components/vehicle/VehicleCard.tsx");
const gallery = read("src/components/vehicle/VehicleGallery.tsx");
const mediaDocs = read("docs/MEDIA.md");

assert.match(variants, /card: 800/, "card derivative must remain bounded at 800px");
assert.match(variants, /large: 1600/, "detail derivative must remain bounded at 1600px");
assert.match(variants, /thumb: 300/, "thumbnail derivative must remain bounded at 300px");
assert.match(variants, /getResponsiveImageSrcSet/, "sanitized derivative URLs must produce a responsive source set");
assert.match(variants, /Number\.isFinite\(source\.width\)/, "responsive width descriptors require persisted dimensions");
assert.match(variants, /responsiveVariantFields/, "responsive candidates must use direct derivative fields");
assert.match(variants, /Do not use a fallback URL here/, "responsive descriptors must not claim fallback images have derivative dimensions");
assert.match(safeImage, /srcSet=\{srcSet\}/, "SafeImage must pass responsive candidates to the browser");
assert.match(safeImage, /sizes=\{srcSet \? \(sizes \?\? defaultSizes\[variant\]\) : undefined\}/, "SafeImage must describe rendered card/detail sizes only with a source set");
assert.match(safeImage, /loading=\{priority \? "eager" : "lazy"\}/, "non-priority media must remain lazy-loaded");
assert.match(safeImage, /decoding="async"/, "image decoding must remain asynchronous");
assert.match(card, /media=\{currentImage\?\.media\} variant="card"/, "listing cards must select card-sized derivatives");
assert.match(gallery, /media=\{activeImage\?\.media\} variant="large"/, "listing detail must select large derivatives");
assert.match(gallery, /media=\{item\.media\} variant="thumb"/, "gallery rails must select thumbnail derivatives");
assert.match(mediaDocs, /Current server-side sanitization produces WebP/, "format support boundary must remain explicit");

console.log("JLC-1403 responsive media delivery contracts passed");
