import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-3xl">
        <h1 className="text-3xl font-black text-oto-text">Kullanim Sartlari</h1>
        <p className="mt-4 leading-7 text-oto-muted">
          OTOYALI, kullanicilarin arac ilanlarini goruntulemesine ve yayinlamasina yardimci olan bir platformdur. Sprint
          1 hukuki metinleri prod yayin oncesinde son hale getirilecektir.
        </p>
      </PageContainer>
    </>
  );
}
