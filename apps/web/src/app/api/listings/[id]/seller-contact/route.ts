import { NextRequest, NextResponse } from "next/server";
import { listingContactSwitchSchema, listingIdSchema, logListingWriteFailure, setOwnListingSellerContactPhone } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  let payload: { sellerContactPhoneId: string } | null = null;
  try { const parsed = listingContactSwitchSchema.safeParse(await request.json()); payload = parsed.success ? parsed.data : null; } catch { /* invalid JSON */ }
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const result = await setOwnListingSellerContactPhone(authenticated, listingId.data, payload.sellerContactPhoneId);
  if ("error" in result) { const error = result.error ?? { status: 500, message: "İlan işlemi tamamlanamadı." }; if (result.rawError) logListingWriteFailure("switch-contact", result.rawError, authenticated.userId, listingId.data); return NextResponse.json({ error: error.message }, { status: error.status, headers: privateApiHeaders }); }
  return NextResponse.json({ data: result.data }, { headers: privateApiHeaders });
}
