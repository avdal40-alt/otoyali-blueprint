import { ButtonLink } from "@/components/ui/Button";

const previews = [
  {
    title: "Video ilanlar",
    body: "İlanı görmeden önce kısa tanıtımı izleyin."
  },
  {
    title: "Galeri fırsatları",
    body: "Galerilerden öne çıkan araçları hızlıca keşfedin."
  },
  {
    title: "Kısa araç tanıtımları",
    body: "Satıcıların 60 saniyeye kadar hazırladığı videolar."
  }
];

export function VideoTeaserSection() {
  return (
    <section className="mt-10 overflow-hidden rounded-oto border border-oto-border bg-[#061A40] text-white shadow-oto">
      <div className="grid gap-6 p-5 md:grid-cols-[0.9fr_1.1fr] md:p-7">
        <div>
          <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-black text-[#061A40]">
            Yeni
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">OTOYALI Video</h2>
          <p className="mt-3 text-sm leading-6 text-blue-50">
            Araç videoları, galeri fırsatları ve kısa tanıtımlar.
          </p>
          <p className="mt-2 text-sm leading-6 text-blue-100">
            Satıcılar araçlarını 60 saniyeye kadar kısa videolarla tanıtabilecek.
          </p>
          <ButtonLink href="/video" variant="orange" className="mt-5 w-full md:w-auto">
            Videoları keşfet
          </ButtonLink>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:items-stretch">
          {previews.map((preview, index) => (
            <div key={preview.title} className="rounded-md border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-oto-blue">
                {index + 1}
              </div>
              <h3 className="mt-4 text-base font-black">{preview.title}</h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-blue-100">{preview.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
