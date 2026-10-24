"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { getListingActionsCopy } from "./listing-actions-copy";

export function ShareListingButton({ title }: { title: string }) {
  const { locale } = useI18n();
  const copy = getListingActionsCopy(locale);
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
      {copied ? copy.copied : copy.share}
    </Button>
  );
}
