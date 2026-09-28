export const PRICE_INTELLIGENCE_RULES = {
  minimumComparableCount: 3,
  maximumComparableCount: 60,
  maximumListingAgeDays: 365,
  freshListingAgeDays: 90,
  tiers: [
    { id: "strict", yearWindow: 2, mileageBaseWindow: 20_000, mileageFraction: 0.25, requiredSpecifications: ["fuel", "transmission", "bodyType"] },
    { id: "expanded", yearWindow: 4, mileageBaseWindow: 50_000, mileageFraction: 0.5, requiredSpecifications: ["fuel", "transmission"] },
    { id: "model", yearWindow: 7, mileageBaseWindow: 100_000, mileageFraction: 1, requiredSpecifications: [] }
  ]
} as const;

export type PriceSimilarityTier = (typeof PRICE_INTELLIGENCE_RULES.tiers)[number]["id"];
type PriceSpecification = "fuel" | "transmission" | "bodyType";
export type PriceReasonCode =
  | "same_make_model"
  | "same_condition"
  | "year_window"
  | "mileage_window"
  | "same_fuel"
  | "same_transmission"
  | "same_body_type"
  | "recent_listings"
  | "older_listings"
  | "limited_sample"
  | "outliers_excluded";

export type PriceComparable = {
  listingId: string;
  makeId: string | null;
  modelId: string | null;
  condition: string | null;
  year: number | null;
  mileageKm: number | null;
  fuel: string | null;
  transmission: string | null;
  bodyType: string | null;
  currency: string | null;
  priceAmount: number | null;
  publishedAt: string | null;
  publicEligible: boolean;
};

export type PriceIntelligenceUnavailable = {
  available: false;
  reason: "insufficient_comparables" | "invalid_target";
  rawComparableCount: number;
  usableComparableCount: number;
};

export type PriceIntelligenceAvailable = {
  available: true;
  currency: string;
  comparableCount: number;
  rawComparableCount: number;
  usableComparableCount: number;
  medianAskingPrice: number;
  lowerObservedPrice: number;
  upperObservedPrice: number;
  targetPrice: number;
  differenceFromMedian: number;
  differencePercent: number;
  relativePositionPercent: number;
  coverage: "low" | "medium" | "high";
  recency: "fresh" | "mixed" | "older";
  similarityTier: PriceSimilarityTier;
  reasons: PriceReasonCode[];
};

export type PriceIntelligenceResult = PriceIntelligenceUnavailable | PriceIntelligenceAvailable;

export type PriceComparableTier = {
  id: PriceSimilarityTier;
  candidates: PriceComparable[];
};

/**
 * Calculates factual asking-price statistics from a bounded public candidate
 * set. The caller supplies only Search v1 public projection rows; no provider
 * or language model participates in the calculation.
 */
export function calculatePriceIntelligence(
  target: PriceComparable,
  tiers: PriceComparableTier[],
  now = new Date()
): PriceIntelligenceResult {
  if (!isComparableTarget(target)) return unavailable("invalid_target");

  let lastRaw: PriceComparable[] = [];
  let lastUsable: PriceComparable[] = [];
  for (const tier of PRICE_INTELLIGENCE_RULES.tiers) {
    const candidates = tiers.find((item) => item.id === tier.id)?.candidates ?? [];
    const raw = uniqueCandidates(candidates).filter((candidate) => matchesTier(candidate, target, tier, now));
    const usable = excludeIqrOutliers(raw);
    lastRaw = raw;
    lastUsable = usable;
    if (usable.length >= PRICE_INTELLIGENCE_RULES.minimumComparableCount) {
      return available(target, tier.id, raw, usable, now);
    }
  }

  return {
    available: false,
    reason: "insufficient_comparables",
    rawComparableCount: lastRaw.length,
    usableComparableCount: lastUsable.length
  };
}

function isComparableTarget(target: PriceComparable) {
  return Boolean(
    target.publicEligible &&
      target.makeId &&
      target.modelId &&
      target.condition &&
      target.currency &&
      isPositiveInteger(target.priceAmount) &&
      isInteger(target.year) &&
      isNonNegativeInteger(target.mileageKm)
  );
}

function matchesTier(
  candidate: PriceComparable,
  target: PriceComparable,
  tier: (typeof PRICE_INTELLIGENCE_RULES.tiers)[number],
  now: Date
) {
  if (!candidate.publicEligible || candidate.listingId === target.listingId) return false;
  if (!isPositiveInteger(candidate.priceAmount) || candidate.currency !== target.currency) return false;
  if (candidate.makeId !== target.makeId || candidate.modelId !== target.modelId || candidate.condition !== target.condition) return false;
  if (!isInteger(candidate.year) || !isNonNegativeInteger(candidate.mileageKm) || !isRecent(candidate.publishedAt, now)) return false;
  if (Math.abs(candidate.year - target.year!) > tier.yearWindow) return false;
  if (Math.abs(candidate.mileageKm - target.mileageKm!) > mileageWindow(target.mileageKm!, tier)) return false;

  const requiredSpecifications = tier.requiredSpecifications as readonly PriceSpecification[];
  return requiredSpecifications.every((field) => candidate[field] !== null && candidate[field] === target[field]);
}

