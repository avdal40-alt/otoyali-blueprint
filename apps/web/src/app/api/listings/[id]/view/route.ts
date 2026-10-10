import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const VIEWER_COOKIE = "jolcar_viewer_key";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listingId = id.trim();
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ ok: false }, { status: 400 });

  const cookieStore = await cookies();
  const existing = cookieStore.get(VIEWER_COOKIE)?.value;
  const viewerKey = existing && /^[0-9a-f-]{36}$/i.test(existing) ? existing : randomUUID();
  const { data, error } = await getSupabaseServerClient().rpc("record_listing_view", {
    p_listing_id: listingId,
    p_viewer_key: viewerKey
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  const response = NextResponse.json({ ok: true, recorded: data === true });
  if (viewerKey !== existing) response.cookies.set(VIEWER_COOKIE, viewerKey, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
  return response;
}
