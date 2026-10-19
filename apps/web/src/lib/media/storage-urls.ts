import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
export type ListingImageVariant = "thumb" | "card" | "large";

const FINALIZED_LISTING_MEDIA_PATH = new RegExp(
  "^public/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/(thumb|card|large)\\.webp$",
  "i"
);

function isAllowedStorageObjectPath(bucket: string, path: string) {
  return bucket !== "listing-media" || FINALIZED_LISTING_MEDIA_PATH.test(path);
}

function normalizedStorageObjectPath(value: string, bucket: string) {
  const path = value.trim();
  return path && !path.startsWith("/") && isAllowedStorageObjectPath(bucket, path) ? path : null;
}

export function storageObjectPathFromUrl(value: string | null | undefined, bucket: string) {
  if (!value?.trim()) return null;

  const directPath = normalizedStorageObjectPath(value, bucket);
  if (directPath) return directPath;

  try {
    const url = new URL(value);
    const encodedBucket = encodeURIComponent(bucket);
    const markers = [
      `/storage/v1/object/public/${encodedBucket}/`,
      `/storage/v1/object/authenticated/${encodedBucket}/`,
      `/storage/v1/object/sign/${encodedBucket}/`
    ];
    const marker = markers.find((candidate) => url.pathname.startsWith(candidate));
    if (!marker) return null;
    return normalizedStorageObjectPath(decodeURIComponent(url.pathname.slice(marker.length)), bucket);
  } catch {
    return null;
  }
}

export function finalizedListingMediaPath(
  value: string | null | undefined,
  variant: ListingImageVariant
) {
  const path = storageObjectPathFromUrl(value, "listing-media");
  if (!path || !FINALIZED_LISTING_MEDIA_PATH.test(path)) return null;
  return path.replace(/(?:thumb|card|large)\.webp$/i, `${variant}.webp`);
}

export async function signStorageUrl(
  supabase: SupabaseClient,
  bucket: string,
  value: string | null | undefined
) {
  const path = storageObjectPathFromUrl(value, bucket);
  if (!path) return null;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return error ? null : data.signedUrl;
}

export async function signStorageUrlMap(
  supabase: SupabaseClient,
  bucket: string,
  values: Array<string | null | undefined>
) {
  const uniqueValues = Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
  const signedEntries = await Promise.all(
    uniqueValues.map(async (value) => [value, await signStorageUrl(supabase, bucket, value)] as const)
  );
  return new Map(signedEntries);
}

export async function signImageStorageUrlMap(
  supabase: SupabaseClient,
  values: Array<string | null | undefined>
) {
  const [listingMedia, vehiclePhotos] = await Promise.all([
    signStorageUrlMap(supabase, "listing-media", values),
    signStorageUrlMap(supabase, "vehicle-photos", values)
  ]);
  return new Map(Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())))).map((value) => [
    value,
    listingMedia.get(value) ?? vehiclePhotos.get(value) ?? null
  ]));
}

export async function signListingImageVariantUrlMap(
  supabase: SupabaseClient,
  values: Array<string | null | undefined>,
  variant: ListingImageVariant
) {
  const uniqueValues = Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
  const signedEntries = await Promise.all(uniqueValues.map(async (value) => {
    const path = finalizedListingMediaPath(value, variant);
    if (!path) return [value, null] as const;
    const { data, error } = await supabase.storage.from("listing-media").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    return [value, error ? null : data.signedUrl] as const;
  }));
  return new Map(signedEntries);
}
