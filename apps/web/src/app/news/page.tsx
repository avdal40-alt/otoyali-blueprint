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
        <SectionHeader title="Автокөлік жаңалықтары" eyebrow="Шолу" />
        <div className="mb-5 flex flex-wrap gap-2">
          {["Жаңалық", "Электрлі көлік", "Нұсқаулық", "Нарық", "Қауіпсіздік", "Күтім"].map((item) => (
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
