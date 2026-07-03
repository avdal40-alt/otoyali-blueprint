import { HomePageContent } from "@/components/home/HomePageContent";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes, getModels } from "@/lib/queries/makes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [listingsResult, makesResult, modelsResult] = await Promise.all([getHomeListings(), getMakes(), getModels()]);

  return (
    <HomePageContent
      listings={listingsResult.data}
      makes={makesResult.data}
      models={modelsResult.data}
      error={listingsResult.error ?? makesResult.error ?? modelsResult.error}
      debugItems={[listingsResult, makesResult, modelsResult]}
      locale="tr"
    />
  );
}
