"use client";

import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { readAiCopy } from "./copy";

export function AssistantDisclaimer() {
  const { locale } = useI18n();

  return (
    <p className="rounded-md bg-oto-surface p-3 text-xs font-semibold leading-5 text-oto-muted">
      {readAiCopy(locale, "disclaimer")}{" "}
      <Link href={localizePath("/trust", locale)} className="font-black text-oto-blue hover:underline">
        {readAiCopy(locale, "openTrustCenter")}
      </Link>
    </p>
  );
}
