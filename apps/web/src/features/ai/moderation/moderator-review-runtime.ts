import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_QUEUE_LIMIT = 50;
const QUEUE_SCAN_LIMIT = MAX_QUEUE_LIMIT + 1;
const MAX_RELATED_RUNS = 256;
const MAX_SIGNALS = 1000;
const MAX_HISTORY = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASON_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export type ModeratorQueueItem = { listingId: string; moderationRunId: string; listingStatus: string; title: string; runCreatedAt: string; recommendation: "review"; highestSeverity: "low" | "medium" | "high" | null; signalCount: number; reasonCodes: string[]; sanitizedCoverPath: string | null };
export type ModeratorReviewDetail = { listing: { id: string; title: string; status: string; moderationStatus: string; createdAt: string; updatedAt: string | null }; currentModeration: { runId: string; recommendation: string; createdAt: string; engine: string; rulesetVersion: string; providerId: string | null; modelId: string | null; promptSchemaVersion: string | null; isCurrent: boolean }; signals: Array<{ code: string; severity: string; confidence: string; source: string; field: string | null; evidenceClass: string; evidence: string; recommendedAction: string }>; history: Array<{ runId: string; recommendation: string; createdAt: string; decision: string | null; reasonCode: string | null; decidedAt: string | null }>; sanitizedMedia: Array<{ mediaId: string; largePath: string; cardPath: string; thumbPath: string; isCover: boolean }> };
export class ModeratorReviewError extends Error { constructor(public readonly status: number, message: string) { super(message); } }

type Row = Record<string, unknown>;
const str = (row: Row, key: string) => typeof row[key] === "string" ? row[key] : "";
const severity = (rows: Row[]) => rows.reduce<"low" | "medium" | "high" | null>((current, row) => { const next = str(row, "severity") as "low" | "medium" | "high"; return !current || ["low", "medium", "high"].indexOf(next) > ["low", "medium", "high"].indexOf(current) ? next : current; }, null);
const validUuid = (value: string) => UUID_PATTERN.test(value);

export async function requireModerator(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { uid: userId });
  if (error) throw new ModeratorReviewError(500, "Admin yetkisi doğrulanamadı.");
  if (!data) throw new ModeratorReviewError(403, "Bu işlem için admin yetkisi gerekir.");
}

