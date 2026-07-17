import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function MarketplaceListingCardShell({
  media,
  title,
  price,
  location,
  badges = [],
  specs,
  actions
}: {
  media: ReactNode;
  title: ReactNode;
  price?: ReactNode;
  location?: ReactNode;
  badges?: ReactNode[];
  specs?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card variant="listing" padding="none" className="overflow-hidden">
      <div className="grid gap-3 p-3 sm:grid-cols-[160px_1fr]">
        <div className="aspect-[4/3] overflow-hidden rounded-md bg-oto-surface">{media}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-base font-black text-oto-text">{title}</h2>
              {location ? <p className="mt-1 text-sm font-bold text-oto-muted">{location}</p> : null}
            </div>
            {price ? <p className="text-base font-black text-oto-text">{price}</p> : null}
          </div>
          {badges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <Badge key={index} variant="neutral">{badge}</Badge>
              ))}
            </div>
          ) : null}
          {specs ? <div className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{specs}</div> : null}
          {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </Card>
  );
}

export function MarketplaceListingDetailLayout({
  hero,
  summary,
  attributes,
  seller,
  children
}: {
  hero: ReactNode;
  summary: ReactNode;
  attributes?: ReactNode;
  seller?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        {hero}
        <div className="mt-5">{summary}</div>
        {attributes ? <div className="mt-5">{attributes}</div> : null}
        {children}
      </div>
      {seller ? <aside className="h-fit lg:sticky lg:top-24">{seller}</aside> : null}
    </div>
  );
}
