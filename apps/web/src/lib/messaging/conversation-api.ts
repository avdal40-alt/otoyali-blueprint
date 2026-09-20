import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { releaseHeaders } from "@/lib/release/compatibility";

export const privateResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization"
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestWindowMs = 60_000;
const requestLimits = { create: 12, send: 30, safety: 20 } as const;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

export type RequestSupabase = { supabase: SupabaseClient; userId: string };
export type Cursor = { limit: number; beforeAt: string | null; beforeId: string | null };
type RateLimitedAction = keyof typeof requestLimits;

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function getRequestSupabase(authorization: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { ...releaseHeaders(), Authorization: authorization } }
  });
}

export async function requireAuthenticatedRequest(authorization: string | null): Promise<RequestSupabase | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const supabase = getRequestSupabase(authorization);
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

export function parseCursor(searchParams: URLSearchParams, maxLimit: number): Cursor | null {
  const allowed = new Set(["limit", "beforeAt", "beforeId"]);
  for (const key of searchParams.keys()) if (!allowed.has(key) || searchParams.getAll(key).length !== 1) return null;
  const limitValue = searchParams.get("limit") ?? "20";
  if (!/^[1-9][0-9]*$/.test(limitValue)) return null;
  const limit = Number(limitValue);
  if (!Number.isSafeInteger(limit) || limit > maxLimit) return null;
  const beforeAt = searchParams.get("beforeAt");
  const beforeId = searchParams.get("beforeId");
  if ((beforeAt === null) !== (beforeId === null)) return null;
  if (beforeAt !== null && (!isUuid(beforeId!) || Number.isNaN(Date.parse(beforeAt)))) return null;
  return { limit, beforeAt, beforeId };
}

export function parseMessagePayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("text" in record) || typeof record.text !== "string") return null;
  if (Array.from(record.text).length > 2000 || record.text.trim().length === 0) return null;
  return record.text;
}

export function parseReadPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("messageId" in record) || typeof record.messageId !== "string") return null;
  const messageId = record.messageId.trim();
  return isUuid(messageId) ? messageId : null;
}

const reportReasons = new Set([
  "fraud",
  "wrong_information",
  "duplicate",
  "inappropriate_content",
  "suspicious_seller",
  "other"
]);

export function parseReportPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("reason" in record) || typeof record.reason !== "string") return null;
  const reason = record.reason.trim();
  return reportReasons.has(reason) ? reason : null;
}

export function rateLimit(userId: string, action: RateLimitedAction): number | null {
  const now = Date.now();
  const key = `${action}:${userId}`;
  const existing = requestBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + requestWindowMs } : existing;
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count <= requestLimits[action]) return null;
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}

export function publicRpcErrorStatus(code: string | null | undefined) {
  if (code === "OT401") return 401;
  if (code === "OT422") return 422;
  // Do not distinguish a missing conversation from one owned by another user.
  if (code === "OT403" || code === "OT404") return 404;
  return 500;
}

// This process-local limiter bounds accidental bursts without a new dependency.
// Durable cross-instance abuse enforcement remains a later infrastructure decision.
