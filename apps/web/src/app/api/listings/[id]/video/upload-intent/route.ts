import { NextRequest, NextResponse } from "next/server";
import { isUuid, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };
const allowedMime = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const out = (body: object, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return out({ error: "Authentication required." }, 401);
  if (!isUuid(id)) return out({ error: "Listing unavailable." }, 404);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || Object.keys(body).some((key) => !["mimeType", "sizeBytes", "operation"].includes(key))) return out({ error: "Invalid upload request." }, 422);
  const mimeType = body.mimeType, sizeBytes = body.sizeBytes, operation = body.operation;
  if (typeof mimeType !== "string" || !allowedMime.has(mimeType) || typeof sizeBytes !== "number" || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 104857600 || (operation !== "create" && operation !== "replace")) return out({ error: "Invalid upload request." }, 422);
  const { data: issued, error } = await authenticated.supabase.rpc("issue_own_listing_video_upload_intent", { p_listing_id: id, p_operation: operation, p_mime_type: mimeType, p_declared_size_bytes: sizeBytes });
  const intent = Array.isArray(issued) ? issued[0] : null;
  if (error || !intent?.intent_id || !intent?.object_path) return out({ error: "Video upload is not available." }, error?.code === "OT409" ? 409 : 403);
  const { data: signed, error: signedError } = await authenticated.supabase.storage.from("listing-videos").createSignedUploadUrl(intent.object_path);
  if (signedError || !signed?.token) {
    await authenticated.supabase.rpc("revoke_own_listing_video_upload_intent", { p_listing_id: id, p_intent_id: intent.intent_id });
    return out({ error: "Upload authorization failed." }, 500);
  }
  return out({ data: { intentId: intent.intent_id, path: intent.object_path, token: signed.token, expiresAt: intent.expires_at } });
}
