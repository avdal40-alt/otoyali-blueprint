import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes, getModels } from "@/lib/queries/makes";
import { SellWizard } from "./_components/SellWizard";

export default async function SellPage() {
  const [makesResult, modelsResult, listingsResult] = await Promise.all([getMakes(), getModels(), getHomeListings()]);

  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-4xl">
        <SectionHeader title="Ilan yayinla" eyebrow="Sat" />
        <SellWizard makes={makesResult.data} models={modelsResult.data} listings={listingsResult.data} />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
