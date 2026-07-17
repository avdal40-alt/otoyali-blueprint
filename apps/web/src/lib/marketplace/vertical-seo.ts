import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import { t } from "@/i18n/get-dictionary";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import type { MarketplaceVerticalId } from "./types";
import { getMarketplaceVertical } from "./verticals";

export function buildVerticalSeoMetadata(verticalId: MarketplaceVerticalId) {
  const locale = getRequestLocale();
  const vertical = getMarketplaceVertical(verticalId);
  const localizedPath = localizePath(vertical.routes.tr, locale);

  return buildSeoMetadata({
    title: t(locale, vertical.seoTitleKey),
    description: t(locale, vertical.seoDescriptionKey),
    path: localizedPath,
    noIndex: !vertical.seoIndexable,
    alternates: {
      tr: vertical.routes.tr,
      en: localizePath(vertical.routes.tr, "en")
    }
  });
}
