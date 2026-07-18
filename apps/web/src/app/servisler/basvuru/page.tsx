import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ServiceApplicationForm } from "@/features/services/components/ServiceApplicationForm";
import { localizePath } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const locale = getRequestLocale();
  return buildSeoMetadata({
    title: t(locale, "services.apply.seoTitle"),
    description: t(locale, "services.apply.seoDescription"),
    path: localizePath("/servisler/basvuru", locale),
    noIndex: true,
    alternates: {
      tr: "/servisler/basvuru",
      en: "/en/services/apply"
    }
  });
}

export default function ServiceApplicationPage() {
  const locale = getRequestLocale();

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-soft md:p-8">
          <Badge>{t(locale, "services.apply.badge")}</Badge>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-oto-text md:text-5xl">{t(locale, "services.apply.title")}</h1>
            <p className="mt-4 text-base leading-7 text-oto-muted md:text-lg">{t(locale, "services.apply.subtitle")}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Card padding="md" variant="placeholder">
            <h2 className="text-sm font-black text-oto-text">{t(locale, "services.apply.truthfulTitle")}</h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-oto-muted">{t(locale, "services.apply.truthfulBody")}</p>
          </Card>
          <Card padding="md" variant="placeholder">
            <h2 className="text-sm font-black text-oto-text">{t(locale, "services.apply.reviewTitle")}</h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-oto-muted">{t(locale, "services.apply.reviewBody")}</p>
          </Card>
          <Card padding="md" variant="placeholder">
            <h2 className="text-sm font-black text-oto-text">{t(locale, "services.apply.noBookingTitle")}</h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-oto-muted">{t(locale, "services.apply.noBookingBody")}</p>
          </Card>
        </section>

        <section className="mt-8">
          <ServiceApplicationForm />
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
