import "server-only";
import type { AiActor } from "../domain/types";
const buckets = new Map<string, { count: number; resetAt: number }>();
export type AiRateLimiter = { check(actor: AiActor, feature: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> };
export const localAiRateLimiter: AiRateLimiter = { async check(actor) { const now = Date.now(); const current = buckets.get(actor.rateLimitKey); const limit = actor.kind === "guest" ? 10 : 30; if (!current || current.resetAt <= now) { buckets.set(actor.rateLimitKey, { count: 1, resetAt: now + 60_000 }); return { allowed: true }; } if (current.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) }; current.count += 1; return { allowed: true }; } };
/** A distributed backend must replace this seam before production OpenAI traffic is enabled. */
export function getAiRateLimiter(): AiRateLimiter | null {
  if (process.env.NODE_ENV === "production" && process.env.AI_PROVIDER === "openai") return null;
  return localAiRateLimiter;
}
