import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Trusted storage writer only. It never establishes seller ownership or finalizes media. */
function trustedStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) throw new Error("trusted_storage_unavailable");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Storage-only capability. Database mutations remain with the authenticated actor RPC. */
export const trustedSanitizedStorage = {
  upload(path: string, contents: Uint8Array) {
    return trustedStorageClient().storage.from("listing-media").upload(path, contents, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  },
  remove(paths: string[]) {
    return trustedStorageClient().storage.from("listing-media").remove(paths);
  }
};
