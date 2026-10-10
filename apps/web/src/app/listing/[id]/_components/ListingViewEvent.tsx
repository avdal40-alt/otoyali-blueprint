"use client";

import { useEffect } from "react";

export function ListingViewEvent({ listingId }: { listingId: string }) {
  useEffect(() => {
    void fetch(`/api/listings/${encodeURIComponent(listingId)}/view`, { method: "POST", credentials: "same-origin", keepalive: true });
  }, [listingId]);
  return null;
}
