import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
const idSchema = z.string().uuid();
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401, headers: privateApiHeaders });
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Некорректный идентификатор объявления." }, { status: 422, headers: privateApiHeaders });
  const reservation = await authenticated.supabase.rpc("reserve_specialty_listing_seller_contact_disclosure" as never, { p_listing_id: id.data } as never);
  if (reservation.error || !(reservation.data as { allowed?: boolean }[] | null)?.[0]?.allowed) return NextResponse.json({ error: "Контакт продавца сейчас недоступен." }, { status: reservation.error ? 403 : 429, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("get_specialty_listing_seller_contact" as never, { p_listing_id: id.data } as never);
  const phone = (data as { phone?: string }[] | null)?.[0]?.phone;
  if (error || !phone) return NextResponse.json({ error: "Контакт продавца сейчас недоступен." }, { status: 403, headers: privateApiHeaders });
  return NextResponse.json({ data: { phone } }, { headers: privateApiHeaders });
}
