import "server-only";

import { createClient } from "@supabase/supabase-js";

export type PrivateVinMetadata = {
  checksumState: "valid" | "invalid" | "not_applicable" | "unknown";
  reviewState: "bound" | "review_required";
  provenance: "seller";
};

type PrivateVinRow = {
  checksum_state: PrivateVinMetadata["checksumState"];
  review_state: PrivateVinMetadata["reviewState"];
  provenance: PrivateVinMetadata["provenance"];
};

/**
 * The private VIN table grants no browser-role reads. This narrow server-only
 * reader deliberately selects metadata only: never the raw identifier,
 * fingerprint, or masked suffix.
 */
export async function readPrivateVinMetadata(vehicleProfileId: string): Promise<{ kind: "found"; metadata: PrivateVinMetadata } | { kind: "missing" } | { kind: "unavailable" }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return { kind: "unavailable" };
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.schema("vehicle").from("private_vins").select("checksum_state,review_state,provenance").eq("vehicle_profile_id", vehicleProfileId).maybeSingle();
  if (error) return { kind: "unavailable" };
  if (!data) return { kind: "missing" };
  const row = data as PrivateVinRow;
  if (!isMetadata(row)) return { kind: "unavailable" };
  return { kind: "found", metadata: { checksumState: row.checksum_state, reviewState: row.review_state, provenance: row.provenance } };
}

function isMetadata(row: PrivateVinRow): boolean {
  return ["valid", "invalid", "not_applicable", "unknown"].includes(row.checksum_state) && ["bound", "review_required"].includes(row.review_state) && row.provenance === "seller";
}
