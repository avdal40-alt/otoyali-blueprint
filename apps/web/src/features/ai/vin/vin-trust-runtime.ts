import "server-only";

import type { AuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { readPrivateVinMetadata } from "./vin-private-runtime";
import { notConfiguredVinTrustProvider, type VinTrustInspection } from "./vin-trust";

export async function inspectOwnListingVinTrust(authenticated: AuthenticatedRequestSupabase, listingId: string): Promise<{ kind: "ok"; data: VinTrustInspection } | { kind: "forbidden" } | { kind: "unavailable" }> {
  const { data, error } = await authenticated.supabase.rpc("get_own_rejected_listing_for_edit", { p_listing_id: listingId });
  const vehicleProfileId = data && typeof data === "object" ? (data as { listing?: { vehicle_profile_id?: unknown } }).listing?.vehicle_profile_id : null;
  if (error || typeof vehicleProfileId !== "string") return { kind: "forbidden" };

  const metadata = await readPrivateVinMetadata(vehicleProfileId);
  if (metadata.kind === "unavailable") return { kind: "unavailable" };
  if (metadata.kind === "missing") {
    return { kind: "ok", data: notConfiguredVinTrustProvider.inspect({ vinPresence: "missing", vinFormatStatus: "not_checked", reviewState: null, externalLookupRequested: false, externalProviderConfigured: false, externalProviderReachable: false, consentGranted: false }) };
  }

  return {
    kind: "ok",
    data: notConfiguredVinTrustProvider.inspect({
      vinPresence: "present",
      // A persisted reference passed the canonical 17-character structure
      // constraint. This is format validation only, never vehicle verification.
      vinFormatStatus: metadata.metadata.checksumState === "invalid" ? "invalid_structure" : "valid_structure",
      reviewState: metadata.metadata.reviewState,
      externalLookupRequested: false,
      externalProviderConfigured: false,
      externalProviderReachable: false,
      consentGranted: false
    })
  };
}
