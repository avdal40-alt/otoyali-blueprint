import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";

export default function AboutPage() {
  return (
    <>
      <AppHeader />
      <PageContainer className="max-w-4xl">
        <p className="text-sm font-bold uppercase tracking-wide text-oto-blue">OTOYALI</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-oto-text">AI-first transportation platform</h1>
        <p className="mt-5 text-lg leading-8 text-oto-muted">
          OTOYALI sadece bir arac pazaryeri degildir. Kullanici arac arama, ilan yayinlama, haber okuma ve gelecekteki
          ulasim gorevlerini tek yerde cozer.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Guest-first browsing", "Premium automotive UX", "Turkey-first foundation"].map((item) => (
            <div key={item} className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
              <h2 className="font-bold text-oto-text">{item}</h2>
              <p className="mt-2 text-sm leading-6 text-oto-muted">Sprint 1 sade, hizli ve genisletilebilir bir temel kurar.</p>
            </div>
          ))}
        </div>
        <ButtonLink href="/" className="mt-8">
          Ana sayfaya don
        </ButtonLink>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
