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

// These RPCs are seller/dealer operational writes.  The database is the final
// authority, but API routes must fail before dispatching them for staff too.
const staffDeniedSellerRpcNames = new Set([
  "create_own_listing_draft", "create_own_listing_draft_v2", "create_own_private_listing_draft", "save_own_listing_edit", "save_own_rejected_listing",
  "save_own_listing_vehicle_trust_contract", "set_own_listing_seller_contact_phone", "submit_own_listing_for_review", "resubmit_own_listing_for_review",
  "pause_own_listing", "archive_own_listing", "raise_own_listing", "attach_own_active_listing_response", "sync_own_verified_account_phone",
  "initialize_own_vehicle_profile_ownership", "finalize_own_listing_sanitized_photo", "finalize_own_listing_sanitized_photo_v2", "set_own_listing_cover_media",
  "remove_own_listing_media", "get_own_listing_media_cleanup_task", "complete_own_listing_media_cleanup_task", "issue_own_listing_video_upload_intent",
  "finalize_own_listing_video_upload_intent", "replace_own_listing_video_upload_intent", "revoke_own_listing_video_upload_intent", "remove_own_listing_video",
  "apply_own_verified_galeri_excel_import", "create_own_dealer_post", "submit_own_dealer_verification", "create_own_dealer_feed_api_token",
  "revoke_own_dealer_feed_api_token", "manage_dealer_staff_member", "remove_dealer_staff_member", "create_dealer_lead", "update_dealer_lead",
  "add_dealer_lead_note", "schedule_dealer_lead_follow_up", "complete_dealer_lead_follow_up", "create_own_dealer_live_stream",
  "start_own_dealer_live_stream", "end_own_dealer_live_stream", "attach_own_dealer_live_listings"
]);

function guardSellerMutationRpcs(supabase: SupabaseClient, userId: string): SupabaseClient {
  const rpc = supabase.rpc.bind(supabase);
  return new Proxy(supabase, {
    get(target, property, receiver) {
      if (property !== "rpc") return Reflect.get(target, property, receiver);
      return async (functionName: string, args?: Record<string, unknown>, options?: Record<string, unknown>) => {
        if (!staffDeniedSellerRpcNames.has(functionName)) return rpc(functionName as never, args as never, options as never);
        const { data: isStaff, error } = await rpc("is_admin" as never, { uid: userId } as never);
        if (error || isStaff === true) return { data: null, error: { code: "OT403", message: "staff accounts cannot perform seller actions" } };
        return rpc(functionName as never, args as never, options as never);
      };
    }
  }) as SupabaseClient;
}

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

  return { supabase: guardSellerMutationRpcs(supabase, data.user.id), userId: data.user.id };
}
