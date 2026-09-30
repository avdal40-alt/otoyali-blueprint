import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { analyzePublicListingPrice } from "../price/price-runtime";
import { CONTEXTUAL_MODERATION_SCHEMA_VERSION, moderateListingWithContext } from "./contextual-moderation";
import { type ModerationResult } from "./deterministic-text-moderation";
import { analyzeOwnListingImages } from "./listing-image-moderation-runtime";
import { mergeMultimodalSignals, multimodalActionFor, type MultimodalAction } from "./multimodal-merge";
import { PRICE_MODERATION_POLICY_VERSION, evaluatePriceModeration } from "./price-moderation";

export const MULTIMODAL_MODERATION_SCHEMA_VERSION = "ai-01g-c2c-v1";
type ListingTextRow = { id: string; description: string | null; seller_notes: string | null };
type MultimodalSignal = {
  code: string;
  severity: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  source: "deterministic" | "contextual_ai" | "ai";
  field: "description" | "seller_notes";
  evidenceClass: string;
  evidence: string;
  ruleId: string;
  recommendedAction: MultimodalAction;
};

export type MultimodalModerationResult = {
  rulesetVersion: string;
  recommendedAction: MultimodalAction;
  signals: readonly MultimodalSignal[];
  sellerIssues: ModerationResult["sellerIssues"];
  contextualStatus: "ok" | "disabled" | "unavailable" | "invalid";
  imageStatus: "ok" | "not_found" | "unavailable" | "invalid" | "persistence_unavailable";
  priceStatus: "ok" | "unavailable";
};

/**
 * Canonical owner-authorized G-C boundary. Each run appends one combined,
 * privacy-minimized record and never mutates listing lifecycle or overrides.
 */
export async function moderateOwnListingText(authenticated: AuthenticatedRequestSupabase, listingId: string): Promise<{ kind: "ok"; result: MultimodalModerationResult } | { kind: "not_found" } | { kind: "persistence_unavailable" }> {
  const { data, error } = await authenticated.supabase.schema("marketplace").from("listings").select("id,description,seller_notes").eq("id", listingId).eq("seller_id", authenticated.userId).maybeSingle();
  if (error || !data) return { kind: "not_found" };
  const listing = data as ListingTextRow;
  const [text, image, price] = await Promise.all([
    moderateListingWithContext({ description: listing.description, sellerNotes: listing.seller_notes }),
    analyzeOwnListingImages(authenticated, listing.id),
    analyzePriceSafely(listing.id)
  ]);
  const signals = mergeSignals(text, image.kind === "ok" ? image.signals : [], price.result);
  const result: MultimodalModerationResult = {
    rulesetVersion: MULTIMODAL_MODERATION_SCHEMA_VERSION,
    recommendedAction: multimodalActionFor(signals),
    signals,
    sellerIssues: text.sellerIssues,
    contextualStatus: text.contextualStatus,
    imageStatus: image.kind,
    priceStatus: price.status
  };
  const persisted = await persistMultimodalModerationRun(listing.id, authenticated.userId, result);
  return persisted ? { kind: "ok", result } : { kind: "persistence_unavailable" };
}

async function analyzePriceSafely(listingId: string) {
  try { return { status: "ok" as const, result: await analyzePublicListingPrice(listingId) }; }
  catch { return { status: "unavailable" as const, result: null }; }
}

function mergeSignals(text: ModerationResult, imageSignals: readonly { code: string; confidence: "low" | "medium" | "high"; evidence: string; recommendedAction: "ask_edit" | "review" }[], priceResult: Awaited<ReturnType<typeof analyzePublicListingPrice>> | null): MultimodalSignal[] {
  const signals: MultimodalSignal[] = text.signals.map((signal) => ({ code: signal.code, severity: signal.severity, confidence: signal.confidence, source: signal.source, field: signal.field, evidenceClass: signal.evidence.matchClass, evidence: signal.evidence.redactedExcerpt, ruleId: signal.evidence.ruleId, recommendedAction: signal.recommendedAction }));
  for (const signal of imageSignals) signals.push({ code: signal.code, severity: signal.code === "POSSIBLE_VISIBLE_DAMAGE" ? "low" : "medium", confidence: signal.confidence, source: signal.code === "POSSIBLE_DUPLICATE_IMAGE" ? "deterministic" : "ai", field: "description", evidenceClass: "image-moderation", evidence: signal.evidence, ruleId: MULTIMODAL_MODERATION_SCHEMA_VERSION, recommendedAction: signal.recommendedAction });
  const priceSignal = priceResult ? evaluatePriceModeration(priceResult) : null;
  if (priceSignal) signals.push(priceSignal);
  return mergeMultimodalSignals(signals);
}

async function persistMultimodalModerationRun(listingId: string, actorUserId: string, result: MultimodalModerationResult) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return false;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: run, error: runError } = await supabase.schema("marketplace").from("listing_moderation_runs").insert({ listing_id: listingId, initiated_by_user_id: actorUserId, engine: "system", ruleset_version: MULTIMODAL_MODERATION_SCHEMA_VERSION, provider_id: null, model_id: null, prompt_schema_version: `${CONTEXTUAL_MODERATION_SCHEMA_VERSION}+${PRICE_MODERATION_POLICY_VERSION}`, recommended_action: result.recommendedAction }).select("id").single();
  if (runError || !run?.id) return false;
  if (result.signals.length === 0) return true;
  const { error: signalsError } = await supabase.schema("marketplace").from("listing_moderation_signals").insert(result.signals.map((signal) => ({ run_id: run.id, code: signal.code, severity: signal.severity, confidence: signal.confidence, source: signal.source, field_name: signal.field, evidence_class: signal.evidenceClass, evidence_excerpt: signal.evidence, rule_id: signal.ruleId, recommended_action: signal.recommendedAction })));
  if (!signalsError) return true;
  await supabase.schema("marketplace").from("listing_moderation_runs").delete().eq("id", run.id);
  return false;
}
