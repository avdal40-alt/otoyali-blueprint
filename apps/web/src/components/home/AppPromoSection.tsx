import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";

export function AppPromoSection({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);

  return (
    <section className="mt-10 overflow-hidden rounded-oto border border-oto-border bg-oto-text p-5 text-white shadow-oto md:p-8">
      <div className="grid gap-6 md:grid-cols-[1fr_260px] md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-oto-cyan">{String(dictionary.home.appEyebrow)}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{String(dictionary.home.appTitle)}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            {String(dictionary.home.appBody)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex h-11 items-center rounded-md border border-white/20 px-4 text-sm font-bold text-white/55">{String(dictionary.home.appStoreSoon)}</span>
            <span className="inline-flex h-11 items-center rounded-md border border-white/20 px-4 text-sm font-bold text-white/55">{String(dictionary.home.googlePlaySoon)}</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-48 rounded-[28px] border border-white/20 bg-white/10 p-3">
          <div className="rounded-[20px] bg-white p-4 text-oto-text">
            <div className="h-2 w-16 rounded-full bg-oto-border" />
            <div className="mt-5 aspect-[4/3] rounded-md bg-oto-surface" />
            <div className="mt-4 h-3 w-4/5 rounded bg-oto-border" />
            <div className="mt-2 h-3 w-3/5 rounded bg-oto-border" />
            <div className="mt-5 h-9 rounded-md bg-oto-orange" />
          </div>
        </div>
      </div>
    </section>
  );
}
