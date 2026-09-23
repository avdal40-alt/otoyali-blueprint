import { NextRequest, NextResponse } from "next/server";
import { isUuid, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };
const out = (body: object, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return out({ error: "Authentication required." }, 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!isUuid(id) || !body || Object.keys(body).some((key) => !["intentId", "title", "description", "durationSeconds", "operation"].includes(key))) return out({ error: "Invalid video request." }, 422);
  const { intentId, title, description, operation } = body;
  const durationSeconds = body.durationSeconds;
  if (!isUuid(String(intentId)) || typeof title !== "string" || title.trim().length < 1 || title.length > 120 || (description !== null && typeof description !== "string") || (typeof description === "string" && description.length > 500) || typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 60 || (operation !== "create" && operation !== "replace")) return out({ error: "Invalid video request." }, 422);
  const rpc = operation === "replace" ? "replace_own_listing_video_upload_intent" : "finalize_own_listing_video_upload_intent";
  const { error } = await authenticated.supabase.rpc(rpc, { p_listing_id: id, p_intent_id: intentId, p_title: title.trim(), p_description: typeof description === "string" ? description.trim() || null : null, p_duration_seconds: durationSeconds as number });
  if (!error) return out({ data: { ok: true } });
  const { data: cleanup } = await authenticated.supabase.rpc("revoke_own_listing_video_upload_intent", { p_listing_id: id, p_intent_id: intentId });
  const path = Array.isArray(cleanup) ? cleanup[0]?.object_path : null;
  const cleanupError = path ? (await authenticated.supabase.storage.from("listing-videos").remove([path])).error : null;
  return out({ error: "Video could not be finalized.", cleanupIncomplete: Boolean(path && cleanupError) }, error.code === "OT422" ? 422 : 409);
}
