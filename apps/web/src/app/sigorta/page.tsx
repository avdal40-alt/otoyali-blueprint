import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { InsuranceInterestForm } from "@/features/insurance/components/InsuranceInterestForm";
import { getRequestLocale } from "@/i18n/server";
import { t } from "@/i18n/get-dictionary";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return buildVerticalSeoMetadata("insurance");
}

export default async function InsurancePage() {
  const locale = await getRequestLocale();
  const topics = ["mandatory", "comprehensive", "renewal"] as const;
  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-soft md:p-8">
          <p className="text-sm font-black text-oto-blue">{t(locale, "insurance.hero.badge")}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-oto-text md:text-5xl">{t(locale, "insurance.hero.title")}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-oto-muted md:text-lg">{t(locale, "insurance.hero.body")}</p>
        </section>
        <section className="mt-8">
          <SectionHeader title={t(locale, "insurance.topics.title")} eyebrow="Jolmod" />
          <div className="grid gap-4 md:grid-cols-3">
            {topics.map((topic) => <Card key={topic} padding="lg"><h2 className="text-lg font-black text-oto-text">{t(locale, `insurance.topics.${topic}.title`)}</h2><p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{t(locale, `insurance.topics.${topic}.body`)}</p></Card>)}
          </div>
        </section>
        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card padding="lg" variant="placeholder"><h2 className="text-xl font-black text-oto-text">{t(locale, "insurance.safety.title")}</h2><p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "insurance.safety.body")}</p></Card>
          <InsuranceInterestForm />
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
