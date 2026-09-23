import { NextRequest, NextResponse } from "next/server";
import { editListingSchema, listingIdSchema, listingWriteError, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const listingId = listingIdSchema.safeParse((await context.params).id);
  if (!listingId.success) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401, headers: privateApiHeaders });
  const payload = await parseBody(request);
  if (!payload) return NextResponse.json({ error: "İstek geçerli değil." }, { status: 422, headers: privateApiHeaders });

  const { data, error } = await authenticated.supabase.rpc("save_own_rejected_listing", {
    p_listing_id: listingId.data, p_expected_listing_updated_at: payload.expectedListingUpdatedAt,
    p_expected_vehicle_updated_at: payload.expectedVehicleUpdatedAt, p_make_id: payload.makeId,
    p_model_id: payload.modelId, p_year: payload.year, p_mileage_km: payload.mileageKm,
    p_condition: payload.condition, p_fuel_type: payload.fuelType, p_transmission: payload.transmission,
    p_body_type: payload.bodyType, p_drive_type: payload.driveType, p_color: payload.color,
    p_engine_volume_l: payload.engineVolumeL, p_damage_state: payload.damageState,
    p_owner_count: payload.ownerCount, p_description: payload.description,
    p_price_amount_text: payload.priceAmount, p_currency: payload.currency,
    p_price_negotiable: payload.priceNegotiable, p_city: payload.city
  });
  if (error) {
    const publicError = listingWriteError(error);
    logListingWriteFailure("edit", error, authenticated.userId, listingId.data);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status, headers: privateApiHeaders });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return NextResponse.json({ error: "İlan işlemi tamamlanamadı." }, { status: 500, headers: privateApiHeaders });
  const result = row as Record<string, unknown>;
  return NextResponse.json({ data: {
    listingId: result.saved_listing_id, listingUpdatedAt: result.saved_listing_updated_at,
    vehicleUpdatedAt: result.saved_vehicle_updated_at, status: result.saved_status,
    moderationStatus: result.saved_moderation_status, title: result.saved_title,
    titleGenerated: result.saved_title_generated
  } }, { headers: privateApiHeaders });
}

async function parseBody(request: NextRequest) {
  try {
    const parsed = editListingSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
