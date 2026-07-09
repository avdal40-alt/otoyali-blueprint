import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
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
  const [listingsResult, makesResult, modelsResult, citiesResult] = await Promise.all([getHomeListings(60), getMakes(), getModels(), getCities()]);

  return (
    <SearchClient
      listings={listingsResult.data}
      makes={makesResult.data}
      models={modelsResult.data}
      cities={citiesResult.data}
      initialFilters={parseSearchParams(searchParams)}
      error={listingsResult.error ?? makesResult.error ?? modelsResult.error}
      debugItems={[listingsResult, makesResult, modelsResult, citiesResult]}
    />
  );
}
