"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";

function getCopy(locale: string) {
  const copies = {
    ru: { copied: "Скопировано", share: "Поделиться" },
    kk: { copied: "Көшірілді", share: "Бөлісу" },
    en: { copied: "Copied", share: "Share" },
    "zh-CN": { copied: "已复制", share: "分享" }
  } as const;
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? copies[locale] : copies.ru;
}

export function VideoShareButton({
  title,
  listingId
}: {
  title: string;
  listingId?: string | null;
}) {
  const { locale } = useI18n();
  const copy = getCopy(locale);
  const [copied, setCopied] = useState(false);

  async function share() {
    const href = listingId ? `/video?listing=${listingId}` : "/video";
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
      {copied ? copy.copied : copy.share}
    </Button>
  );
}
