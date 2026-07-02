import type { ListingMedia } from "@/lib/supabase/types";

export function VehicleGallery({ media, title }: { media: ListingMedia[]; title: string }) {
  const cover = media[0];

  return (
    <div className="space-y-3">
      <div className="aspect-[16/10] overflow-hidden rounded-oto bg-oto-surface md:aspect-[21/9]">
        {cover ? (
          <img src={cover.url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-lg font-black text-oto-muted">OTOYALI</div>
        )}
      </div>
      {media.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {media.slice(1, 5).map((item) => (
            <div key={item.media_id} className="aspect-[4/3] overflow-hidden rounded-md bg-oto-surface">
              <img src={item.url} alt={title} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
