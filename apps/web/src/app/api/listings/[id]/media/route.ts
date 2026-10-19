import { NextRequest, NextResponse } from "next/server";
import { listingIdSchema, listingWriteError, logListingWriteFailure } from "@/lib/listings/server-write";
import { PrivacyProcessingError, sanitizedPhotoRequestSchema, sanitizePrivatePhoto } from "@/lib/media/sanitized-photo-pipeline";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { trustedSanitizedStorage } from "@/lib/supabase/trusted-storage";
import { safeLog } from "@/lib/observability/safe-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const payload = await parseBody(request);
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });

  const { data: listing, error: listingError } = await authenticated.supabase.schema("marketplace").from("listings").select("vehicle_profile_id").eq("id", listingId.data).eq("seller_id", authenticated.userId).eq("status", "draft").in("moderation_status", ["draft", "pending_review"]).maybeSingle();
  if (listingError || !listing?.vehicle_profile_id || !payload.tempPath.startsWith(`temp/${authenticated.userId}/${payload.mediaId}/`)) return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403, headers: privateApiHeaders });
  const { data: source, error: sourceError } = await authenticated.supabase.storage.from("listing-media").download(payload.tempPath);
  if (sourceError || !source) return NextResponse.json({ error: "Fotoğraf bulunamadı." }, { status: 404, headers: privateApiHeaders });
  const mimeType = source.type as "image/jpeg" | "image/png" | "image/webp";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const sourceBytes = new Uint8Array(await source.arrayBuffer());
  let processed;
  try {
    processed = await sanitizePrivatePhoto({ bytes: sourceBytes, mimeType, requestId: payload.mediaId });
  } catch (processingError) {
    const privacyError = processingError instanceof PrivacyProcessingError ? processingError : null;
    safeLog("warn", "listing_media_processing_failed", {
      stage: "sanitize",
      errorClass: processingError instanceof Error ? processingError.name : "unknown",
      errorCode: privacyError?.outcome ?? "failed",
      correlation_uuid: payload.mediaId,
      photo_ordinal: payload.sortOrder,
      normalized_width: privacyError?.telemetry.normalizedWidth ?? null,
      normalized_height: privacyError?.telemetry.normalizedHeight ?? null,
      initial_detection_count: privacyError?.telemetry.initialDetectionCount ?? null,
      validated_initial_region_count: privacyError?.telemetry.validatedInitialRegionCount ?? null,
      composited_region_count: privacyError?.telemetry.compositedRegionCount ?? null,
      verification_detection_count: privacyError?.telemetry.verificationDetectionCount ?? null,
      final_outcome: privacyError?.outcome ?? "failed",
      byteLength: sourceBytes.byteLength
    });
    await authenticated.supabase.storage.from("listing-media").remove([payload.tempPath]);
    return NextResponse.json({ error: privacyError?.outcome === "manual_required" ? "Fotoğraftaki plaka güvenli olarak gizlenemedi. Farklı bir fotoğraf yükleyin." : "Fotoğrafın gizlilik işlemi tamamlanamadı. Lütfen tekrar deneyin." }, { status: 422, headers: privateApiHeaders });
  }
  const base = `public/${listing.vehicle_profile_id}/${payload.mediaId}`;
  const paths = { master: `${base}/master.webp`, large: `${base}/large.webp`, card: `${base}/card.webp`, thumb: `${base}/thumb.webp` };
  const uploads = await Promise.all(Object.entries(paths).map(async ([name, path]) => trustedSanitizedStorage.upload(path, processed.variants[name as keyof typeof processed.variants])));
  if (uploads.some((result) => result.error)) { await trustedSanitizedStorage.remove(Object.values(paths)); return NextResponse.json({ error: "Fotoğraf güvenli olarak işlenemedi." }, { status: 422, headers: privateApiHeaders }); }
  const finalizationListingId = listingId.data;
  const finalizationContext = {
    correlation_uuid: payload.mediaId,
    route_listing_uuid: listingId.data,
    finalize_listing_uuid: finalizationListingId,
    media_uuid: payload.mediaId,
    photo_ordinal: payload.sortOrder
  };
  safeLog("info", "listing_media_privacy_outcome", {
    correlation_uuid: payload.mediaId,
    photo_ordinal: payload.sortOrder,
    normalized_width: processed.telemetry.normalizedWidth,
    normalized_height: processed.telemetry.normalizedHeight,
    initial_detection_count: processed.telemetry.initialDetectionCount,
    validated_initial_region_count: processed.telemetry.validatedInitialRegionCount,
    composited_region_count: processed.telemetry.compositedRegionCount,
    verification_detection_count: processed.telemetry.verificationDetectionCount,
    final_outcome: processed.privacyOutcome
  });
  safeLog("info", "listing_media_finalize_attempt", finalizationContext);
  const { data, error } = await authenticated.supabase.rpc("finalize_own_listing_sanitized_photo_v2", { p_listing_id: finalizationListingId, p_media_id: payload.mediaId, p_temp_path: payload.tempPath, p_sanitized_master_path: paths.master, p_large_path: paths.large, p_card_path: paths.card, p_thumb_path: paths.thumb, p_sort_order: payload.sortOrder, p_is_cover: payload.isCover, p_width: processed.width, p_height: processed.height, p_aspect_ratio: processed.aspectRatio, p_mime_type: "image/webp", p_size_bytes: processed.variants.master.byteLength, p_blur_status: processed.privacyOutcome });
  if (error) {
    safeLog("warn", "listing_media_finalize_failed", { ...finalizationContext, postgres_code: error.code ?? null });
    const publicError = listingWriteError(error);
    await trustedSanitizedStorage.remove(Object.values(paths)); logListingWriteFailure("finalize-sanitized-media", error, authenticated.userId, finalizationListingId);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return NextResponse.json({ error: "İlan işlemi tamamlanamadı." }, { status: 500, headers: privateApiHeaders });
  const result = row as { media_id?: string; sort_order?: number; is_cover?: boolean };
  await authenticated.supabase.storage.from("listing-media").remove([payload.tempPath]);
  return NextResponse.json({ data: { mediaId: result.media_id, sortOrder: result.sort_order, isCover: result.is_cover, privacyOutcome: processed.privacyOutcome } }, { status: 201, headers: privateApiHeaders });
}

async function parseBody(request: NextRequest) {
  try {
    const parsed = sanitizedPhotoRequestSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
