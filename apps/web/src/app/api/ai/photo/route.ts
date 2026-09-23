import { NextRequest, NextResponse } from "next/server";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { analyzePhotosDeterministically, photoAnalysisInputSchema } from "@/features/ai/photo/photo-intelligence";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: { code: "auth_required" } }, { status: 401, headers: privateApiHeaders });
  let payload: unknown; try { payload = await request.json(); } catch { return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422, headers: privateApiHeaders }); }
  const parsed = photoAnalysisInputSchema.safeParse(payload); if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422, headers: privateApiHeaders });
  const owned = await authenticated.supabase.rpc("get_own_rejected_listing_for_edit", { p_listing_id: parsed.data.listingId });
  const media = owned.data && typeof owned.data === "object" && Array.isArray((owned.data as { media?: unknown }).media) ? (owned.data as { media: Array<{ id?: unknown }> }).media : null;
  if (owned.error || !media) return NextResponse.json({ error: { code: "forbidden" } }, { status: 403, headers: privateApiHeaders });
  const ownedIds = new Set(media.map((item) => item.id).filter((id): id is string => typeof id === "string")); if (!parsed.data.images.every((image) => ownedIds.has(image.mediaId))) return NextResponse.json({ error: { code: "media_not_found" } }, { status: 404, headers: privateApiHeaders });
  return NextResponse.json({ data: analyzePhotosDeterministically(parsed.data) }, { headers: privateApiHeaders });
}
