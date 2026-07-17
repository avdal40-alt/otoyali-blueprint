import { SectionHeader } from "@/components/layout/PageContainer";
import { MarketplaceVerticalCard } from "@/components/verticals/MarketplaceVerticalCard";
import { getHomeFeaturedVerticals } from "@/lib/marketplace/verticals";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";

export function MarketplaceVerticalsSection({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const verticals = getHomeFeaturedVerticals();

  return (
    <section className="mt-10">
      <SectionHeader title={String(dictionary.home.ecosystem)} eyebrow={String(dictionary.home.explore)} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {verticals.map((vertical) => (
          <MarketplaceVerticalCard key={vertical.id} vertical={vertical} locale={locale} />
        ))}
      </div>
    </section>
  );
}
