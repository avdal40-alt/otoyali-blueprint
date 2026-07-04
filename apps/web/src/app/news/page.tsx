import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { NewsGrid } from "@/components/news/NewsGrid";
import { Badge } from "@/components/ui/Badge";
import { newsArticles } from "@/data/news";

export default function NewsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Otomotiv haberleri" eyebrow="Gundem" />
        <div className="mb-5 flex flex-wrap gap-2">
          {["Güncel", "Elektrikli", "Rehber", "Piyasa", "Güvenlik", "Bakım"].map((item) => (
            <Badge key={item}>{item}</Badge>
          ))}
        </div>
        <NewsGrid articles={newsArticles} />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
