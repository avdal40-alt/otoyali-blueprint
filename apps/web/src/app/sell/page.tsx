import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes, getModels } from "@/lib/queries/makes";
import { SellWizard } from "./_components/SellWizard";

export default async function SellPage() {
  const [makesResult, modelsResult, listingsResult, citiesResult] = await Promise.all([getMakes(), getModels(), getHomeListings(80), getCities()]);

  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-4xl">
        <SectionHeader title="İlan yayınla" eyebrow="Sat" />
        <div className="mb-5 rounded-oto border border-oto-border bg-white p-4 text-sm leading-6 text-oto-muted shadow-soft">
          İlan yayınlayarak{" "}
          <Link href="/listing-rules" className="font-black text-oto-blue">
            İlan Yayınlama Kuralları
          </Link>
          {" "}ve{" "}
          <Link href="/terms" className="font-black text-oto-blue">
            Kullanım Şartları
          </Link>
          kapsamında doğru ve güncel bilgi paylaşmayı kabul etmiş olursunuz.
        </div>
        <SellWizard makes={makesResult.data} models={modelsResult.data} cities={citiesResult.data} listings={listingsResult.data} />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
