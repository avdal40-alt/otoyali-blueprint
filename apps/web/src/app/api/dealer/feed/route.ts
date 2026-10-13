import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { releaseHeaders } from "@/lib/release/compatibility";

export const dynamic = "force-dynamic";
const maxBodyBytes = 1_000_000;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
  const length = Number(request.headers.get("content-length"));
  if (!token) return NextResponse.json({ error: "Dealer API token required." }, { status: 401 });
  if (!Number.isFinite(length) || length <= 0 || length > maxBodyBytes) return NextResponse.json({ error: "Payload limit exceeded." }, { status: 413 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: "Dealer import is unavailable." }, { status: 500 });
  let rows: unknown;
  try { rows = await request.json(); } catch { return NextResponse.json({ error: "JSON body required." }, { status: 422 }); }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500 || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) return NextResponse.json({ error: "Invalid inventory rows." }, { status: 422 });
  const canonical = JSON.stringify(rows);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: releaseHeaders() } });
  const { data, error } = await supabase.rpc("apply_dealer_feed_api_import", { p_token: token, p_source: "https_json", p_source_sha256: createHash("sha256").update(canonical).digest("hex"), p_rows: rows });
  if (error) {
    const status = error.code === "OT401" ? 401 : error.code === "OT429" ? 429 : error.code === "OT403" ? 403 : 422;
    return NextResponse.json({ error: status === 429 ? "Dealer API rate limit exceeded." : "Dealer import rejected." }, { status });
  }
  return NextResponse.json({ data: (data ?? []).map((row: { row_number: number; status: string; external_listing_id: string | null; error_code: string | null }) => ({ rowNumber: row.row_number, status: row.status, externalListingId: row.external_listing_id, errorCode: row.error_code })) });
}
