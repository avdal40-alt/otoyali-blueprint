import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAiFeatureEnabled } from "@/features/ai/feature-registry";
import { inspectOwnListingVinTrust } from "@/features/ai/vin/vin-trust-runtime";
import { getAiRateLimiter } from "@/features/ai/services/rate-limit";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";
const requestSchema = z.object({ listingId: z.string().uuid() }).strict();

/** Owner-only derived trust status. It accepts no VIN and returns no VIN-derived identifier. */
export async function POST(request: NextRequest) {
  if (!isAiFeatureEnabled("ai_vin")) return NextResponse.json({ error: { code: "feature_unavailable" } }, { status: 503, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: { code: "auth_required" } }, { status: 401, headers: privateApiHeaders });
  const payload = await parseRequest(request);
  if (!payload) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422, headers: privateApiHeaders });
  const limiter = getAiRateLimiter();
  if (!limiter) return NextResponse.json({ error: { code: "trust_unavailable" } }, { status: 503, headers: privateApiHeaders });
  const rate = await limiter.check({ kind: "authenticated", userId: authenticated.userId, rateLimitKey: `user:${authenticated.userId}` }, "ai_vin");
  if (!rate.allowed) return NextResponse.json({ error: { code: "rate_limited" } }, { status: 429, headers: { ...privateApiHeaders, ...(rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : {}) } });
  const result = await inspectOwnListingVinTrust(authenticated, payload.listingId);
  if (result.kind === "forbidden") return NextResponse.json({ error: { code: "forbidden" } }, { status: 403, headers: privateApiHeaders });
  if (result.kind === "unavailable") return NextResponse.json({ error: { code: "trust_unavailable" } }, { status: 503, headers: privateApiHeaders });
  return NextResponse.json({ data: result.data }, { headers: privateApiHeaders });
}

async function parseRequest(request: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
