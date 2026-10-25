import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";
import { getAboutPageCopy } from "@/i18n/about-page-copy";
import { getRequestLocale } from "@/i18n/server";

export default async function AboutPage() {
  const copy = getAboutPageCopy(await getRequestLocale());

  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-wide text-oto-blue">{copy.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-oto-text">{copy.title}</h1>
        <p className="mt-5 text-lg leading-8 text-oto-muted">
          {copy.description}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {copy.pillars.map((pillar) => (
            <div key={pillar.title} className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
              <h2 className="font-bold text-oto-text">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-6 text-oto-muted">{pillar.body}</p>
            </div>
          ))}
        </div>
        <ButtonLink href="/" className="mt-8">
          {copy.home}
        </ButtonLink>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
