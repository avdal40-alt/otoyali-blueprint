import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-3xl">
        <h1 className="text-3xl font-black text-oto-text">Kullanim Sartlari</h1>
        <p className="mt-4 leading-7 text-oto-muted">
          OTOYALI, kullanicilarin arac ilanlarini goruntulemesine, aramasina ve yayinlamasina yardimci olan bir
          platformdur. Platformu kullanirken ilan bilgilerinin dogrulugundan ilan sahipleri sorumludur.
        </p>
      </PageContainer>
    </>
  );
}
