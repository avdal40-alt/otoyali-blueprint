import { createClient } from "@supabase/supabase-js";

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

export function getSupabaseEnvStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  let domain: string | null = null;

  try {
    domain = url ? new URL(url).hostname : null;
  } catch {
    domain = null;
  }

  return {
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
    urlDomain: domain,
    keyType: anonKey.startsWith("sb_publishable_") ? "publishable" : anonKey.startsWith("eyJ") ? "legacy-anon-jwt" : anonKey ? "present" : "missing"
  };
}

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