export async function getModeratorQueue(supabase: SupabaseClient, input: { limit?: number; cursor?: string | null }): Promise<{ items: ModeratorQueueItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), MAX_QUEUE_LIMIT);
  const cursor = decodeCursor(input.cursor ?? null);
  let runs = supabase.schema("marketplace").from("listing_moderation_runs").select("id,listing_id,recommended_action,created_at").eq("recommended_action", "review").order("created_at", { ascending: true }).order("id", { ascending: true }).limit(QUEUE_SCAN_LIMIT);
  if (cursor) runs = runs.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.runId})`);
  const { data: candidateRows, error: candidateError } = await runs;
  if (candidateError) throw new ModeratorReviewError(500, "Moderasyon kuyruğu yüklenemedi.");
  const candidates = (candidateRows ?? []) as Row[];
  if (!candidates.length) return { items: [], nextCursor: null };
  const listingIds = [...new Set(candidates.map((row) => str(row, "listing_id")).filter(validUuid))];
  const runIds = candidates.map((row) => str(row, "id")).filter(validUuid);
  const [{ data: listings, error: listingError }, { data: relatedRuns, error: relatedError }, { data: overrides, error: overrideError }, { data: signals, error: signalError }] = await Promise.all([
    supabase.schema("marketplace").from("listings").select("id,title,status,moderation_status,vehicle_profile_id").in("id", listingIds).eq("status", "draft").eq("moderation_status", "pending_review"),
    supabase.schema("marketplace").from("listing_moderation_runs").select("id,listing_id,created_at").in("listing_id", listingIds).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(MAX_RELATED_RUNS),
    supabase.schema("marketplace").from("listing_moderation_overrides").select("run_id").in("run_id", runIds),
    supabase.schema("marketplace").from("listing_moderation_signals").select("run_id,code,severity").in("run_id", runIds).limit(MAX_SIGNALS)
  ]);
  if (listingError || relatedError || overrideError || signalError) throw new ModeratorReviewError(500, "Moderasyon kuyruğu yüklenemedi.");
  const listingById = new Map(((listings ?? []) as Row[]).map((row) => [str(row, "id"), row]));
  const latestByListing = new Map<string, string>();
  for (const row of (relatedRuns ?? []) as Row[]) if (!latestByListing.has(str(row, "listing_id"))) latestByListing.set(str(row, "listing_id"), str(row, "id"));
  const resolved = new Set(((overrides ?? []) as Row[]).map((row) => str(row, "run_id")));
  const signalsByRun = groupBy((signals ?? []) as Row[], "run_id");
  const actionable = candidates.filter((run) => listingById.has(str(run, "listing_id")) && latestByListing.get(str(run, "listing_id")) === str(run, "id") && !resolved.has(str(run, "id"))).slice(0, limit);
  const profileIds = actionable.map((run) => str(listingById.get(str(run, "listing_id"))!, "vehicle_profile_id")).filter(validUuid);
  const mediaByProfile = await sanitizedMediaByProfile(supabase, profileIds, true);
  const items = actionable.map((run) => { const listing = listingById.get(str(run, "listing_id"))!; const runSignals = signalsByRun.get(str(run, "id")) ?? []; return { listingId: str(listing, "id"), moderationRunId: str(run, "id"), listingStatus: str(listing, "status"), title: str(listing, "title"), runCreatedAt: str(run, "created_at"), recommendation: "review" as const, highestSeverity: severity(runSignals), signalCount: runSignals.length, reasonCodes: [...new Set(runSignals.map((row) => str(row, "code")).filter(Boolean))].sort(), sanitizedCoverPath: mediaByProfile.get(str(listing, "vehicle_profile_id"))?.find((media) => media.isCover)?.largePath ?? null }; });
  const lastScanned = candidates[candidates.length - 1];
  return { items, nextCursor: candidates.length === QUEUE_SCAN_LIMIT ? encodeCursor(str(lastScanned, "created_at"), str(lastScanned, "id")) : null };
}

export async function getModeratorReviewDetail(supabase: SupabaseClient, listingId: string, runId: string): Promise<ModeratorReviewDetail> {
  if (!validUuid(listingId) || !validUuid(runId)) throw new ModeratorReviewError(404, "İnceleme kaydı bulunamadı.");
  const [{ data: listing, error: listingError }, { data: run, error: runError }] = await Promise.all([
    supabase.schema("marketplace").from("listings").select("id,title,status,moderation_status,created_at,updated_at,vehicle_profile_id").eq("id", listingId).maybeSingle(),
    supabase.schema("marketplace").from("listing_moderation_runs").select("id,listing_id,recommended_action,created_at,engine,ruleset_version,provider_id,model_id,prompt_schema_version").eq("id", runId).eq("listing_id", listingId).maybeSingle()
  ]);
  if (listingError || runError) throw new ModeratorReviewError(500, "İnceleme ayrıntısı yüklenemedi.");
  if (!listing || !run) throw new ModeratorReviewError(404, "İnceleme kaydı bulunamadı.");
  const { data: history, error: historyError } = await supabase.schema("marketplace").from("listing_moderation_runs").select("id,recommended_action,created_at").eq("listing_id", listingId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(MAX_HISTORY);
  if (historyError) throw new ModeratorReviewError(500, "İnceleme ayrıntısı yüklenemedi.");
  const [{ data: signals, error: signalError }, { data: overrides, error: overrideError }] = await Promise.all([
    supabase.schema("marketplace").from("listing_moderation_signals").select("code,severity,confidence,source,field_name,evidence_class,evidence_excerpt,recommended_action").eq("run_id", runId).order("created_at", { ascending: true }).limit(MAX_SIGNALS),
    supabase.schema("marketplace").from("listing_moderation_overrides").select("run_id,decision,reason_code,created_at").in("run_id", ((history ?? []) as Row[]).map((row) => str(row, "id")))
  ]);
  if (signalError || overrideError) throw new ModeratorReviewError(500, "İnceleme ayrıntısı yüklenemedi.");
  const historyRows = (history ?? []) as Row[]; const overrideByRun = new Map(((overrides ?? []) as Row[]).map((row) => [str(row, "run_id"), row]));
  const currentRunId = str(historyRows[0] ?? {}, "id");
  const media = await sanitizedMediaByProfile(supabase, [str(listing as Row, "vehicle_profile_id")], false);
  return { listing: { id: str(listing as Row, "id"), title: str(listing as Row, "title"), status: str(listing as Row, "status"), moderationStatus: str(listing as Row, "moderation_status"), createdAt: str(listing as Row, "created_at"), updatedAt: str(listing as Row, "updated_at") || null }, currentModeration: { runId: str(run as Row, "id"), recommendation: str(run as Row, "recommended_action"), createdAt: str(run as Row, "created_at"), engine: str(run as Row, "engine"), rulesetVersion: str(run as Row, "ruleset_version"), providerId: str(run as Row, "provider_id") || null, modelId: str(run as Row, "model_id") || null, promptSchemaVersion: str(run as Row, "prompt_schema_version") || null, isCurrent: currentRunId === runId }, signals: ((signals ?? []) as Row[]).map((row) => ({ code: str(row, "code"), severity: str(row, "severity"), confidence: str(row, "confidence"), source: str(row, "source"), field: str(row, "field_name") || null, evidenceClass: str(row, "evidence_class"), evidence: str(row, "evidence_excerpt"), recommendedAction: str(row, "recommended_action") })), history: historyRows.map((row) => { const decision = overrideByRun.get(str(row, "id")); return { runId: str(row, "id"), recommendation: str(row, "recommended_action"), createdAt: str(row, "created_at"), decision: decision ? str(decision, "decision") : null, reasonCode: decision ? str(decision, "reason_code") || null : null, decidedAt: decision ? str(decision, "created_at") : null }; }), sanitizedMedia: media.get(str(listing as Row, "vehicle_profile_id")) ?? [] };
}

export async function submitModeratorDecision(supabase: SupabaseClient, input: { listingId: string; runId: unknown; decision: unknown; reasonCode: unknown; rejectionReason: unknown }) {
  if (!validUuid(input.listingId) || typeof input.runId !== "string" || !validUuid(input.runId)) throw new ModeratorReviewError(400, "Geçersiz inceleme kimliği.");
  const decision = typeof input.decision === "string" ? input.decision.trim().toLowerCase() : "";
  const reasonCode = typeof input.reasonCode === "string" && input.reasonCode.trim() ? input.reasonCode.trim().toLowerCase() : null;
  const rejectionReason = typeof input.rejectionReason === "string" && input.rejectionReason.trim() ? input.rejectionReason.trim().replace(/\s+/g, " ") : null;
  if ((decision !== "approve" && decision !== "reject") || (reasonCode && (!REASON_CODE_PATTERN.test(reasonCode) || reasonCode.length > 80)) || (decision === "reject" && !reasonCode) || (rejectionReason && rejectionReason.length > 1600)) throw new ModeratorReviewError(400, "Geçersiz moderasyon kararı.");
  const { data, error } = await supabase.rpc("review_listing_moderation_with_override", { p_listing_id: input.listingId, p_run_id: input.runId, p_decision: decision, p_reason_code: reasonCode, p_rejection_reason: rejectionReason });
  if (error) throw mapRpcError(error.code ?? null);
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

function mapRpcError(code: string | null) { const mapped: Record<string, [number, string]> = { OT401: [401, "Admin oturumu doğrulanamadı."], OT403: [403, "Bu işlem için admin yetkisi gerekir."], OT404: [404, "İnceleme kaydı bulunamadı."], OT409: [409, "Bu inceleme artık güncel değil veya karara bağlandı."], OT422: [400, "Geçersiz moderasyon kararı."] }; const [status, message] = mapped[code ?? ""] ?? [500, "Moderasyon kararı tamamlanamadı."]; return new ModeratorReviewError(status, message); }
function groupBy(rows: Row[], key: string) { const groups = new Map<string, Row[]>(); for (const row of rows) { const value = str(row, key); groups.set(value, [...(groups.get(value) ?? []), row]); } return groups; }
function encodeCursor(createdAt: string, runId: string) { return Buffer.from(JSON.stringify({ createdAt, runId }), "utf8").toString("base64url"); }
function decodeCursor(value: string | null) { if (!value) return null; try { const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { createdAt?: unknown; runId?: unknown }; return typeof parsed.createdAt === "string" && !Number.isNaN(Date.parse(parsed.createdAt)) && typeof parsed.runId === "string" && validUuid(parsed.runId) ? { createdAt: parsed.createdAt, runId: parsed.runId } : null; } catch { throw new ModeratorReviewError(400, "Geçersiz sayfalama imleci."); } }
async function sanitizedMediaByProfile(supabase: SupabaseClient, profileIds: string[], coverOnly: boolean) { const validIds = [...new Set(profileIds.filter(validUuid))]; const output = new Map<string, Array<{ mediaId: string; largePath: string; cardPath: string; thumbPath: string; isCover: boolean }>>(); if (!validIds.length) return output; let query = supabase.schema("vehicle").from("profile_media").select("id,vehicle_profile_id,large_path,card_path,thumb_path,is_cover").in("vehicle_profile_id", validIds).eq("processed_status", "processed").eq("blur_status", "blurred").order("sort_order", { ascending: true }); if (coverOnly) query = query.eq("is_cover", true); const { data, error } = await query; if (error) throw new ModeratorReviewError(500, "Sanitized medya yüklenemedi."); for (const row of (data ?? []) as Row[]) { const profileId = str(row, "vehicle_profile_id"); const mediaId = str(row, "id"); const largePath = str(row, "large_path"); const cardPath = str(row, "card_path"); const thumbPath = str(row, "thumb_path"); const base = `public/${profileId}/${mediaId}/`; if (!largePath.startsWith(base) || !cardPath.startsWith(base) || !thumbPath.startsWith(base)) continue; output.set(profileId, [...(output.get(profileId) ?? []), { mediaId, largePath, cardPath, thumbPath, isCover: row.is_cover === true }]); } return output; }
