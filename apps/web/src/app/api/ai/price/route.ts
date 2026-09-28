import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAiFeatureEnabled } from "@/features/ai/feature-registry";
import { analyzePublicListingPrice } from "@/features/ai/price/price-runtime";
import { deriveAiActor } from "@/features/ai/services/actor";
import { getAiRateLimiter } from "@/features/ai/services/rate-limit";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ listingId: z.string().uuid() }).strict();
const headers = { "Cache-Control": "no-store, max-age=0" };

/** Public-listing-only, deterministic asking-price analysis. No client price inputs are accepted. */
export async function POST(request: NextRequest) {
  if (!isAiFeatureEnabled("ai_price")) return NextResponse.json({ error: "Price intelligence is unavailable." }, { status: 503, headers });
  const parsed = await parseRequest(request);
  if (!parsed) return NextResponse.json({ error: "Invalid request." }, { status: 422, headers });

  const actor = await deriveAiActor(request.headers.get("authorization"), `guest:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || "anonymous"}`);
  const limiter = getAiRateLimiter();
  if (!limiter) return NextResponse.json({ error: "Price intelligence is unavailable." }, { status: 503, headers });
  const rate = await limiter.check(actor, "ai_price");
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { ...headers, ...(rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : {}) } });

  const data = await analyzePublicListingPrice(parsed.listingId);
  return NextResponse.json({ data }, { headers });
}

async function parseRequest(request: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
