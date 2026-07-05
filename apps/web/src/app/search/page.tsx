import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getListingMediaForListings } from "@/lib/queries/media";
import { getMakes, getModels } from "@/lib/queries/makes";
import { parseSearchParams } from "@/lib/search/search-params";
import { SearchClient } from "./_components/SearchClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [listingsResult, makesResult, modelsResult, citiesResult] = await Promise.all([getHomeListings(), getMakes(), getModels(), getCities()]);
  const mediaResult = await getListingMediaForListings(listingsResult.data.map((listing) => listing.listing_id));

  return (
    <SearchClient
      listings={listingsResult.data}
      listingMedia={mediaResult.data}
      makes={makesResult.data}
      models={modelsResult.data}
      cities={citiesResult.data}
      initialFilters={parseSearchParams(searchParams)}
      error={listingsResult.error ?? mediaResult.error ?? makesResult.error ?? modelsResult.error}
      debugItems={[listingsResult, mediaResult, makesResult, modelsResult, citiesResult]}
    />
  );
}
