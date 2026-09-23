import { NextRequest, NextResponse } from "next/server";
import { listingIdSchema, logListingWriteFailure, submitOwnListing } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { z } from "zod";

export const dynamic = "force-dynamic";
// Shared boundary invokes the protected submit_own_listing_for_review RPC.
const emptyBody = z.object({}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success || !(await hasEmptyBody(request))) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const result = await submitOwnListing(authenticated, listingId.data, "submit");
  if ("error" in result) { const error = result.error ?? { status: 500, message: "İlan işlemi tamamlanamadı." }; if (result.rawError) logListingWriteFailure("submit", result.rawError, authenticated.userId, listingId.data); return NextResponse.json({ error: error.message }, { status: error.status, headers: privateApiHeaders }); }
  return NextResponse.json({ data: result.data }, { headers: privateApiHeaders });
}

async function hasEmptyBody(request: NextRequest) {
  try { return emptyBody.safeParse(await request.json()).success; } catch { return false; }
}
