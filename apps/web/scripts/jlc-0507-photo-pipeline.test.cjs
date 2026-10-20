const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");

const wizard = read(webRoot, "src", "app", "sell", "_components", "SellWizard.tsx");
const mediaRoute = read(webRoot, "src", "app", "api", "listings", "[id]", "media", "route.ts");
const coverRoute = read(webRoot, "src", "app", "api", "listings", "[id]", "media", "cover", "route.ts");
const variants = read(webRoot, "src", "lib", "media", "image-variants.ts");
const storage = read(webRoot, "src", "lib", "supabase", "trusted-storage.ts");
const contract = read(repoRoot, "supabase", "migrations", "20260923202053_media_sec_01_sanitized_public_photo_contract.sql");
const finalizer = read(repoRoot, "supabase", "migrations", "20261019065851_jlc_0508_fix_draft_media_finalization.sql");

for (const value of [
  'accept="image/jpeg,image/png,image/webp"',
  "const availableSlots = maxPhotos - state.photos.length",
  "if (nextFiles.length > availableSlots)",
  "file.size > 10 * 1024 * 1024",
  "temp/${userId}/${mediaId}/${fileName}",
  'supabase.storage.from("listing-media").upload(tempPath, photo.file',
  "is_cover: photo.isCover"
]) assert.ok(wizard.includes(value), `wizard contract missing: ${value}`);

for (const value of [
  '.eq("seller_id", authenticated.userId)',
  '.eq("status", "draft")',
  '.in("moderation_status", ["draft", "pending_review"])',
  'payload.tempPath.startsWith(`temp/${authenticated.userId}/${payload.mediaId}/`)',
  'trustedSanitizedStorage.upload(path, processed.variants',
  "finalize_own_listing_sanitized_photo",
  "listing_media_processing_failed",
  "byteLength: sourceBytes.byteLength",
  'storage.from("listing-media").remove([payload.tempPath])'
]) assert.ok(mediaRoute.includes(value), `media route contract missing: ${value}`);

assert.ok(coverRoute.includes("set_own_listing_cover_media"), "cover selection must use the owner-scoped RPC");
assert.ok(storage.includes('storage.from("listing-media").upload(path, contents'), "only the server-only trusted writer may create derivatives");
assert.ok(storage.includes('import "server-only"'), "trusted writer must remain server-only");

for (const value of [
  "CREATE POLICY listing_media_insert_temp_own",
  "(storage.foldername(name))[1] = 'temp'",
  "(storage.foldername(name))[2] = auth.uid()::TEXT",
  "CREATE OR REPLACE FUNCTION public.finalize_own_listing_sanitized_photo",
  "owner_id IS NULL",
  "privacy_version=1"
]) assert.ok(contract.includes(value), `storage/finalization contract missing: ${value}`);
for (const value of [
  "l.moderation_status IN ('draft', 'pending_review')",
  "at least three finalized photos are required",
  "a finalized cover photo is required",
  "pm.id = v_listing.cover_media_id",
  "pm.is_cover = TRUE",
  "pm.processed_status = 'processed'",
  "pm.blur_status = 'blurred'",
  "INSERT INTO public.admin_audit_logs"
]) assert.ok(finalizer.includes(value), `draft/finalization contract missing: ${value}`);
assert.ok(finalizer.includes("'^public/'") && finalizer.includes("(master|large|card|thumb)"), "only canonical public derivatives may finalize");

for (const value of [
  "listingWriteFailureMessage(mediaError, copy.photoProcessingFallback)",
  "setError(failureMessage)",
  "listingWriteFailureMessage(submitError, copy.submitFailure)",
  "if (mediaResult.error || !mediaResult.data)",
  "await supabase.storage.from(\"listing-media\").remove([tempPath])"
]) assert.ok(wizard.includes(value), `persisted-media failure contract missing: ${value}`);

for (const value of [
  "const activeCreateDraft = useRef<ActiveCreateDraft | null>(null)",
  "let draft = activeCreateDraft.current",
  "activeCreateDraft.current = draft",
  "isCover: !current.photos.some((candidate) => candidate.isCover)"
]) assert.ok(wizard.includes(value), `draft retry/persisted completeness contract missing: ${value}`);

for (const value of ["thumb_url", "card_url", "large_url", "original_url"]) {
  assert.ok(variants.includes(value), `image variant fallback missing: ${value}`);
}

console.log("JLC-0507 photo upload, ownership, cover/order, and sanitized derivative contracts passed");
