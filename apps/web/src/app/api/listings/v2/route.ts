import { NextRequest, NextResponse } from "next/server";
import { createOwnVehicleMarketplaceV2Draft, createVehicleMarketplaceV2ListingSchema, logListingWriteFailure } from "@/lib/listings/server-write";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

// V2 is an explicit opt-in route. The existing /api/listings passenger-car
// endpoint retains its stable request and RPC contract until callers migrate.
export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Не удалось подтвердить авторизацию." }, { status: 401, headers: privateApiHeaders });

  const payload = await parseBody(request);
  if (!payload) return NextResponse.json({ error: "Некорректный запрос." }, { status: 422, headers: privateApiHeaders });

  const result = await createOwnVehicleMarketplaceV2Draft(authenticated, payload);
  if ("error" in result) {
    const error = result.error ?? { status: 500, message: "Не удалось выполнить операцию с объявлением." };
    if (result.rawError) logListingWriteFailure("create_v2", result.rawError, authenticated.userId);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: privateApiHeaders });
  }
  return NextResponse.json({ data: result.data }, { status: 201, headers: privateApiHeaders });
}

async function parseBody(request: NextRequest) {
  try {
    const parsed = createVehicleMarketplaceV2ListingSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
