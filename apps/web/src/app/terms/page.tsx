import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-3xl">
        <h1 className="text-3xl font-black text-oto-text">Kullanım Şartları</h1>
        <p className="mt-4 leading-7 text-oto-muted">
          OTOYALI, kullanıcıların araç ilanlarını görüntülemesine, aramasına ve yayınlamasına yardımcı olan bir
          platformdur. Platformu kullanırken ilan bilgilerinin doğruluğundan ilan sahipleri sorumludur.
        </p>
      </PageContainer>
    </>
  );
}
