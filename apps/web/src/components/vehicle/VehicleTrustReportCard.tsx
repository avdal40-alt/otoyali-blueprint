const rows = [
  "Sahiplik geçmişi",
  "Hasar ve kaza kontrolü",
  "Rehin / kısıtlama kontrolü",
  "Kilometre tutarlılığı",
  "Önceki ilan geçmişi",
  "Servis / bakım kayıtları",
  "Piyasa fiyat analizi"
];

export function VehicleTrustReportCard() {
  return (
    <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-oto-text">OTOYALI güven raporu</h2>
          <p className="mt-1 text-sm leading-6 text-oto-muted">Satın almadan önce aracı daha yakından tanıyın.</p>
        </div>
        <span className="rounded-full border border-oto-border bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted">Yakında</span>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map((row) => (
          <div key={row} className="flex items-center justify-between gap-3 rounded-md bg-oto-surface px-3 py-2">
            <span className="text-sm font-semibold text-oto-text">{row}</span>
            <span className="text-xs font-black text-oto-muted">Yakında</span>
          </div>
        ))}
      </div>
      <button type="button" disabled className="mt-5 h-11 w-full rounded-md border border-oto-border bg-white text-sm font-bold text-oto-muted">
        Rapor yakında
      </button>
      <p className="mt-4 text-sm font-semibold leading-6 text-oto-muted">
        OTOYALI, araç alım satımını daha güvenli ve şeffaf hale getirmeyi hedefler.
      </p>
    </section>
  );
}
