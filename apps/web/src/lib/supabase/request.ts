import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { releaseHeaders } from "@/lib/release/compatibility";

export const privateApiHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization"
};

export type AuthenticatedRequestSupabase = {
  supabase: SupabaseClient;
  userId: string;
};

export async function requireAuthenticatedRequestSupabase(
  authorization: string | null
): Promise<AuthenticatedRequestSupabase | null> {
  if (!authorization?.startsWith("Bearer ")) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { ...releaseHeaders(), Authorization: authorization } }
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { supabase, userId: data.user.id };
}
