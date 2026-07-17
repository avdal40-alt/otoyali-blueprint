import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes } from "@/lib/queries/makes";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { localizePath } from "@/i18n/config";
import { SellWizard } from "./_components/SellWizard";

export default async function SellPage() {
  const locale = getRequestLocale();
  const dictionary = getDictionary(locale);
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
