import { HomePageContent } from "@/components/home/HomePageContent";
import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes, getModels } from "@/lib/queries/makes";
import { getRequestLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const locale = getRequestLocale();
  const [listingsResult, makesResult, modelsResult, citiesResult] = await Promise.all([getHomeListings(12), getMakes(), getModels(), getCities()]);

  return (
    <HomePageContent
      listings={listingsResult.data}
      makes={makesResult.data}
      models={modelsResult.data}
      cities={citiesResult.data}
      error={listingsResult.error ?? makesResult.error ?? modelsResult.error}
      debugItems={[listingsResult, makesResult, modelsResult, citiesResult]}
      locale={locale}
    />
  );
}
