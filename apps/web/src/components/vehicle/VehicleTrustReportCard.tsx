const rows = [
  "Sahiplik gecmisi",
  "Hasar ve kaza kontrolu",
  "Rehin / kisitlama kontrolu",
  "Kilometre tutarliligi",
  "Onceki ilan gecmisi",
  "Servis / bakim kayitlari",
  "Piyasa fiyat analizi"
];

export function VehicleTrustReportCard() {
  return (
    <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-oto-text">OTOYALI guven raporu</h2>
          <p className="mt-1 text-sm leading-6 text-oto-muted">Satin almadan once araci daha yakindan taniyin.</p>
        </div>
        <span className="rounded-full border border-oto-border bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted">Yakinda</span>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map((row) => (
          <div key={row} className="flex items-center justify-between gap-3 rounded-md bg-oto-surface px-3 py-2">
            <span className="text-sm font-semibold text-oto-text">{row}</span>
            <span className="text-xs font-black text-oto-muted">Yakinda</span>
          </div>
        ))}
      </div>
      <button type="button" disabled className="mt-5 h-11 w-full rounded-md border border-oto-border bg-white text-sm font-bold text-oto-muted">
        Rapor yakinda
      </button>
      <p className="mt-4 text-sm font-semibold leading-6 text-oto-muted">
        OTOYALI, arac alim satimini daha guvenli ve seffaf hale getirmeyi hedefler.
      </p>
    </section>
  );
}
