import { NextRequest, NextResponse } from "next/server";
import { createSpecialtyListingSchema } from "@/lib/marketplace/specialty-contract";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401, headers: privateApiHeaders });
  const parsed = createSpecialtyListingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Проверьте поля объявления." }, { status: 422, headers: privateApiHeaders });
  const value = parsed.data;
  const { data, error } = await authenticated.supabase.rpc("create_own_specialty_listing_draft" as never, {
    p_vertical: value.vertical, p_title: value.title, p_description: value.description ?? null, p_category: value.category,
    p_brand: value.brand ?? null, p_model: value.model ?? null, p_condition: value.condition, p_year: value.year ?? null,
    p_engine_volume_cc: value.engineVolumeCc ?? null, p_length_cm: value.lengthCm ?? null, p_range_km: value.rangeKm ?? null,
    p_price_amount_text: value.priceAmount, p_city_id: value.cityId, p_seller_contact_phone_id: value.sellerContactPhoneId
  } as never);
  if (error || !data) return NextResponse.json({ error: "Не удалось сохранить черновик." }, { status: error?.code === "OT403" ? 403 : 422, headers: privateApiHeaders });
  return NextResponse.json({ data: { listingId: data } }, { status: 201, headers: privateApiHeaders });
}
