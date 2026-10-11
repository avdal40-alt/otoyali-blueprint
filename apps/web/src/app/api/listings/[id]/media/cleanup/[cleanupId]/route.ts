import { NextRequest, NextResponse } from "next/server";
import { listingIdSchema, listingWriteError, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { trustedSanitizedStorage } from "@/lib/supabase/trusted-storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; cleanupId: string }> }) {
  const params = await context.params;
  const listingId = listingIdSchema.safeParse(params.id);
  const cleanupId = listingIdSchema.safeParse(params.cleanupId);
  if (!listingId.success || !cleanupId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("get_own_listing_media_cleanup_task", { p_listing_id: listingId.data, p_cleanup_task_id: cleanupId.data });
  if (error) { const publicError = listingWriteError(error); logListingWriteFailure("retry-media-cleanup", error, authenticated.userId, listingId.data); return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders }); }
  const row = (Array.isArray(data) ? data[0] : data) as { storage_paths?: string[] } | null;
  const { error: cleanupError } = row?.storage_paths?.length ? await trustedSanitizedStorage.remove(row.storage_paths) : { error: null };
  if (cleanupError) return NextResponse.json({ data: { cleanupIncomplete: true, cleanupTaskId: cleanupId.data } }, { status: 502, headers: privateApiHeaders });
  const completed = await authenticated.supabase.rpc("complete_own_listing_media_cleanup_task", { p_listing_id: listingId.data, p_cleanup_task_id: cleanupId.data });
  if (completed.error) { logListingWriteFailure("complete-media-cleanup", completed.error, authenticated.userId, listingId.data); return NextResponse.json({ error: "Temizleme durumu güncellenemedi." }, { status: 500, headers: privateApiHeaders }); }
  return NextResponse.json({ data: { cleanupIncomplete: false, cleanupTaskId: cleanupId.data } }, { headers: privateApiHeaders });
}
