"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ShareListingButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={() => void share()} className="w-full">
      {copied ? "Link kopyalandi" : "Paylas"}
    </Button>
  );
}
