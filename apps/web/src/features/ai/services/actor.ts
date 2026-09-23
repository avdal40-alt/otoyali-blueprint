import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { AiActor } from "../domain/types";

export async function deriveAiActor(authorization: string | null, guestKey: string): Promise<AiActor> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!authorization?.startsWith("Bearer ") || !url || !key) return { kind: "guest", rateLimitKey: guestKey };
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user ? { kind: "authenticated", userId: data.user.id, rateLimitKey: `user:${data.user.id}` } : { kind: "guest", rateLimitKey: guestKey };
}
