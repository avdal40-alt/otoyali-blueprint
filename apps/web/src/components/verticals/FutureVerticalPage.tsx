import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { localizePath } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { MARKETPLACE_ATTRIBUTE_DEFINITIONS } from "@/lib/marketplace/attributes";
import type { MarketplaceVerticalId } from "@/lib/marketplace/types";
import {
  canUseVerticalCapability,
  getMarketplaceVertical
} from "@/lib/marketplace/verticals";
import { MarketplaceVerticalCard } from "./MarketplaceVerticalCard";

export function VerticalLandingPage({ verticalId }: { verticalId: MarketplaceVerticalId }) {
  const locale = getRequestLocale();
  const vertical = getMarketplaceVertical(verticalId);
  const isActive = vertical.status === "active";
  const attributes = MARKETPLACE_ATTRIBUTE_DEFINITIONS[vertical.id] ?? [];
  const related = vertical.relatedVerticalIds.map(getMarketplaceVertical).filter((item) => item.status !== "disabled").slice(0, 3);
  const primaryCtaHref = isActive ? localizePath("/search", locale) : localizePath("/search", locale);
  const primaryCtaLabel = isActive ? t(locale, "verticals.capabilities.browse") : t(locale, "verticals.landing.browseCars");

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-oto bg-blue-50 text-oto-blue">
              <Icon name={vertical.icon} className="h-6 w-6" />
            </span>
            <Badge variant={isActive ? "active" : "neutral"}>{t(locale, `verticals.status.${vertical.status}`)}</Badge>
          </div>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-oto-text md:text-5xl">{t(locale, vertical.labelKey)}</h1>
            <p className="mt-4 text-base leading-7 text-oto-muted md:text-lg">{t(locale, vertical.descriptionKey)}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={primaryCtaHref} variant="orange">{primaryCtaLabel}</ButtonLink>
            <Link href={localizePath("/", locale)} className="inline-flex h-11 items-center rounded-oto border border-oto-border px-5 text-sm font-black text-oto-text transition hover:bg-oto-surface">
              {t(locale, "futureVerticals.backHome")}
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title={t(locale, "verticals.landing.availableFeatures")} eyebrow={t(locale, "verticals.capabilities.available")} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vertical.highlightKeys.map((key) => (
              <Card key={key} variant="placeholder" padding="md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-black text-oto-text">{t(locale, key)}</h2>
                  <Badge>{isActive ? t(locale, "verticals.capabilities.available") : t(locale, "verticals.status.coming_soon")}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title={t(locale, "verticals.landing.attributeModel")} eyebrow={t(locale, "verticals.capabilities.supportsAttributes")} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attributes.slice(0, 6).map((attribute) => (
              <Card key={attribute.id} variant="default" padding="md">
                <h2 className="text-sm font-black text-oto-text">{t(locale, attribute.labelKey)}</h2>
                <p className="mt-2 text-xs font-bold leading-5 text-oto-muted">
                  {attribute.filterable ? t(locale, "verticals.landing.filterReady") : t(locale, "verticals.landing.publishOnly")}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
          <div className="grid gap-3 md:grid-cols-3">
            <CapabilityRow enabled={canUseVerticalCapability(vertical, "canSearch")} label={t(locale, "verticals.capabilities.search")} enabledLabel={t(locale, "verticals.capabilities.available")} unavailableLabel={t(locale, "verticals.status.coming_soon")} />
            <CapabilityRow enabled={canUseVerticalCapability(vertical, "canPublish")} label={t(locale, "verticals.capabilities.publish")} enabledLabel={t(locale, "verticals.capabilities.available")} unavailableLabel={t(locale, "verticals.status.coming_soon")} />
            <CapabilityRow enabled={canUseVerticalCapability(vertical, "canUploadVideo")} label={t(locale, "verticals.capabilities.uploadVideo")} enabledLabel={t(locale, "verticals.capabilities.available")} unavailableLabel={t(locale, "verticals.status.coming_soon")} />
          </div>
          <p className="mt-5 text-sm font-bold leading-6 text-oto-muted">
            {isActive ? t(locale, "verticals.landing.activeDisclaimer") : t(locale, "futureVerticals.disclaimer")}
          </p>
        </section>

        {related.length > 0 ? (
          <section className="mt-8">
            <SectionHeader title={t(locale, "verticals.landing.related")} eyebrow="OTOYALI" />
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <MarketplaceVerticalCard key={item.id} vertical={item} locale={locale} compact />
              ))}
            </div>
          </section>
        ) : null}
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

type FutureVerticalPageProps =
  | { verticalId: MarketplaceVerticalId }
  | {
      title: string;
      description: string;
      ctaLabel: string;
      sections: string[];
    };

export function FutureVerticalPage(props: FutureVerticalPageProps) {
  if ("verticalId" in props) {
    return <VerticalLandingPage verticalId={props.verticalId} />;
  }

  return <LegacyFutureFeaturePage {...props} />;
}

function CapabilityRow({
  enabled,
  label,
  enabledLabel,
  unavailableLabel
}: {
  enabled: boolean;
  label: string;
  enabledLabel: string;
  unavailableLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-oto-surface px-3 py-2 text-sm font-black">
      <span className="text-oto-text">{label}</span>
      <Badge variant={enabled ? "active" : "neutral"}>{enabled ? enabledLabel : unavailableLabel}</Badge>
    </div>
  );
}

function LegacyFutureFeaturePage({
  title,
  description,
  ctaLabel,
  sections
}: {
  title: string;
  description: string;
  ctaLabel: string;
  sections: string[];
}) {
  const locale = getRequestLocale();

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-soft md:p-8">
          <Badge>{t(locale, "futureVerticals.comingSoon")}</Badge>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-oto-text md:text-5xl">{title}</h1>
            <p className="mt-4 text-base leading-7 text-oto-muted md:text-lg">{description}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={localizePath("/search", locale)} variant="orange">{ctaLabel}</ButtonLink>
            <Link href={localizePath("/", locale)} className="inline-flex h-11 items-center rounded-oto border border-oto-border px-5 text-sm font-black text-oto-text transition hover:bg-oto-surface">
              {t(locale, "futureVerticals.backHome")}
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <Card key={section} variant="placeholder" padding="md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-black text-oto-text">{section}</h2>
                  <Badge>{t(locale, "futureVerticals.comingSoon")}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
          <p className="text-sm font-bold leading-6 text-oto-muted">{t(locale, "futureVerticals.disclaimer")}</p>
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
