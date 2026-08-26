import { redirect } from "next/navigation";

export default async function LegacyVideoRedirectPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const listing = Array.isArray(resolvedSearchParams.listing) ? resolvedSearchParams.listing[0] : resolvedSearchParams.listing;
  redirect(listing ? `/video?listing=${encodeURIComponent(listing)}` : "/video");
}
