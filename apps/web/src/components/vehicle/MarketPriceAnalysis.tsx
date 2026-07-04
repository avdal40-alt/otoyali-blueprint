import type { HomeListing, ListingDetails } from "@/lib/supabase/types";
import { formatPrice } from "@/lib/format";
import { analyzeMarketPrice, priceBadgeClass, priceBadgeLabel } from "@/lib/market-price/analysis";

export function MarketPriceAnalysis({ listing, comparables }: { listing: ListingDetails; comparables: HomeListing[] }) {
  const analysis = analyzeMarketPrice(listing, comparables);

  return (
    <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-oto-text">Piyasa fiyat analizi</h2>
          <p className="mt-1 text-sm leading-6 text-oto-muted">Benzer ilanlara göre fiyat karşılaştırması</p>
        </div>
        {analysis.status === "ready" ? (
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${priceBadgeClass(analysis.badge)}`}>
            {priceBadgeLabel(analysis.badge)}
          </span>
        ) : null}
      </div>

      {analysis.status === "insufficient" ? (
        <p className="mt-5 rounded-md bg-oto-surface p-4 text-sm font-semibold leading-6 text-oto-muted">{analysis.reason}</p>
      ) : (
        <div className="mt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <PriceMetric label="Ortalama piyasa fiyatı" value={formatPrice(analysis.averagePrice, listing.currency)} />
            <PriceMetric label="En düşük benzer fiyat" value={formatPrice(analysis.minPrice, listing.currency)} />
            <PriceMetric label="En yüksek benzer fiyat" value={formatPrice(analysis.maxPrice, listing.currency)} />
          </div>

          <div className="mt-5">
            <div className="relative h-3 rounded-full bg-gradient-to-r from-green-100 via-amber-100 to-red-100">
              <span
                className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-oto-text shadow-soft"
                style={{ left: `${analysis.positionPercent}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 grid grid-cols-3 text-xs font-bold text-oto-muted">
              <span>Daha uygun</span>
              <span className="text-center">Ortalama</span>
              <span className="text-right">Daha yüksek</span>
            </div>
          </div>

          <p className="mt-5 rounded-md bg-oto-surface p-4 text-sm font-semibold leading-6 text-oto-muted">
            {analysis.badge === "good"
              ? `Bu araç piyasa ortalamasından ${formatPrice(Math.abs(analysis.differenceFromAverage), listing.currency)} daha uygun.`
              : analysis.badge === "high"
                ? `Bu araç piyasa ortalamasından ${formatPrice(Math.abs(analysis.differenceFromAverage), listing.currency)} daha yüksek.`
                : "Bu araç piyasa ortalamasına yakın fiyatlandı."}
          </p>
          <p className="mt-3 text-xs font-semibold text-oto-muted">{analysis.comparableCount} benzer ilan üzerinden hesaplandı. Bu analiz mevcut ilan verilerine dayalı yardımcı bir gösterimdir.</p>
        </div>
      )}
    </section>
  );
}

function PriceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-oto-surface p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{label}</p>
      <p className="mt-1 text-base font-black text-oto-text">{value}</p>
    </div>
  );
}
