import { ButtonLink } from "@/components/ui/Button";
import { getDictionary } from "@/i18n/get-dictionary";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

export function VideoTeaserSection({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const previews = [
    {
      title: String(dictionary.video.vehicleVideo),
      body: String(dictionary.video.vehicleVideoBody)
    },
    {
      title: String(dictionary.video.dealerDeals),
      body: String(dictionary.video.dealerDealsBody)
    },
    {
      title: String(dictionary.video.shortPromos),
      body: String(dictionary.video.shortPromosBody)
    }
  ];

  return (
    <section className="mt-10 overflow-hidden rounded-oto border border-oto-border bg-[#061A40] text-white shadow-oto">
      <div className="grid gap-6 p-5 md:grid-cols-[0.9fr_1.1fr] md:p-7">
        <div>
          <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-black text-[#061A40]">
            {String(dictionary.video.label)}
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">{String(dictionary.video.title)}</h2>
          <p className="mt-3 text-sm leading-6 text-blue-50">
            {String(dictionary.video.subtitle)}
          </p>
          <ButtonLink href={localizePath("/video", locale)} variant="orange" className="mt-5 w-full md:w-auto">
            {String(dictionary.video.discover)}
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
