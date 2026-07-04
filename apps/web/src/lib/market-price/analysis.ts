import type { HomeListing, ListingDetails } from "@/lib/supabase/types";

export type PriceBadgeKind = "good" | "market" | "high";

export type PriceAnalysisResult = {
  status: "ready";
  comparableCount: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  differenceFromAverage: number;
  percentageDifference: number;
  badge: PriceBadgeKind;
  positionPercent: number;
};

export type PriceAnalysisUnavailable = {
  status: "insufficient";
  reason: string;
};

export type PriceAnalysis = PriceAnalysisResult | PriceAnalysisUnavailable;

type ComparableVehicle = {
  listing_id?: string | null;
  price_amount?: number | null;
  make_name?: string | null;
  model_name?: string | null;
  year?: number | null;
};

export function analyzeMarketPrice(current: ListingDetails | HomeListing, listings: HomeListing[]): PriceAnalysis {
  const currentPrice = Number(current.price_amount ?? 0);
  const currentYear = Number(current.year ?? 0);
  const makeName = normalize(current.make_name);
  const modelName = normalize(current.model_name);

  if (!currentPrice || !makeName || !modelName) {
    return { status: "insufficient", reason: "Piyasa analizi icin yeterli veri yok." };
  }

  const comparablePool = listings.filter((listing) => {
    if (listing.listing_id === current.listing_id) return false;
    return Number(listing.price_amount ?? 0) > 0 && normalize(listing.make_name) === makeName && normalize(listing.model_name) === modelName;
  });

  let comparables = comparablePool.filter((listing) => Number(listing.year ?? 0) === currentYear);

  if (comparables.length < 3 && currentYear) {
    comparables = comparablePool.filter((listing) => Math.abs(Number(listing.year ?? 0) - currentYear) <= 2);
  }

  if (comparables.length < 3) {
    comparables = comparablePool;
  }

  if (comparables.length < 3) {
    return { status: "insufficient", reason: "Piyasa analizi icin yeterli veri yok." };
  }

  return calculateAnalysis(currentPrice, comparables);
}

export function getPriceBadgeForListing(listing: HomeListing, listings: HomeListing[]) {
  const analysis = analyzeMarketPrice(listing, listings);
  return analysis.status === "ready" ? analysis.badge : null;
}

export function getPriceSuggestion(input: ComparableVehicle, listings: HomeListing[]) {
  const makeName = normalize(input.make_name);
  const modelName = normalize(input.model_name);
  const year = Number(input.year ?? 0);

  if (!makeName || !modelName) {
    return null;
  }

  const pool = listings.filter((listing) => {
    if (normalize(listing.make_name) !== makeName || normalize(listing.model_name) !== modelName) return false;
    if (!Number(listing.price_amount ?? 0)) return false;
    if (!year) return true;
    return Math.abs(Number(listing.year ?? 0) - year) <= 2;
  });

  if (pool.length < 3) {
    return null;
  }

  const prices = pool.map((listing) => Number(listing.price_amount)).sort((a, b) => a - b);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];
  const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);

  return {
    comparableCount: pool.length,
    averagePrice,
    minPrice,
    maxPrice
  };
}

export function priceBadgeLabel(kind: PriceBadgeKind) {
  if (kind === "good") return "İyi fiyat";
  if (kind === "high") return "Yüksek fiyat";
  return "Piyasa fiyatı";
}

export function priceBadgeClass(kind: PriceBadgeKind) {
  if (kind === "good") return "border-green-100 bg-green-50 text-green-700";
  if (kind === "high") return "border-red-100 bg-red-50 text-red-700";
  return "border-amber-100 bg-amber-50 text-amber-700";
}

function calculateAnalysis(currentPrice: number, comparables: HomeListing[]): PriceAnalysisResult {
  const prices = comparables.map((listing) => Number(listing.price_amount)).filter((price) => Number.isFinite(price) && price > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const differenceFromAverage = Math.round(currentPrice - averagePrice);
  const percentageDifference = averagePrice ? (differenceFromAverage / averagePrice) * 100 : 0;
  const badge = percentageDifference <= -5 ? "good" : percentageDifference > 5 ? "high" : "market";
  const range = maxPrice - minPrice;
  const rawPosition = range > 0 ? ((currentPrice - minPrice) / range) * 100 : 50;

  return {
    status: "ready",
    comparableCount: prices.length,
    averagePrice,
    minPrice,
    maxPrice,
    differenceFromAverage,
    percentageDifference,
    badge,
    positionPercent: Math.max(0, Math.min(100, rawPosition))
  };
}

function normalize(value?: string | null) {
  return value?.trim().toLocaleLowerCase("tr-TR") ?? "";
}
