import { HomePageContent } from "@/components/home/HomePageContent";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes } from "@/lib/queries/makes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [listingsResult, makesResult] = await Promise.all([getHomeListings(), getMakes()]);

  return (
    <HomePageContent
      listings={listingsResult.data}
      makes={makesResult.data}
      error={listingsResult.error ?? makesResult.error}
      debugItems={[listingsResult, makesResult]}
      locale="tr"
    />
  );
}
