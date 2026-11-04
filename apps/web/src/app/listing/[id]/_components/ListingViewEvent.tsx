"use client";

import { useEffect } from "react";
import { rememberListingLocally } from "@/components/home/PersonalizedListings";

export function ListingViewEvent({ listingId }: { listingId: string }) {
  useEffect(() => {
    rememberListingLocally(listingId);
    void fetch(`/api/listings/${encodeURIComponent(listingId)}/view`, { method: "POST", credentials: "same-origin", keepalive: true });
  }, [listingId]);
  return null;
}
