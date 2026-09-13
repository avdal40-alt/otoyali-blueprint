import { getCities } from "@/lib/queries/cities";
import { getMakes, getModels } from "@/lib/queries/makes";
import { parseSearchParams } from "@/lib/search/search-params";
import { searchListings } from "@/lib/search/server-search";
import { SearchClient } from "./_components/SearchClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialFilters = parseSearchParams(resolvedSearchParams);
  const [makesResult, modelsResult, citiesResult] = await Promise.all([getMakes(), getModels(), getCities()]);
  const listingsResult = await searchListings(initialFilters, {
    makes: makesResult.data,
    models: modelsResult.data,
    cities: citiesResult.data
  });

  return (
    <SearchClient
      listings={listingsResult.data}
      makes={makesResult.data}
      models={modelsResult.data}
      cities={citiesResult.data}
      initialFilters={initialFilters}
      nextCursor={listingsResult.nextCursor}
      error={listingsResult.error ?? makesResult.error ?? modelsResult.error}
      debugItems={[listingsResult, makesResult, modelsResult, citiesResult]}
    />
  );
}
