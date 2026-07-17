"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

export function ShareListingButton({ title }: { title: string }) {
  const { locale, dictionary } = useI18n();
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
      {copied ? (locale === "en" ? "Link copied" : "Link kopyalandı") : String(dictionary.listing.share)}
    </Button>
  );
}
