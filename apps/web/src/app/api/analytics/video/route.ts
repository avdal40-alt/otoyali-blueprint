import { NextRequest, NextResponse } from "next/server";
import { isUuid, privateResponseHeaders, rateLimit, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";

const eventTypes = new Set(["video_impression", "video_play", "video_complete", "video_error"]);
const errorCodes = new Set(["aborted", "network", "decode", "source_not_supported", "unknown"]);
const response = (body: object, status = 200) => NextResponse.json(body, { status, headers: privateResponseHeaders });

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return response({ error: "Authentication required." }, 401);
  if (rateLimit(authenticated.userId, "analytics") !== null) return response({ error: "Too many analytics events." }, 429);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const allowed = ["eventType", "listingId", "videoId", "context", "locale", "errorCode", "dedupKey"];
  if (!body || Object.keys(body).some((key) => !allowed.includes(key))) return response({ error: "Invalid analytics event." }, 422);
  const { eventType, listingId, videoId, context, locale, errorCode, dedupKey } = body;
  if (typeof eventType !== "string" || !eventTypes.has(eventType) || typeof listingId !== "string" || !isUuid(listingId) || typeof videoId !== "string" || !isUuid(videoId) || context !== "video_feed" || (locale !== "tr" && locale !== "en") || typeof dedupKey !== "string" || !isUuid(dedupKey) || (eventType === "video_error" ? typeof errorCode !== "string" || !errorCodes.has(errorCode) : errorCode !== null)) return response({ error: "Invalid analytics event." }, 422);

  const { data, error } = await authenticated.supabase.rpc("record_video_analytics_event", {
    p_event_type: eventType,
    p_listing_id: listingId,
    p_video_id: videoId,
    p_context: context,
    p_locale: locale,
    p_error_code: errorCode,
    p_dedup_key: dedupKey
  });
  if (error) return response({ error: "Analytics event unavailable." }, error.code === "OT422" ? 422 : 404);
  return response({ accepted: data === true });
}
