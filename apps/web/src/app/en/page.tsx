import { HomePageContent } from "@/components/home/HomePageContent";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes } from "@/lib/queries/makes";

export default async function EnglishHomePage() {
  const [listingsResult, makesResult] = await Promise.all([getHomeListings(), getMakes()]);

  return (
    <HomePageContent
      listings={listingsResult.data}
      makes={makesResult.data}
      error={listingsResult.error ?? makesResult.error}
      locale="en"
    />
  );
}
