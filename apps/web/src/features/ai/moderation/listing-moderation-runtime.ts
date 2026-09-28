import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { AuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { moderateListingText, type ModerationResult } from "./deterministic-text-moderation";

type ListingTextRow = { id: string; description: string | null; seller_notes: string | null };

/**
 * Private server boundary for future protected submit flows. It reads only the
 * authenticated owner's seller-entered text; generated titles are excluded.
 */
export async function moderateOwnListingText(authenticated: AuthenticatedRequestSupabase, listingId: string): Promise<{ kind: "ok"; result: ModerationResult } | { kind: "not_found" } | { kind: "persistence_unavailable" }> {
  const { data, error } = await authenticated.supabase.schema("marketplace").from("listings").select("id,description,seller_notes").eq("id", listingId).eq("seller_id", authenticated.userId).maybeSingle();
  if (error || !data) return { kind: "not_found" };
  const listing = data as ListingTextRow;
  const result = moderateListingText({ description: listing.description, sellerNotes: listing.seller_notes });
  const persisted = await persistDeterministicModerationRun(listing.id, authenticated.userId, result);
  return persisted ? { kind: "ok", result } : { kind: "persistence_unavailable" };
}

async function persistDeterministicModerationRun(listingId: string, actorUserId: string, result: ModerationResult) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return false;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: run, error: runError } = await supabase.schema("marketplace").from("listing_moderation_runs").insert({ listing_id: listingId, initiated_by_user_id: actorUserId, engine: "deterministic", ruleset_version: result.rulesetVersion, recommended_action: result.recommendedAction }).select("id").single();
  if (runError || !run?.id) return false;
  if (result.signals.length === 0) return true;
  const { error: signalsError } = await supabase.schema("marketplace").from("listing_moderation_signals").insert(result.signals.map((signal) => ({ run_id: run.id, code: signal.code, severity: signal.severity, confidence: signal.confidence, source: signal.source, field_name: signal.field, evidence_class: signal.evidence.matchClass, evidence_excerpt: signal.evidence.redactedExcerpt, rule_id: signal.evidence.ruleId, recommended_action: signal.recommendedAction })));
  if (!signalsError) return true;
  await supabase.schema("marketplace").from("listing_moderation_runs").delete().eq("id", run.id);
  return false;
}
