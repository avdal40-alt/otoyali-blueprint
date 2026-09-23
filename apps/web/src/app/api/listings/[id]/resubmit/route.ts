import { NextRequest, NextResponse } from "next/server";
import { listingIdSchema, listingWriteError, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { z } from "zod";

export const dynamic = "force-dynamic";
const emptyBody = z.object({}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success || !(await hasEmptyBody(request))) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("resubmit_own_listing_for_review", { p_listing_id: listingId.data });
  if (error) {
    const publicError = listingWriteError(error);
    logListingWriteFailure("resubmit", error, authenticated.userId, listingId.data);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders });
  }
  const row = Array.isArray(data) ? data[0] : data;
  const result = row && typeof row === "object" ? row as { listing_id?: string; status?: string; moderation_status?: string } : null;
  if (!result?.listing_id || !result.status || !result.moderation_status) return NextResponse.json({ error: "İlan işlemi tamamlanamadı." }, { status: 500, headers: privateApiHeaders });
  return NextResponse.json({ data: { listingId: result.listing_id, status: result.status, moderationStatus: result.moderation_status } }, { headers: privateApiHeaders });
}

async function hasEmptyBody(request: NextRequest) {
  try { return emptyBody.safeParse(await request.json()).success; } catch { return false; }
}
