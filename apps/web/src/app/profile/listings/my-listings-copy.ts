import { tr } from "@/i18n/dictionaries/tr";
import { getDictionary } from "@/i18n/get-dictionary";

/**
 * Seller-listing copy is sourced only from the canonical dictionary domain.
 * This mapper retains safe database-error presentation without a second
 * locale-specific UI map.
 */
export type MyListingsCopy = typeof tr.myListings;

export function getMyListingsCopy(locale?: string | null): MyListingsCopy {
  return getDictionary(locale).myListings as MyListingsCopy;
}

export function getMyListingsLifecycleErrorMessage(error: unknown, copy: MyListingsCopy): string {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";

  if (code === "OT401") return copy.authenticationRequired;
  if (code === "OT403") return copy.ownershipRequired;
  if (code === "OT404") return copy.listingNotFound;
  if (code === "OT409") return copy.listingStateChanged;
  if (code === "OT422") return copy.invalidAction;
  return copy.mutationFailure;
}
