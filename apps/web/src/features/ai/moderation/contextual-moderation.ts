import "server-only";
import { z } from "zod";
import { getAiServerConfig } from "../config";
import { getConfiguredAiProvider } from "../providers/provider-registry";
import { type ListingModerationText, type ModerationResult, type ModerationSignal, type ModerationSignalCode, moderateListingText } from "./deterministic-text-moderation";

export const CONTEXTUAL_MODERATION_SCHEMA_VERSION = "ai-01g-b-v1";
const signalCodes = ["PROFANITY_OR_ABUSE", "CONTACT_IN_TEXT", "EXTERNAL_LINK", "SPAM_PATTERN", "NONSENSE_OR_EXCESSIVE_REPETITION", "HARASSMENT", "THREAT", "HATE_OR_DEHUMANIZING_LANGUAGE", "SEMANTIC_SPAM", "SEMANTIC_NONSENSE", "CONTACT_OR_LINK_BYPASS"] as const;
export const contextualModerationOutputSchema = z.object({ signals: z.array(z.object({ code: z.enum(signalCodes), severity: z.enum(["low", "medium", "high"]), confidence: z.enum(["low", "medium", "high"]), field: z.enum(["description", "seller_notes"]), evidence: z.enum(["[contextual-abuse]", "[targeted-harassment]", "[explicit-threat]", "[dehumanizing-language]", "[semantic-spam]", "[semantic-nonsense]", "[contextual-contact-bypass]"]), recommendedAction: z.enum(["allow", "ask_edit", "review", "block"]) }).strict()).max(8), overallRecommendation: z.enum(["allow", "ask_edit", "review", "block"]) }).strict();
export type ContextualModerationOutput = z.infer<typeof contextualModerationOutputSchema>;
export type ContextualModerationProviderInput = { description: string | null; sellerNotes: string | null; promptSchemaVersion: string };

/** Seller text is untrusted data in a data-only envelope. The local provider is a test fixture; external provider is deliberately unavailable until its shared provider contract supports this strict schema. */
export async function moderateListingTextContextually(input: ListingModerationText) {
  const config = getAiServerConfig();
  if (!config.enabled || process.env.AI_MODERATION_ENABLED !== "true") return { kind: "disabled" as const };
  const provider = getConfiguredAiProvider();
  if (provider.id === "disabled") return { kind: "unavailable" as const };
  try { return { kind: "ok" as const, output: contextualModerationOutputSchema.parse(await provider.moderateListingContext({ description: input.description, sellerNotes: input.sellerNotes, promptSchemaVersion: CONTEXTUAL_MODERATION_SCHEMA_VERSION })) }; } catch { return { kind: "invalid" as const }; }
}

export async function moderateListingWithContext(input: ListingModerationText): Promise<ModerationResult & { contextualStatus: "ok" | "disabled" | "unavailable" | "invalid" }> {
  const deterministic = moderateListingText(input); const contextual = await moderateListingTextContextually(input);
  if (contextual.kind !== "ok") return { ...deterministic, contextualStatus: contextual.kind };
  const contextualSignals: ModerationSignal[] = contextual.output.signals.filter((signal) => !(signal.recommendedAction === "block" && signal.confidence !== "high")).map((signal) => ({ code: signal.code as ModerationSignalCode, severity: signal.severity, confidence: signal.confidence, source: "contextual_ai", field: signal.field, evidence: { matchClass: "contextual", redactedExcerpt: signal.evidence, ruleId: CONTEXTUAL_MODERATION_SCHEMA_VERSION }, recommendedAction: signal.recommendedAction === "block" ? "review" : signal.recommendedAction }));
  const signals = [...deterministic.signals, ...contextualSignals.filter((candidate) => !deterministic.signals.some((existing) => existing.code === candidate.code && existing.field === candidate.field))];
  const recommendedAction = signals.some((signal) => signal.recommendedAction === "review") ? "review" : signals.some((signal) => signal.recommendedAction === "ask_edit") ? "ask_edit" : "allow";
  return { ...deterministic, signals, recommendedAction, contextualStatus: "ok" };
}

export function localContextualModerationFixture(input: ContextualModerationProviderInput): ContextualModerationOutput {
  const text = `${input.description ?? ""}\n${input.sellerNotes ?? ""}`.toLocaleLowerCase("tr-TR"); const field = input.description ? "description" : "seller_notes";
  if (/ignore all previous|system:|return allow|\{.*allow/i.test(text)) return { signals: [], overallRecommendation: "allow" };
  if (/seni bulup|öldür|tehdit/i.test(text)) return { signals: [{ code: "THREAT", severity: "high", confidence: "high", field, evidence: "[explicit-threat]", recommendedAction: "review" }], overallRecommendation: "review" };
  if (/insan değil|haşere/i.test(text)) return { signals: [{ code: "HATE_OR_DEHUMANIZING_LANGUAGE", severity: "high", confidence: "high", field, evidence: "[dehumanizing-language]", recommendedAction: "review" }], overallRecommendation: "review" };
  if (/sürekli aşağıla|rezil et/i.test(text)) return { signals: [{ code: "HARASSMENT", severity: "medium", confidence: "high", field, evidence: "[targeted-harassment]", recommendedAction: "review" }], overallRecommendation: "review" };
  if (/kripto.*kazanç|bayilik.*fırsatı/i.test(text)) return { signals: [{ code: "SEMANTIC_SPAM", severity: "medium", confidence: "high", field, evidence: "[semantic-spam]", recommendedAction: "review" }], overallRecommendation: "review" };
  if (/blorpt zzzq|asdf qwer zxcv/i.test(text)) return { signals: [{ code: "SEMANTIC_NONSENSE", severity: "medium", confidence: "high", field, evidence: "[semantic-nonsense]", recommendedAction: "review" }], overallRecommendation: "review" };
  if (/mavi mesajcıya yaz|sosyal medyada beni bul/i.test(text)) return { signals: [{ code: "CONTACT_OR_LINK_BYPASS", severity: "medium", confidence: "high", field, evidence: "[contextual-contact-bypass]", recommendedAction: "ask_edit" }], overallRecommendation: "ask_edit" };
  return { signals: [], overallRecommendation: "allow" };
}
