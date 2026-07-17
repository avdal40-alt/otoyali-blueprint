import { getHomeFeaturedVerticals } from "@/lib/marketplace/verticals";
import type { Locale } from "@/i18n/types";
import { MarketplaceVerticalCard } from "@/components/verticals/MarketplaceVerticalCard";

export function PrimaryCategoryStrip({ locale = "tr" }: { locale?: Locale }) {
  const categories = getHomeFeaturedVerticals();

  return (
    <section id="kategoriler" className="mt-6">
      <div className="grid gap-3 md:grid-cols-3">
        {categories.map((category) => (
          <MarketplaceVerticalCard key={category.id} vertical={category} locale={locale} compact />
        ))}
      </div>
    </section>
  );
}
