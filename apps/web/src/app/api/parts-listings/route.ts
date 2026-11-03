import { NextRequest, NextResponse } from "next/server";
import { createPartsListingSchema } from "@/lib/marketplace/parts-contract";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401, headers: privateApiHeaders });
  const body = await request.json().catch(() => null);
  const parsed = createPartsListingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Проверьте поля объявления." }, { status: 422, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("create_own_parts_listing_draft", {
    p_title: parsed.data.title, p_description: parsed.data.description ?? null, p_category: parsed.data.category,
    p_part_condition: parsed.data.partCondition, p_brand: parsed.data.brand ?? null, p_part_number: parsed.data.partNumber ?? null,
    p_compatible_vehicles: parsed.data.compatibleVehicles, p_price_amount_text: parsed.data.priceAmount,
    p_city_id: parsed.data.cityId, p_seller_contact_phone_id: parsed.data.sellerContactPhoneId
  });
  if (error || !data) return NextResponse.json({ error: "Не удалось сохранить черновик." }, { status: error?.code === "OT403" ? 403 : 422, headers: privateApiHeaders });
  return NextResponse.json({ data: { listingId: data } }, { status: 201, headers: privateApiHeaders });
}
