import "server-only";
import { getListingDetails } from "@/lib/queries/listings";
import type { AiRequest } from "../domain/types";
import { redactAiOutboundText } from "./redaction";

/** Replaces browser-provided listing fields with the canonical public projection. */
export async function buildServerAiContext(request: AiRequest): Promise<AiRequest> {
  const listingId = request.context.listing?.listingId;
  if (!listingId) return request;
  const result = await getListingDetails(listingId);
  const row = result.data;
  if (!row) return { ...request, context: { ...request.context, listing: undefined } };
  return {
    ...request,
    context: {
      ...request.context,
      listing: {
        listingId: row.listing_id,
        vertical: request.vertical,
        title: redactAiOutboundText(row.title ?? "").slice(0, 120) || null,
        priceAmount: row.price_amount ?? null,
        currency: row.currency ?? null,
        make: row.make_name ?? null,
        model: row.model_name ?? null,
        year: row.year ?? null,
        mileageKm: row.mileage_km ?? null,
        fuel: row.fuel_type ?? null,
        transmission: row.transmission ?? null,
        city: row.city ?? null,
        sellerType: row.seller_type ?? null,
        descriptionExcerpt: redactAiOutboundText(row.description ?? "").slice(0, 280) || null
      }
    }
  };
}
