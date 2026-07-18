import { notFound } from "next/navigation";
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
import { getServiceProviderBySlug } from "@/lib/queries/services";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getServiceCategory } from "@/features/services/domain/categories";
import {
  serviceBookingModeLabel,
  serviceBranchStatusLabel,
  serviceDurationLabel,
  servicePricingLabel
} from "@/features/services/domain/format";
import { isSafeServiceSlug } from "@/features/services/domain/slug";
import type { ServicePublicOffering } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({ params }: PageProps) {
  const locale = getRequestLocale();
  if (!isSafeServiceSlug(params.slug)) {
    return buildSeoMetadata({
      title: t(locale, "services.provider.notFoundTitle"),
      description: t(locale, "services.provider.notFoundDescription"),
      path: localizePath("/servisler", locale),
      noIndex: true
    });
  }

  const result = await getServiceProviderBySlug(params.slug);
  const provider = result.data.provider;
  if (!provider) {
    return buildSeoMetadata({
      title: t(locale, "services.provider.notFoundTitle"),
      description: t(locale, "services.provider.notFoundDescription"),
      path: localizePath(`/servisler/${params.slug}`, locale),
      noIndex: true
    });
  }

  return buildSeoMetadata({
    title: provider.business_name,
    description: provider.public_summary || t(locale, "services.provider.seoDescriptionFallback"),
    path: localizePath(`/servisler/${params.slug}`, locale),
    alternates: {
      tr: `/servisler/${params.slug}`,
      en: `/en/services/${params.slug}`
    }
  });
}

export default async function ServiceProviderPage({ params }: PageProps) {
  const locale = getRequestLocale();
  if (!isSafeServiceSlug(params.slug)) notFound();

  const result = await getServiceProviderBySlug(params.slug);
  const provider = result.data.provider;
  if (!provider) notFound();

  const offeringsByBranch = new Map<string, ServicePublicOffering[]>();
  for (const offering of result.data.offerings) {
    const branchOfferings = offeringsByBranch.get(offering.branch_id) ?? [];
    branchOfferings.push(offering);
    offeringsByBranch.set(offering.branch_id, branchOfferings);
  }

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-oto bg-blue-50 text-oto-blue">
              <Icon name="service" className="h-6 w-6" />
            </span>
            <Badge variant={provider.verification_status === "platform_reviewed" ? "active" : "neutral"}>
              {provider.verification_status === "platform_reviewed" ? t(locale, "services.provider.platformReviewed") : t(locale, "services.provider.publicProfile")}
            </Badge>
          </div>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-oto-text md:text-5xl">{provider.business_name}</h1>
            <p className="mt-4 text-base leading-7 text-oto-muted md:text-lg">{provider.public_summary || t(locale, "services.providers.summaryFallback")}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={localizePath("/ai-asistan", locale)} variant="secondary">
              {t(locale, "services.rif.cta")}
            </ButtonLink>
            <span className="inline-flex h-11 items-center rounded-button border border-oto-border bg-oto-surface px-4 text-sm font-black text-oto-muted">
              {t(locale, "services.contact.requestSoon")}
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-oto-muted">{t(locale, "services.provider.trustDisclaimer")}</p>
        </section>

        <section className="mt-8">
          <SectionHeader title={t(locale, "services.provider.branchesTitle")} eyebrow={t(locale, "services.providers.eyebrow")} />
          <div className="grid gap-4">
            {result.data.branches.map((branch) => (
              <Card key={branch.branch_id} padding="lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-oto-text">{branch.branch_name}</h2>
                    <p className="mt-2 text-sm font-semibold text-oto-muted">
                      {[branch.city, branch.district].filter(Boolean).join(" / ")}
                    </p>
                    {branch.public_address ? <p className="mt-1 text-sm font-semibold text-oto-muted">{branch.public_address}</p> : null}
                  </div>
                  <Badge variant={branch.branch_status === "active" ? "active" : "pending"}>{serviceBranchStatusLabel(branch.branch_status, locale)}</Badge>
                </div>
                {branch.branch_description ? <p className="mt-4 text-sm font-semibold leading-6 text-oto-muted">{branch.branch_description}</p> : null}
                <OfferingsList offerings={offeringsByBranch.get(branch.branch_id) ?? []} locale={locale} />
              </Card>
            ))}
          </div>
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function OfferingsList({ offerings, locale }: { offerings: ServicePublicOffering[]; locale: "tr" | "en" }) {
  if (offerings.length === 0) {
    return <p className="mt-5 rounded-md bg-oto-surface px-4 py-3 text-sm font-bold text-oto-muted">{t(locale, "services.offerings.empty")}</p>;
  }

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {offerings.map((offering) => {
        const category = getServiceCategory(offering.category_key);
        return (
          <div key={offering.offering_id} className="rounded-md border border-oto-border bg-oto-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-black text-oto-text">{offering.display_name}</h3>
              {category ? <Badge>{t(locale, category.labelKey)}</Badge> : null}
            </div>
            {offering.description ? <p className="mt-2 text-xs font-semibold leading-5 text-oto-muted">{offering.description}</p> : null}
            <div className="mt-3 grid gap-2 text-xs font-black text-oto-muted">
              <span>{servicePricingLabel({ pricingMode: offering.pricing_mode, minAmount: offering.price_min_amount, maxAmount: offering.price_max_amount, currency: offering.currency, locale })}</span>
              <span>{serviceDurationLabel({ minMinutes: offering.duration_min_minutes, maxMinutes: offering.duration_max_minutes, locale })}</span>
              <span>{serviceBookingModeLabel(offering.booking_mode, locale)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
