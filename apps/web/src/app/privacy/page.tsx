import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";

export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-3xl">
        <h1 className="text-3xl font-black text-oto-text">Gizlilik Politikasi</h1>
        <p className="mt-4 leading-7 text-oto-muted">
          OTOYALI, hesap, profil ve ilan yayinlama deneyimi icin gerekli minimum verileri kullanir. Kisisel verilerinizi
          sade, guvenli ve seffaf bir yaklasimla korumayi hedefler.
        </p>
      </PageContainer>
    </>
  );
}
