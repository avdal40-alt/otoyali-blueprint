import { NextRequest, NextResponse } from "next/server";
import { isUuid, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };
const out = (body: object, status = 200) => NextResponse.json(body, { status, headers });
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return out({ error: "Authentication required." }, 401);
  if (!isUuid(id)) return out({ error: "Listing unavailable." }, 404);
  const { data, error } = await authenticated.supabase.rpc("remove_own_listing_video", { p_listing_id: id });
  const path = Array.isArray(data) ? data[0]?.storage_path : null;
  if (error || !path) return out({ error: "Video could not be removed." }, 409);
  const { error: cleanupError } = await authenticated.supabase.storage.from("listing-videos").remove([path]);
  return out({ data: { removed: true, cleanupIncomplete: Boolean(cleanupError) } });
}
