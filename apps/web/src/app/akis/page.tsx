import { redirect } from "next/navigation";

export default function LegacyVideoRedirectPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const listing = Array.isArray(searchParams.listing) ? searchParams.listing[0] : searchParams.listing;
  redirect(listing ? `/video?listing=${encodeURIComponent(listing)}` : "/video");
}
