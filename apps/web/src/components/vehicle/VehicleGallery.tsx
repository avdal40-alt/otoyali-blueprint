import type { ListingMedia } from "@/lib/supabase/types";
import { SafeImage } from "@/components/ui/SafeImage";

export function VehicleGallery({ media, title, fallbackImageUrl }: { media: ListingMedia[]; title: string; fallbackImageUrl?: string | null }) {
  const cover = media[0];
  const coverUrl = cover?.url || fallbackImageUrl;

  return (
    <div className="space-y-3">
      <div className="aspect-[16/10] overflow-hidden rounded-oto bg-oto-surface md:aspect-[21/9]">
        <SafeImage src={coverUrl} alt={title} fallbackClassName="text-lg" />
      </div>
      {media.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {media.slice(1, 5).map((item) => (
            <div key={item.media_id ?? item.url} className="aspect-[4/3] overflow-hidden rounded-md bg-oto-surface">
              <SafeImage src={item.url} alt={title} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
