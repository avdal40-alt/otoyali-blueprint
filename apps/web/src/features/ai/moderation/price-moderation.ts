import "server-only";

import type { PriceIntelligenceAvailable, PriceIntelligenceResult } from "../price/price-intelligence";

export const PRICE_MODERATION_POLICY_VERSION = "ai-01g-c2c-v1";

/**
 * Moderation deliberately demands stronger evidence than buyer-facing price
 * positioning. It consumes the canonical Price Intelligence result and never
 * performs its own comparable lookup, currency conversion, or outlier pass.
 */
export function evaluatePriceModeration(result: PriceIntelligenceResult): PriceModerationSignal | null {
  if (!isStrongComparableEvidence(result)) return null;
  const outsideObservedRange = result.targetPrice < result.lowerObservedPrice || result.targetPrice > result.upperObservedPrice;
  const materiallyFarFromMedian = Math.abs(result.differencePercent) >= 35;
  const extremeRelativePosition = result.relativePositionPercent <= 5 || result.relativePositionPercent >= 95;
  if (!outsideObservedRange || !materiallyFarFromMedian || !extremeRelativePosition) return null;
  return {
    code: "PRICE_ANOMALY",
    severity: "medium",
    confidence: result.coverage === "high" && result.comparableCount >= 10 ? "high" : "medium",
    source: "deterministic",
    field: "description",
    evidenceClass: "price-intelligence",
    evidence: "[price-outside-comparable-distribution]",
    ruleId: PRICE_MODERATION_POLICY_VERSION,
    recommendedAction: "review"
  };
}

export type PriceModerationSignal = {
  code: "PRICE_ANOMALY";
  severity: "medium";
  confidence: "medium" | "high";
  source: "deterministic";
  field: "description";
  evidenceClass: "price-intelligence";
  evidence: "[price-outside-comparable-distribution]";
  ruleId: string;
  recommendedAction: "review";
};

function isStrongComparableEvidence(result: PriceIntelligenceResult): result is PriceIntelligenceAvailable {
  return result.available
    && result.comparableCount >= 5
    && (result.coverage === "medium" || result.coverage === "high")
    && result.recency === "fresh"
    && (result.similarityTier === "strict" || result.similarityTier === "expanded");
}
