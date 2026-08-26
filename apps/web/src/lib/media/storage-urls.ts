import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function storageObjectPathFromUrl(value: string | null | undefined, bucket: string) {
  if (!value?.trim()) return null;

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
    const path = decodeURIComponent(url.pathname.slice(marker.length));
    return path && !path.startsWith("/") ? path : null;
  } catch {
    return null;
  }
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
