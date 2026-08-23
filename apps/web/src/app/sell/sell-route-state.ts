export type SellEditTarget =
  | { kind: "create" }
  | { kind: "edit"; listingId: string }
  | { kind: "invalid" };

type SellSearchParams = { edit?: string | string[] } | undefined;

const listingIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getSellEditTarget(searchParams: SellSearchParams): SellEditTarget {
  if (!searchParams || !Object.prototype.hasOwnProperty.call(searchParams, "edit")) {
    return { kind: "create" };
  }

  const rawValue = searchParams.edit;
  const value = Array.isArray(rawValue) && rawValue.length === 1 ? rawValue[0] : rawValue;
  if (typeof value !== "string" || !listingIdPattern.test(value)) {
    return { kind: "invalid" };
  }

  return { kind: "edit", listingId: value };
}

export function isCurrentEditTarget(
  routeListingId: string | null,
  loadedListingId: string | null,
  routeKey: string,
  loadedRouteKey: string | null
): boolean {
  return Boolean(routeListingId)
    && loadedListingId === routeListingId
    && loadedRouteKey === routeKey;
}

export type LatestRequestToken = Readonly<{
  generation: number;
  target: string;
}>;

export class LatestRequestGuard {
  private generation = 0;
  private target: string | null = null;

  setTarget(target: string): LatestRequestToken {
    if (this.target !== target) {
      this.target = target;
      this.generation += 1;
    }
    return this.currentToken();
  }

  begin(target: string): LatestRequestToken {
    this.target = target;
    this.generation += 1;
    return this.currentToken();
  }

  currentToken(): LatestRequestToken {
    return { generation: this.generation, target: this.target ?? "" };
  }

  isCurrent(token: LatestRequestToken): boolean {
    return token.generation === this.generation && token.target === this.target;
  }

  cancel(token: LatestRequestToken): void {
    if (this.isCurrent(token)) {
      this.generation += 1;
    }
  }

  invalidate(): void {
    this.generation += 1;
  }
}
