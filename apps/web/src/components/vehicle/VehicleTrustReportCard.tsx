const rows = [
  "Hasar kaydı kontrolü",
  "Sigorta ödemeleri",
  "Kilometre tutarlılığı",
  "Rehin / kısıtlama kontrolü",
  "Önceki ilan geçmişi"
];

export function VehicleTrustReportCard() {
  return (
    <section className="h-full rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-oto-text">OTOYALI güven raporu</h2>
          <p className="mt-1 text-sm leading-6 text-oto-muted">Kontroller hazır olduğunda güven raporu bu alanda gösterilecek.</p>
        </div>
        <span className="rounded-full border border-oto-border bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted">Yakında</span>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map((row) => (
          <div key={row} className="flex items-center justify-between gap-3 rounded-md border border-oto-border bg-white px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-oto-text">
              <span className="h-2 w-2 rounded-full bg-oto-muted/40" aria-hidden="true" />
              {row}
            </span>
            <span className="rounded-full bg-oto-surface px-2.5 py-1 text-[11px] font-black text-oto-muted">Yakında</span>
          </div>
        ))}
      </div>
      <button type="button" disabled className="mt-4 h-10 w-full rounded-md border border-oto-border bg-oto-surface text-sm font-bold text-oto-muted">
        OTOYALI güven raporu yakında
      </button>
      <p className="mt-3 text-xs font-semibold leading-5 text-oto-muted">
        Bu alan tamamlanmış bir ekspertiz veya resmi veri kontrolü iddiası taşımaz.
      </p>
    </section>
  );
}
