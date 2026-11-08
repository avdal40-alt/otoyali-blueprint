import type { Locale } from "@/i18n/types";

const otherByLocale: Record<Locale, string> = { ru: "Другое", kk: "Басқа", en: "Other", tr: "Diğer", "zh-CN": "其他" };

/** The `diger` catalog slug is a generic catch-all, not a brand proper name. */
export function catalogDisplayName(name: string | null | undefined, slug: string | null | undefined, locale: Locale): string {
  return slug === "diger" || name === "Diğer" ? otherByLocale[locale] : (name?.trim() || "");
}
