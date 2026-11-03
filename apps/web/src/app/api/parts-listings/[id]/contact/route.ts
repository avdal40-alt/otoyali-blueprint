import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

const idSchema = z.string().uuid();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401, headers: privateApiHeaders });
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Некорректный идентификатор объявления." }, { status: 422, headers: privateApiHeaders });
  const { data: reservation, error: reservationError } = await authenticated.supabase.rpc("reserve_parts_listing_seller_contact_disclosure", { p_listing_id: id.data });
  if (reservationError || !(reservation as { allowed?: boolean }[] | null)?.[0]?.allowed) return NextResponse.json({ error: "Контакт продавца сейчас недоступен." }, { status: reservationError ? 403 : 429, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("get_parts_listing_seller_contact", { p_listing_id: id.data });
  const phone = (data as { phone?: string }[] | null)?.[0]?.phone;
  if (error || !phone) return NextResponse.json({ error: "Контакт продавца сейчас недоступен." }, { status: 403, headers: privateApiHeaders });
  return NextResponse.json({ data: { phone } }, { headers: privateApiHeaders });
}
