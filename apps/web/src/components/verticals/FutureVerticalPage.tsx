import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";

export function FutureVerticalPage({
  title,
  description,
  ctaLabel,
  sections
}: {
  title: string;
  description: string;
  ctaLabel: string;
  sections: string[];
}) {
  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-soft md:p-8">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-oto-blue">Yakında</span>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-oto-text md:text-5xl">{title}</h1>
            <p className="mt-4 text-base leading-7 text-oto-muted md:text-lg">{description}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/search" variant="orange">{ctaLabel}</ButtonLink>
            <Link href="/" className="inline-flex h-11 items-center rounded-oto border border-oto-border px-5 text-sm font-black text-oto-text transition hover:bg-oto-surface">
              Ana sayfaya dön
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <div key={section} className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-black text-oto-text">{section}</h2>
                  <span className="rounded-full bg-oto-surface px-2 py-1 text-[11px] font-black text-oto-muted">Yakında</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
          <p className="text-sm font-bold leading-6 text-oto-muted">
            Bu alan OTOYALI ekosisteminin gelecek kapsamı için hazırlanmıştır. Şu anda aktif ilan, teklif, servis rezervasyonu veya AI sonucu sunmaz.
          </p>
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
