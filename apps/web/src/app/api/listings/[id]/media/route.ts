import { NextRequest, NextResponse } from "next/server";
import { listingIdSchema, listingWriteError, logListingWriteFailure, mediaAttachmentSchema } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const payload = await parseBody(request);
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });

  const { data, error } = await authenticated.supabase.rpc("attach_own_listing_media", {
    p_listing_id: listingId.data, p_media_id: payload.mediaId, p_storage_path: payload.storagePath,
    p_original_path: payload.originalPath, p_large_path: payload.largePath, p_card_path: payload.cardPath,
    p_thumb_path: payload.thumbPath, p_sort_order: payload.sortOrder, p_is_cover: payload.isCover,
    p_width: payload.width, p_height: payload.height, p_aspect_ratio: payload.aspectRatio,
    p_mime_type: payload.mimeType, p_size_bytes: payload.sizeBytes, p_processed_status: payload.processedStatus
  });
  if (error) {
    const publicError = listingWriteError(error);
    logListingWriteFailure("attach-media", error, authenticated.userId, listingId.data);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return NextResponse.json({ error: "İlan işlemi tamamlanamadı." }, { status: 500, headers: privateApiHeaders });
  const result = row as { media_id?: string; sort_order?: number; is_cover?: boolean };
  return NextResponse.json({ data: { mediaId: result.media_id, sortOrder: result.sort_order, isCover: result.is_cover } }, { status: 201, headers: privateApiHeaders });
}

async function parseBody(request: NextRequest) {
  try {
    const parsed = mediaAttachmentSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
