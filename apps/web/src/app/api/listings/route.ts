import { NextRequest, NextResponse } from "next/server";
import { createListingSchema, listingWriteError, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });

  const payload = await parseBody(request, createListingSchema);
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });

  const { data, error } = await authenticated.supabase.rpc("create_own_listing_draft", {
    p_make_id: payload.makeId, p_model_id: payload.modelId, p_variant_id: payload.variantId,
    p_year: payload.year, p_mileage_km: payload.mileageKm, p_condition: payload.condition,
    p_fuel_type: payload.fuelType, p_transmission: payload.transmission, p_body_type: payload.bodyType,
    p_drive_type: payload.driveType, p_color: payload.color, p_engine_volume_l: payload.engineVolumeL,
    p_damage_state: payload.damageState, p_owner_count: payload.ownerCount, p_description: payload.description,
    p_price_amount_text: payload.priceAmount, p_currency: payload.currency, p_price_negotiable: payload.priceNegotiable,
    p_city: payload.city, p_city_id: payload.cityId, p_district_id: payload.districtId
  });
  if (error) {
    const publicError = listingWriteError(error);
    logListingWriteFailure("create", error, authenticated.userId);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return NextResponse.json({ error: "İlan işlemi tamamlanamadı." }, { status: 500, headers: privateApiHeaders });
  const result = row as { listing_id?: string; vehicle_profile_id?: string; created_at?: string };
  if (!result.listing_id || !result.vehicle_profile_id || !result.created_at) return NextResponse.json({ error: "İlan işlemi tamamlanamadı." }, { status: 500, headers: privateApiHeaders });
  return NextResponse.json({ data: { listingId: result.listing_id, vehicleProfileId: result.vehicle_profile_id, createdAt: result.created_at } }, { status: 201, headers: privateApiHeaders });
}

async function parseBody<T>(request: NextRequest, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }) {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
