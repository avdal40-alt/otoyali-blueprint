import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { trustedSanitizedStorage } from "@/lib/supabase/trusted-storage";
import { IMAGE_MODERATION_SCHEMA_VERSION, moderateListingImage, type ImageModerationPersistenceSignal } from "./image-moderation";

const MAX_LISTING_IMAGE_MODERATION_IMAGES = 12;
const persistedFieldName = "description" as const;
type SanitizedMedia = { id: string; storage_path: string; mime_type: "image/jpeg" | "image/png" | "image/webp"; processed_status: string; blur_status: string };

/**
 * Server-only, owner-authorized execution seam for finalized sanitized media.
 * The present signal table has no media-id column; persistence is intentionally
 * listing/run-scoped and stores classifications only, never image identifiers or bytes.
 */
export async function moderateOwnListingImages(authenticated: AuthenticatedRequestSupabase, listingId: string): Promise<{ kind: "ok"; scannedImageCount: number; signalCount: number } | { kind: "not_found" | "unavailable" | "invalid" | "persistence_unavailable" }> {
  const { data: listing, error: listingError } = await authenticated.supabase.schema("marketplace").from("listings").select("id,vehicle_profile_id").eq("id", listingId).eq("seller_id", authenticated.userId).maybeSingle();
  if (listingError || !listing?.vehicle_profile_id) return { kind: "not_found" };
  const trusted = trustedModerationClient();
  if (!trusted) return { kind: "persistence_unavailable" };
  const { data: vehicle, error: vehicleError } = await trusted.schema("vehicle").from("vehicle_profiles").select("body_type").eq("id", listing.vehicle_profile_id).maybeSingle();
  if (vehicleError) return { kind: "persistence_unavailable" };
  const { data, error } = await trusted.schema("vehicle").from("profile_media").select("id,storage_path,mime_type,processed_status,blur_status").eq("vehicle_profile_id", listing.vehicle_profile_id).eq("processed_status", "processed").eq("blur_status", "blurred").order("sort_order", { ascending: true }).limit(MAX_LISTING_IMAGE_MODERATION_IMAGES);
  if (error) return { kind: "persistence_unavailable" };
  const media = (data ?? []) as SanitizedMedia[];
  const allSignals: ImageModerationPersistenceSignal[] = [];
  const canonicalDigests = new Set<string>();
  let hasExactDuplicate = false;
  let hasClearMismatch = false;
  for (const item of media) {
    if (!item.storage_path.startsWith(`public/${listing.vehicle_profile_id}/${item.id}/`) || !["image/jpeg", "image/png", "image/webp"].includes(item.mime_type)) return { kind: "invalid" };
    const downloaded = await trustedSanitizedStorage.download(item.storage_path);
    if (downloaded.error || !downloaded.data) return { kind: "unavailable" };
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    const digest = createHash("sha256").update(bytes).digest("hex");
    hasExactDuplicate ||= canonicalDigests.has(digest); canonicalDigests.add(digest);
    const outcome = await moderateListingImage({ image: { mimeType: item.mime_type, bytes }, mediaId: item.id, schemaVersion: IMAGE_MODERATION_SCHEMA_VERSION, expectedVehicle: { bodyType: vehicle?.body_type ?? null } });
    if (outcome.kind !== "ok") return { kind: outcome.kind === "disabled" ? "unavailable" : outcome.kind };
    allSignals.push(...outcome.output.signals);
    hasClearMismatch ||= outcome.output.vehicleIdentity?.confidence === "high" && (outcome.output.vehicleIdentity.category === "motorcycle" || outcome.output.vehicleIdentity.category === "commercial_van" || (outcome.output.vehicleIdentity.category === "passenger_car" && Boolean(vehicle?.body_type) && Boolean(outcome.output.vehicleIdentity.bodyType) && vehicle?.body_type !== outcome.output.vehicleIdentity.bodyType));
  }
  if (hasExactDuplicate) allSignals.push({ code: "POSSIBLE_DUPLICATE_IMAGE", confidence: "high", evidence: "[exact-duplicate-image]", recommendedAction: "ask_edit" });
  if (hasClearMismatch) allSignals.push({ code: "POSSIBLE_VEHICLE_MISMATCH", confidence: "high", evidence: "[possible-vehicle-mismatch]", recommendedAction: "review" });
  if (!await persistImageModerationRun(trusted, listing.id, authenticated.userId, allSignals)) return { kind: "persistence_unavailable" };
  return { kind: "ok", scannedImageCount: media.length, signalCount: allSignals.length };
}

function trustedModerationClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

async function persistImageModerationRun(supabase: NonNullable<ReturnType<typeof trustedModerationClient>>, listingId: string, actorUserId: string, signals: ImageModerationPersistenceSignal[]) {
  const action = signals.some((signal) => signal.recommendedAction === "review") ? "review" : signals.some((signal) => signal.recommendedAction === "ask_edit") ? "ask_edit" : "allow";
  const { data: run, error: runError } = await supabase.schema("marketplace").from("listing_moderation_runs").insert({ listing_id: listingId, initiated_by_user_id: actorUserId, engine: "ai", ruleset_version: IMAGE_MODERATION_SCHEMA_VERSION, provider_id: process.env.AI_PROVIDER === "openai" ? "openai" : "local", model_id: process.env.AI_PROVIDER === "openai" ? process.env.AI_VISION_MODEL ?? process.env.AI_MODEL ?? null : "deterministic-image-moderation-v1", prompt_schema_version: IMAGE_MODERATION_SCHEMA_VERSION, recommended_action: action }).select("id").single();
  if (runError || !run?.id) return false;
  if (signals.length === 0) return true;
  const { error } = await supabase.schema("marketplace").from("listing_moderation_signals").insert(signals.map((signal) => ({ run_id: run.id, code: signal.code, severity: signal.code === "POSSIBLE_VISIBLE_DAMAGE" ? "low" : "medium", confidence: signal.confidence, source: signal.code === "POSSIBLE_DUPLICATE_IMAGE" ? "deterministic" : "ai", field_name: persistedFieldName, evidence_class: "image-moderation", evidence_excerpt: signal.evidence, rule_id: IMAGE_MODERATION_SCHEMA_VERSION, recommended_action: signal.recommendedAction })));
  if (!error) return true;
  await supabase.schema("marketplace").from("listing_moderation_runs").delete().eq("id", run.id);
  return false;
}
