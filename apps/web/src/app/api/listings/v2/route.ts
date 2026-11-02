import { NextRequest, NextResponse } from "next/server";
import { createOwnVehicleMarketplaceV2Draft, createVehicleMarketplaceV2ListingSchema, editVehicleMarketplaceV2ListingSchema, listingIdSchema, logListingWriteFailure, saveOwnVehicleMarketplaceV2Listing } from "@/lib/listings/server-write";
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

export async function PATCH(request: NextRequest) {
  const listingId = listingIdSchema.safeParse(new URL(request.url).searchParams.get("listingId"));
  if (!listingId.success) return NextResponse.json({ error: "Некорректный запрос." }, { status: 422, headers: privateApiHeaders });
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Не удалось подтвердить авторизацию." }, { status: 401, headers: privateApiHeaders });
  const payload = await parseEditBody(request);
  if (!payload) return NextResponse.json({ error: "Некорректный запрос." }, { status: 422, headers: privateApiHeaders });
  const result = await saveOwnVehicleMarketplaceV2Listing(authenticated, listingId.data, payload);
  if ("error" in result) {
    const error = result.error ?? { status: 500, message: "Не удалось выполнить операцию с объявлением." };
    if (result.rawError) logListingWriteFailure("edit_v2", result.rawError, authenticated.userId, listingId.data);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: privateApiHeaders });
  }
  return NextResponse.json({ data: result.data }, { headers: privateApiHeaders });
}

async function parseBody(request: NextRequest) {
  try {
    const parsed = createVehicleMarketplaceV2ListingSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

async function parseEditBody(request: NextRequest) {
  try {
    const parsed = editVehicleMarketplaceV2ListingSchema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
