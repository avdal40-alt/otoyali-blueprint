import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { SERVICE_CATEGORIES, SERVICE_SPECIALIZATIONS, getServiceCategory, isServiceCategoryId } from "../domain/categories";
import type { ServicePublicProvider } from "@/lib/supabase/types";
import { serviceProviderStatusLabel } from "../domain/format";

type ServicesMarketplacePageProps = {
  locale: Locale;
  selectedCategory?: string | null;
  providers: ServicePublicProvider[];
};

const featuredCategoryIds = [
  "inspection",
  "periodic_maintenance",
  "diagnostics",
  "tires",
  "brakes",
  "body_repair",
  "ev_service",
  "towing"
];

export function ServicesMarketplacePage({ locale, selectedCategory, providers }: ServicesMarketplacePageProps) {
  const activeCategory = isServiceCategoryId(selectedCategory) ? getServiceCategory(selectedCategory) : null;

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-cyan-50 p-5 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-oto bg-blue-50 text-oto-blue">
              <Icon name="service" className="h-6 w-6" />
            </span>
            <Badge>{t(locale, "services.hero.badge")}</Badge>
          </div>
          <div className="mt-5 max-w-4xl">
            <h1 className="text-3xl font-black tracking-tight text-oto-text md:text-5xl">{t(locale, "services.hero.title")}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-oto-muted md:text-lg">{t(locale, "services.hero.subtitle")}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={localizePath("/servisler/basvuru", locale)} variant="orange">
              {t(locale, "services.joinNetwork.cta")}
            </ButtonLink>
            <ButtonLink href={localizePath("/trust", locale)} variant="secondary">
              {t(locale, "services.trust.cta")}
            </ButtonLink>
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title={t(locale, "services.categoriesTitle")} eyebrow={t(locale, "services.discoveryEyebrow")} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_CATEGORIES.filter((category) => featuredCategoryIds.includes(category.id)).map((category) => (
              <Link
                key={category.id}
                href={localizePath(`/servisler?category=${category.id}`, locale)}
                className="rounded-card border border-oto-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-oto-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oto-blue/20"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-oto-blue">
                  <Icon name={category.iconName} className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-sm font-black text-oto-text">{t(locale, category.labelKey)}</h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-oto-muted">{t(locale, category.descriptionKey)}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title={t(locale, "services.specializationsTitle")} eyebrow={t(locale, "services.specializationsEyebrow")} />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {SERVICE_SPECIALIZATIONS.map((specialization) => (
              <Card key={specialization.id} padding="sm" variant="placeholder">
                <h2 className="text-sm font-black text-oto-text">{t(locale, specialization.labelKey)}</h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-oto-muted">{t(locale, specialization.descriptionKey)}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-oto-blue">{t(locale, "services.providers.eyebrow")}</p>
              <h2 className="mt-1 text-2xl font-black text-oto-text">{activeCategory ? t(locale, activeCategory.labelKey) : t(locale, "services.providers.title")}</h2>
            </div>
            {activeCategory ? (
              <Link href={localizePath("/servisler", locale)} className="rounded-full border border-oto-border px-3 py-2 text-xs font-black text-oto-text">
                {t(locale, "services.filters.clearCategory")}
              </Link>
            ) : null}
          </div>

          {providers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <ProviderCard key={provider.provider_id} provider={provider} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t(locale, "services.empty.title")}
              body={t(locale, "services.empty.body")}
              href={localizePath("/servisler/basvuru", locale)}
              action={t(locale, "services.joinNetwork.cta")}
            />
          )}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card padding="lg">
            <Badge>{t(locale, "services.rif.badge")}</Badge>
            <h2 className="mt-4 text-2xl font-black text-oto-text">{t(locale, "services.rif.title")}</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "services.rif.body")}</p>
            <ButtonLink href={localizePath("/ai-asistan", locale)} variant="secondary" className="mt-5">
              {t(locale, "services.rif.cta")}
            </ButtonLink>
          </Card>
          <Card padding="lg">
            <Badge>{t(locale, "services.currentAvailability.badge")}</Badge>
            <h2 className="mt-4 text-2xl font-black text-oto-text">{t(locale, "services.currentAvailability.title")}</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "services.currentAvailability.body")}</p>
          </Card>
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function ProviderCard({ provider, locale }: { provider: ServicePublicProvider; locale: Locale }) {
  const categories = (provider.service_category_keys ?? [])
    .flatMap((key) => {
      const category = getServiceCategory(key);
      return category ? [category] : [];
    })
    .slice(0, 3);

  return (
    <Link
      href={localizePath(`/servisler/${provider.provider_slug}`, locale)}
      className="rounded-card border border-oto-border bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-oto-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oto-blue/20"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-oto bg-blue-50 text-oto-blue">
          <Icon name="service" className="h-5 w-5" />
        </span>
        <Badge variant={provider.verification_status === "platform_reviewed" ? "active" : "neutral"}>
          {serviceProviderStatusLabel("active", locale)}
        </Badge>
      </div>
      <h3 className="mt-4 text-lg font-black text-oto-text">{provider.business_name}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-oto-muted">{provider.public_summary || t(locale, "services.providers.summaryFallback")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[provider.primary_city, provider.primary_district].filter(Boolean).join(" / ") ? (
          <Badge>{[provider.primary_city, provider.primary_district].filter(Boolean).join(" / ")}</Badge>
        ) : null}
        <Badge>{t(locale, "services.providers.branchCount", { count: provider.branch_count ?? 0 })}</Badge>
      </div>
      {categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category.id} className="rounded-full bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted">
              {t(locale, category.labelKey)}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
