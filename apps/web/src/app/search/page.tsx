import { getHomeListings } from "@/lib/queries/listings";
import { getMakes, getModels } from "@/lib/queries/makes";
import { SearchClient } from "./_components/SearchClient";

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string; make?: string };
}) {
  const [listingsResult, makesResult, modelsResult] = await Promise.all([getHomeListings(), getMakes(), getModels()]);

  return (
    <SearchClient
      listings={listingsResult.data}
      makes={makesResult.data}
      models={modelsResult.data}
      initialQuery={searchParams.q}
      initialMake={searchParams.make}
      error={listingsResult.error ?? makesResult.error ?? modelsResult.error}
    />
  );
}
