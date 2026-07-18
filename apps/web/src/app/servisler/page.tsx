import { ServicesMarketplacePage } from "@/features/services/components/ServicesMarketplacePage";
import { getServiceProviders } from "@/lib/queries/services";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import { t } from "@/i18n/get-dictionary";
import { isServiceCategoryId } from "@/features/services/domain/categories";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export function generateMetadata() {
  const locale = getRequestLocale();
  return buildSeoMetadata({
    title: t(locale, "services.seo.title"),
    description: t(locale, "services.seo.description"),
    path: localizePath("/servisler", locale),
    alternates: {
      tr: "/servisler",
      en: "/en/services"
    }
  });
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const locale = getRequestLocale();
  const rawCategory = readParam(searchParams?.category);
  const selectedCategory = isServiceCategoryId(rawCategory) ? rawCategory : null;
  const providersResult = await getServiceProviders({
    category: selectedCategory,
    limit: 24
  });

  return (
    <ServicesMarketplacePage
      locale={locale}
      selectedCategory={selectedCategory}
      providers={providersResult.data}
    />
  );
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
