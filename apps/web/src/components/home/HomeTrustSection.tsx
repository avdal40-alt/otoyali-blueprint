import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";

export function HomeTrustSection({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const items =
    locale === "en"
      ? [
          "Guest-first browsing: explore listings, search, and videos without creating an account.",
          "Secure login flow only when contacting a seller or publishing a listing.",
          "Future-ready foundation for OTOYALI trust reports and market price analysis."
        ]
      : [
          "Guest-first gezinme: ilanları, aramayı ve videoları kayıt olmadan keşfedin.",
          "Satıcıyla iletişim ve ilan yayınlama adımlarında güvenli giriş akışı.",
          "OTOYALI güven raporu ve piyasa analizi için şeffaf, geleceğe hazır altyapı."
        ];

  return (
    <section className="mt-10 rounded-oto border border-oto-border bg-oto-text p-5 text-white shadow-soft md:p-6">
      <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-oto-cyan">{String(dictionary.home.trustEyebrow)}</p>
          <h2 className="mt-2 text-2xl font-black">{String(dictionary.home.trustTitle)}</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">{String(dictionary.home.trustBody)}</p>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item} className="rounded-oto border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold leading-6 text-white/85">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
