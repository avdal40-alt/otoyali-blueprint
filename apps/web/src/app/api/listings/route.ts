import { NextRequest, NextResponse } from "next/server";
import { createListingSchema, createOwnListingDraft, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";
// Shared boundary invokes the protected create_own_listing_draft RPC.

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });

  const payload = await parseBody(request, createListingSchema);
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });

  const result = await createOwnListingDraft(authenticated, payload);
  if ("error" in result) { const error = result.error ?? { status: 500, message: "İlan işlemi tamamlanamadı." }; if (result.rawError) logListingWriteFailure("create", result.rawError, authenticated.userId); return NextResponse.json({ error: error.message }, { status: error.status, headers: privateApiHeaders }); }
  return NextResponse.json({ data: result.data }, { status: 201, headers: privateApiHeaders });
}

async function parseBody<T>(request: NextRequest, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }) {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
