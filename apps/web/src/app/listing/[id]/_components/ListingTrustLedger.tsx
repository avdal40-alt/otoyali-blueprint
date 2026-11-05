import { formatDate } from "@/lib/format";
import type { ListingDetailCopy } from "../listing-detail-copy";
import type { Locale } from "@/i18n/types";

export function ListingTrustLedger({
  copy,
  locale,
  publishedAt
}: {
  copy: ListingDetailCopy;
  locale: Locale;
  publishedAt: string | null;
}) {
  const facts = [
    { status: copy.trustSellerStatus, source: copy.trustSellerSource, scope: copy.trustSellerScope, freshness: null },
    { status: copy.trustPublishedStatus, source: copy.trustPublishedSource, scope: copy.trustPublishedScope, freshness: formatDate(publishedAt, locale) || copy.noInfo },
    { status: copy.trustExternalStatus, source: copy.trustExternalSource, scope: copy.trustExternalScope, freshness: null }
  ];

  return (
    <section className="mt-6 rounded-oto border border-oto-border bg-white p-5 shadow-soft" aria-labelledby="listing-trust-ledger-title">
      <h2 id="listing-trust-ledger-title" className="text-lg font-bold text-oto-text">{copy.trustLedgerTitle}</h2>
      <div className="mt-4 grid gap-3">
        {facts.map((fact) => (
          <div key={fact.status} className="rounded-md border border-oto-border p-3">
            <p className="text-sm font-black text-oto-text">{fact.status}</p>
            <p className="mt-1 text-xs font-bold text-oto-muted">{fact.source}{fact.freshness ? ` · ${fact.freshness}` : ""}</p>
            <p className="mt-2 text-sm leading-6 text-oto-muted">{fact.scope}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
