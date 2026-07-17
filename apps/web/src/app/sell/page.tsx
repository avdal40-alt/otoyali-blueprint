import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes } from "@/lib/queries/makes";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { localizePath } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import { canPublishVertical, getPublishVerticalFromSearchParam } from "@/lib/marketplace/publish";
import { getMarketplaceVertical } from "@/lib/marketplace/verticals";
import { SellWizard } from "./_components/SellWizard";

export default async function SellPage({
  searchParams
}: {
  searchParams?: { vertical?: string | string[] };
}) {
  const locale = getRequestLocale();
  const dictionary = getDictionary(locale);
  const verticalId = getPublishVerticalFromSearchParam(searchParams?.vertical);
  const vertical = getMarketplaceVertical(verticalId);

  if (!canPublishVertical(verticalId)) {
    return (
      <>
        <AppHeader />
        <PageContainer className="max-w-4xl">
          <SectionHeader title={String(dictionary.sell.title)} eyebrow={String(dictionary.sell.eyebrow)} />
          <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft md:p-6">
            <Badge>{t(locale, "verticals.status.coming_soon")}</Badge>
            <h1 className="mt-4 text-2xl font-black text-oto-text">{t(locale, vertical.labelKey)}</h1>
            <p className="mt-3 text-sm leading-6 text-oto-muted">{t(locale, "verticals.landing.publishUnavailable")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href={localizePath("/sell", locale)} variant="orange">
                {t(locale, "verticals.landing.publishCars")}
              </ButtonLink>
              <ButtonLink href={localizePath(vertical.routes.tr, locale)} variant="secondary">
                {t(locale, "verticals.capabilities.learnMore")}
              </ButtonLink>
            </div>
          </section>
        </PageContainer>
        <MarketplaceFooter />
        <MobileBottomNav />
      </>
    );
  }

  const [makesResult, listingsResult, citiesResult] = await Promise.all([getMakes(), getHomeListings(80), getCities()]);

  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-4xl">
        <SectionHeader title={String(dictionary.sell.title)} eyebrow={String(dictionary.sell.eyebrow)} />
        <div className="mb-5 rounded-oto border border-oto-border bg-white p-4 text-sm leading-6 text-oto-muted shadow-soft">
          {String(dictionary.sell.agreementPrefix)}{" "}
          <Link href={localizePath("/listing-rules", locale)} className="font-black text-oto-blue">
            {String(dictionary.sell.listingRules)}
          </Link>
          {" "}{String(dictionary.sell.agreementMiddle)}{" "}
          <Link href={localizePath("/terms", locale)} className="font-black text-oto-blue">
            {String(dictionary.sell.terms)}
          </Link>
          {" "}{String(dictionary.sell.agreementSuffix)}
        </div>
        <SellWizard makes={makesResult.data} models={[]} cities={citiesResult.data} listings={listingsResult.data} />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
