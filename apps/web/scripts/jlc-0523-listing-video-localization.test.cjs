const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const detail = read("src/app/listing/[id]/listing-detail-copy.ts");
const contact = read("src/app/listing/[id]/_components/listing-contact-copy.ts");
const grid = read("src/components/vehicle/VehicleGrid.tsx");
const video = read("src/app/video/video-copy.ts");

for (const source of [detail, contact, video]) {
  for (const locale of ["const ru", "const kk", "const en", "const zhCN"]) assert.ok(source.includes(locale), `${locale} launch copy is required`);
}
assert.ok(detail.includes("return ru;"), "listing detail unsupported locale fallback must be Russian");
assert.ok(contact.includes("return ru;"), "listing contact unsupported locale fallback must be Russian");
assert.ok(grid.includes('locale = "ru"'), "vehicle grid must default to Russian");
assert.ok(!grid.includes("İlan bulunamadı") && !grid.includes("Filtreleri değiştirerek"), "vehicle grid must not ship Turkish KZ fallback copy");
assert.ok(video.includes("default:\n      return ru;"), "video fallback must be Russian");
assert.ok(video.includes("Казахстан") && video.includes("Қазақстан") && video.includes("Kazakhstan") && video.includes("哈萨克斯坦"), "video must preserve KZ identity in every launch locale");
console.log("JLC-0523 listing/video localization checks passed");
