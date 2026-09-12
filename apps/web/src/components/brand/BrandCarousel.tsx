import type { Make } from "@/lib/supabase/types";
import { EmptyState } from "@/components/ui/States";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { BrandCard } from "./BrandCard";

export function BrandCarousel({ makes, locale = "tr" }: { makes: Make[]; locale?: Locale }) {
  const dictionary = getDictionary(locale);
  if (makes.length === 0) {
    return <EmptyState title={String(dictionary.home.noMakesTitle)} body={String(dictionary.home.noMakesBody)} />;
  }

  return (
    <div className="scrollbar-hide grid auto-cols-[minmax(160px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 md:grid-flow-row md:grid-cols-4">
      {makes.map((make) => <BrandCard key={make.make_id} make={make} locale={locale} />)}
    </div>
  );
}
