import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kısa bir bakımdayız",
  robots: { index: false, follow: false }
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-oto-bg px-6 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-oto-border bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-oto-primary">OTOYALI</p>
        <h1 className="mt-4 text-3xl font-black text-oto-text">Kısa bir bakımdayız</h1>
        <p className="mt-4 text-base leading-7 text-oto-muted">
          Daha güvenli bir deneyim için kısa bir güncelleme yapıyoruz. Lütfen birkaç dakika sonra yeniden deneyin.
        </p>
        <p className="mt-8 border-t border-oto-border pt-6 text-sm leading-6 text-oto-muted">
          We are completing a short update. Please try again in a few minutes.
        </p>
      </section>
    </main>
  );
}
