import { NextRequest, NextResponse } from "next/server";
import { editListingSchema, listingIdSchema, logListingWriteFailure, saveOwnRejectedListing } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";
// Shared boundary invokes the protected save_own_rejected_listing RPC.

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const payload = await parseBody(request);
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });

  const result = await saveOwnRejectedListing(authenticated, listingId.data, payload);
  if ("error" in result) { const error = result.error ?? { status: 500, message: "İlan işlemi tamamlanamadı." }; if (result.rawError) logListingWriteFailure("edit", result.rawError, authenticated.userId, listingId.data); return NextResponse.json({ error: error.message }, { status: error.status, headers: privateApiHeaders }); }
  return NextResponse.json({ data: result.data }, { headers: privateApiHeaders });
}

async function parseBody(request: NextRequest) {
  try {
    const parsed = editListingSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
