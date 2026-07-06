"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function AkisShareButton({
  title,
  listingId
}: {
  title: string;
  listingId?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const href = listingId ? `/akis?listing=${listingId}` : "/akis";
    const url = `${window.location.origin}${href}`;

    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button type="button" variant="secondary" onClick={share} className="h-10">
      {copied ? "Kopyalandı" : "Paylaş"}
    </Button>
  );
}
