import type { ListingMedia } from "@/lib/supabase/types";

export type ImageVariant = "thumb" | "card" | "large" | "original";

export type ImageSource = Pick<
  ListingMedia,
  "url" | "original_url" | "large_url" | "card_url" | "thumb_url" | "processed_status"
>;

const variantFallbacks: Record<ImageVariant, Array<keyof ImageSource>> = {
  thumb: ["thumb_url", "card_url", "large_url", "url", "original_url"],
  card: ["card_url", "large_url", "url", "thumb_url", "original_url"],
  large: ["large_url", "original_url", "url", "card_url", "thumb_url"],
  original: ["original_url", "large_url", "url", "card_url", "thumb_url"]
};

export function getBestImageUrl(source: ImageSource | null | undefined, variant: ImageVariant = "card") {
  if (!source) return null;

  for (const key of variantFallbacks[variant]) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function getBestListingMedia(media: ListingMedia[], variant: ImageVariant = "card") {
  for (const item of media) {
    const url = getBestImageUrl(item, variant);
    if (url) return url;
  }

  return null;
}

export function isImageProcessing(media: ImageSource | null | undefined) {
  return media?.processed_status === "pending" || media?.processed_status === "processing";
}

export function isImageProcessingFailed(media: ImageSource | null | undefined) {
  return media?.processed_status === "failed";
}
