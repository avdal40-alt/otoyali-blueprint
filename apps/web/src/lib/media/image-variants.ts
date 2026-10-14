import type { ListingMedia } from "@/lib/supabase/types";

export type ImageVariant = "thumb" | "card" | "large" | "original";

export type ImageSource = Pick<
  ListingMedia,
  "url" | "original_url" | "large_url" | "card_url" | "thumb_url" | "processed_status" | "width" | "height"
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

const responsiveVariantWidths: Record<ImageVariant, number> = {
  thumb: 300,
  card: 800,
  large: 1600,
  original: 2400
};

const responsiveVariantOrder: Record<ImageVariant, ImageVariant[]> = {
  thumb: ["thumb", "card", "large", "original"],
  card: ["thumb", "card", "large", "original"],
  large: ["card", "large", "original"],
  original: ["card", "large", "original"]
};

const responsiveVariantFields: Record<ImageVariant, keyof ImageSource> = {
  thumb: "thumb_url",
  card: "card_url",
  large: "large_url",
  original: "original_url"
};

/**
 * Builds a conservative responsive source set from the existing sanitized
 * derivatives. A width is only advertised when the persisted original width
 * is known, because an incorrect `w` descriptor can make a browser select an
 * image that is smaller than it claims to be.
 */
export function getResponsiveImageSrcSet(source: ImageSource | null | undefined, variant: ImageVariant = "card") {
  if (!source || !Number.isFinite(source.width) || !source.width || source.width <= 0) return undefined;

  const candidates = responsiveVariantOrder[variant]
    .map((candidateVariant) => {
      // Do not use a fallback URL here: its encoded dimensions may not match
      // the descriptor for this candidate. `src` below retains the legacy
      // fallback order when a derivative is absent.
      const value = source[responsiveVariantFields[candidateVariant]];
      const url = typeof value === "string" && value.trim() ? value.trim() : null;
      const width = Math.min(source.width as number, responsiveVariantWidths[candidateVariant]);
      return url ? { url, width } : null;
    })
    .filter((candidate): candidate is { url: string; width: number } => Boolean(candidate));

  const unique = Array.from(new Map(candidates.map((candidate) => [`${candidate.url}|${candidate.width}`, candidate])).values())
    .sort((left, right) => left.width - right.width);
  return unique.length > 1 ? unique.map(({ url, width }) => `${url} ${width}w`).join(", ") : undefined;
}

export function isImageProcessing(media: ImageSource | null | undefined) {
  return media?.processed_status === "pending" || media?.processed_status === "processing";
}

export function isImageProcessingFailed(media: ImageSource | null | undefined) {
  return media?.processed_status === "failed";
}
