import Link from "next/link";
import { t } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { getVerticalPath, canUseVerticalCapability } from "@/lib/marketplace/verticals";
import type { MarketplaceVerticalConfig } from "@/lib/marketplace/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export function MarketplaceVerticalCard({
  vertical,
  locale,
  compact = false
}: {
  vertical: MarketplaceVerticalConfig;
  locale: Locale;
  compact?: boolean;
}) {
  const isActive = vertical.status === "active";
  const href = getVerticalPath(vertical, locale);
  const statusLabel = t(locale, `verticals.status.${vertical.status}`);
  const features = compact ? vertical.highlightKeys.slice(0, 2) : vertical.highlightKeys.slice(0, 3);

  return (
    <Link href={href} className="group block h-full">
      <Card variant="category" padding={compact ? "md" : "lg"} interactive className="h-full">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-oto bg-blue-50 text-oto-blue">
            <Icon name={vertical.icon} />
          </span>
          <Badge variant={isActive ? "active" : "neutral"}>{statusLabel}</Badge>
        </div>
        <h2 className={compact ? "mt-4 text-base font-black text-oto-text" : "mt-5 text-lg font-black text-oto-text"}>
          {t(locale, vertical.labelKey)}
        </h2>
        <p className="mt-2 text-sm leading-6 text-oto-muted">
          {t(locale, compact ? vertical.shortDescriptionKey : vertical.descriptionKey)}
        </p>
        {features.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {features.map((key) => (
              <span key={key} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-oto-blue">
                {t(locale, key)}
              </span>
            ))}
          </div>
        ) : null}
        <span className="mt-4 inline-flex text-xs font-black text-oto-blue opacity-0 transition group-hover:opacity-100">
          {canUseVerticalCapability(vertical, "canBrowse") ? t(locale, "verticals.capabilities.browse") : t(locale, "verticals.capabilities.learnMore")}
        </span>
      </Card>
    </Link>
  );
}
