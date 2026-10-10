import { NextRequest, NextResponse } from "next/server";
import { listingIdSchema, listingWriteError, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { trustedSanitizedStorage } from "@/lib/supabase/trusted-storage";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; mediaId: string }> }) {
  const params = await context.params;
  const listingId = listingIdSchema.safeParse(params.id);
  const mediaId = listingIdSchema.safeParse(params.mediaId);
  if (!listingId.success || !mediaId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });

  const { data, error } = await authenticated.supabase.rpc("remove_own_listing_media", { p_listing_id: listingId.data, p_media_id: mediaId.data });
  if (error) {
    const publicError = listingWriteError(error);
    logListingWriteFailure("remove-media", error, authenticated.userId, listingId.data);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders });
  }
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, string | null> | null;
  if (!row) return NextResponse.json({ error: "Medya bulunamadı." }, { status: 404, headers: privateApiHeaders });

  const paths = [row.original_path, row.storage_path, row.large_path, row.card_path, row.thumb_path].filter((path): path is string => Boolean(path));
  const { error: cleanupError } = paths.length ? await trustedSanitizedStorage.remove(Array.from(new Set(paths))) : { error: null };
  return NextResponse.json({ data: { removed: true, cleanupIncomplete: Boolean(cleanupError) } }, { headers: privateApiHeaders });
}