function available(target: PriceComparable, similarityTier: PriceSimilarityTier, raw: PriceComparable[], usable: PriceComparable[], now: Date): PriceIntelligenceAvailable {
  const prices = usable.map((candidate) => candidate.priceAmount!).sort((a, b) => a - b);
  const medianAskingPrice = median(prices);
  const freshCount = usable.filter((candidate) => isFresh(candidate.publishedAt, now)).length;
  const outliersExcluded = raw.length > usable.length;
  const reasons: PriceReasonCode[] = ["same_make_model", "same_condition", "year_window", "mileage_window"];
  const tier = PRICE_INTELLIGENCE_RULES.tiers.find((item) => item.id === similarityTier)!;
  const requiredSpecifications = tier.requiredSpecifications as readonly PriceSpecification[];
  if (requiredSpecifications.includes("fuel")) reasons.push("same_fuel");
  if (requiredSpecifications.includes("transmission")) reasons.push("same_transmission");
  if (requiredSpecifications.includes("bodyType")) reasons.push("same_body_type");
  reasons.push(freshCount === usable.length ? "recent_listings" : "older_listings");
  if (usable.length < 5) reasons.push("limited_sample");
  if (outliersExcluded) reasons.push("outliers_excluded");

  const differenceFromMedian = target.priceAmount! - medianAskingPrice;
  return {
    available: true,
    currency: target.currency!,
    comparableCount: usable.length,
    rawComparableCount: raw.length,
    usableComparableCount: usable.length,
    medianAskingPrice,
    lowerObservedPrice: nearestRank(prices, 0.1),
    upperObservedPrice: nearestRank(prices, 0.9),
    targetPrice: target.priceAmount!,
    differenceFromMedian,
    differencePercent: roundPercent((differenceFromMedian / medianAskingPrice) * 100),
    relativePositionPercent: roundPercent(relativePosition(target.priceAmount!, prices)),
    coverage: coverageFor(usable.length, similarityTier, freshCount),
    recency: freshCount === usable.length ? "fresh" : freshCount > 0 ? "mixed" : "older",
    similarityTier,
    reasons
  };
}

function unavailable(reason: PriceIntelligenceUnavailable["reason"]): PriceIntelligenceUnavailable {
  return { available: false, reason, rawComparableCount: 0, usableComparableCount: 0 };
}

function uniqueCandidates(candidates: PriceComparable[]) {
  return Array.from(new Map(candidates.slice(0, PRICE_INTELLIGENCE_RULES.maximumComparableCount).map((candidate) => [candidate.listingId, candidate])).values());
}

function excludeIqrOutliers(candidates: PriceComparable[]) {
  if (candidates.length < 4) return candidates;
  const prices = candidates.map((candidate) => candidate.priceAmount!).sort((a, b) => a - b);
  const q1 = nearestRank(prices, 0.25);
  const q3 = nearestRank(prices, 0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return candidates;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const filtered = candidates.filter((candidate) => candidate.priceAmount! >= lower && candidate.priceAmount! <= upper);
  return filtered.length >= PRICE_INTELLIGENCE_RULES.minimumComparableCount ? filtered : candidates;
}

function mileageWindow(mileageKm: number, tier: (typeof PRICE_INTELLIGENCE_RULES.tiers)[number]) {
  return Math.round(tier.mileageBaseWindow + mileageKm * tier.mileageFraction);
}

function median(values: number[]) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
}

function nearestRank(values: number[], percentile: number) {
  return values[Math.max(0, Math.ceil(values.length * percentile) - 1)];
}

function relativePosition(targetPrice: number, prices: number[]) {
  const lower = prices.filter((price) => price < targetPrice).length;
  const equal = prices.filter((price) => price === targetPrice).length;
  return ((lower + equal / 2) / prices.length) * 100;
}

function coverageFor(count: number, tier: PriceSimilarityTier, freshCount: number) {
  if (tier === "strict" && count >= 10 && freshCount >= 5) return "high" as const;
  if (count >= 5 && freshCount >= 1) return "medium" as const;
  return "low" as const;
}

function isRecent(value: string | null, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.valueOf() >= now.valueOf() - PRICE_INTELLIGENCE_RULES.maximumListingAgeDays * 86_400_000 && date.valueOf() <= now.valueOf();
}

function isFresh(value: string | null, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.valueOf() >= now.valueOf() - PRICE_INTELLIGENCE_RULES.freshListingAgeDays * 86_400_000 && date.valueOf() <= now.valueOf();
}

function isInteger(value: number | null): value is number { return typeof value === "number" && Number.isInteger(value); }
function isPositiveInteger(value: number | null): value is number { return isInteger(value) && value > 0 && Number.isSafeInteger(value); }
function isNonNegativeInteger(value: number | null): value is number { return isInteger(value) && value >= 0; }
function roundPercent(value: number) { return Math.round(value * 10) / 10; }
