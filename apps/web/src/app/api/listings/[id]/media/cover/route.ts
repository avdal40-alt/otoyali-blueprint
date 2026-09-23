import { NextRequest, NextResponse } from "next/server";
import { coverMediaSchema, listingIdSchema, listingWriteError, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const payload = await parseBody(request);
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const { error } = await authenticated.supabase.rpc("set_own_listing_cover_media", { p_listing_id: listingId.data, p_cover_media_id: payload.coverMediaId });
  if (error) {
    const publicError = listingWriteError(error);
    logListingWriteFailure("set-cover", error, authenticated.userId, listingId.data);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders });
  }
  return NextResponse.json({ data: { listingId: listingId.data, coverMediaId: payload.coverMediaId } }, { headers: privateApiHeaders });
}

async function parseBody(request: NextRequest) {
  try {
    const parsed = coverMediaSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
