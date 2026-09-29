import "server-only";

import { DETERMINISTIC_MODERATION_RULESET_VERSION, deterministicAbuseRules, moderationRuleIds, ownedListingHosts } from "./deterministic-rules";

export type ModerationAction = "allow" | "ask_edit" | "review" | "block";
export type ModerationSignalCode = "PROFANITY_OR_ABUSE" | "CONTACT_IN_TEXT" | "EXTERNAL_LINK" | "SPAM_PATTERN" | "NONSENSE_OR_EXCESSIVE_REPETITION" | "HARASSMENT" | "THREAT" | "HATE_OR_DEHUMANIZING_LANGUAGE" | "SEMANTIC_SPAM" | "SEMANTIC_NONSENSE" | "CONTACT_OR_LINK_BYPASS";
export type ModerationTextField = "description" | "seller_notes";
export type ModerationSeverity = "low" | "medium" | "high";
export type ModerationEvidence = { matchClass: "lexicon" | "phone" | "contact_handle" | "external_url" | "repetition" | "punctuation" | "contextual"; redactedExcerpt: "[abusive-term]" | "[phone]" | "[contact-handle]" | "[external-link]" | "[repetition]" | "[excessive-punctuation]" | "[contextual-abuse]" | "[targeted-harassment]" | "[explicit-threat]" | "[dehumanizing-language]" | "[semantic-spam]" | "[semantic-nonsense]" | "[contextual-contact-bypass]"; ruleId: string };

export type ModerationSignal = {
  code: ModerationSignalCode;
  severity: ModerationSeverity;
  confidence: "low" | "medium" | "high";
  source: "deterministic" | "contextual_ai";
  field: ModerationTextField;
  evidence: ModerationEvidence;
  recommendedAction: Exclude<ModerationAction, "block">;
};

export type ModerationResult = {
  rulesetVersion: string;
  recommendedAction: Exclude<ModerationAction, "block">;
  signals: readonly ModerationSignal[];
  sellerIssues: readonly { field: ModerationTextField; code: "profanity_or_abuse" | "contact_in_text" }[];
};

export type ListingModerationText = { description: string | null; sellerNotes: string | null };

type NormalizedText = { tokens: readonly string[]; compactSegments: readonly string[]; original: string; normalized: string };

const confusables: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "л": "l", "к": "k",
  "А": "a", "Е": "e", "О": "o", "Р": "p", "С": "c", "У": "y", "Х": "x", "Л": "l", "К": "k"
};
const leet: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
const urlSuffixes = "com|net|org|info|biz|io|co|ru|kz|tr|de|uk";

/** Detection-only representation. The caller's original seller text is never mutated or returned. */
export function normalizeModerationText(value: string): NormalizedText {
  const unicode = value.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/[\u0300-\u036f]/g, "");
  const mapped = Array.from(unicode, (character) => confusables[character] ?? leet[character] ?? character).join("");
  const normalized = mapped.replace(/(.)\1{2,}/gu, "$1").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  const rawSegments = mapped.split(/\s+/).filter(Boolean);
  const compactSegments = rawSegments.map((segment) => segment.replace(/[\s*./_-]+/gu, "").replace(/(.)\1{2,}/gu, "$1")).filter(Boolean);
  const tokens = normalized ? normalized.split(" ") : [];
  for (let index = 0; index < tokens.length;) {
    if (tokens[index].length !== 1) { index += 1; continue; }
    let end = index;
    while (end < tokens.length && tokens[end].length === 1 && end - index < 11) end += 1;
    if (end - index >= 3) compactSegments.push(tokens.slice(index, end).join(""));
    index = end;
  }
  return { tokens, compactSegments, original: value, normalized };
}

export function moderateListingText(input: ListingModerationText): ModerationResult {
  const signals: ModerationSignal[] = [];
  inspectField("description", input.description, signals);
  inspectField("seller_notes", input.sellerNotes, signals);
  const recommendedAction: Exclude<ModerationAction, "block"> = signals.some((signal) => signal.recommendedAction === "review") ? "review" : signals.some((signal) => signal.recommendedAction === "ask_edit") ? "ask_edit" : "allow";
  const sellerIssues: { field: ModerationTextField; code: "profanity_or_abuse" | "contact_in_text" }[] = [];
  for (const signal of signals) {
    if (signal.recommendedAction !== "ask_edit") continue;
    if (signal.code === "PROFANITY_OR_ABUSE") sellerIssues.push({ field: signal.field, code: "profanity_or_abuse" });
    if (signal.code === "CONTACT_IN_TEXT") sellerIssues.push({ field: signal.field, code: "contact_in_text" });
  }
  return { rulesetVersion: DETERMINISTIC_MODERATION_RULESET_VERSION, recommendedAction, signals, sellerIssues };
}

function inspectField(field: ModerationTextField, value: string | null, signals: ModerationSignal[]) {
  if (!value?.trim()) return;
  const normalized = normalizeModerationText(value);
  const candidates = new Set([...normalized.tokens, ...normalized.compactSegments]);
  for (const rule of deterministicAbuseRules) {
    if (rule.terms.some((term) => candidates.has(normalizeModerationText(term).normalized))) {
      addSignal(signals, { code: "PROFANITY_OR_ABUSE", severity: rule.severity, field, evidence: { matchClass: "lexicon", redactedExcerpt: "[abusive-term]", ruleId: rule.id }, recommendedAction: "ask_edit" });
      break;
    }
  }
  const phones = findTurkishPhones(value);
  if (phones.length > 0) addSignal(signals, { code: "CONTACT_IN_TEXT", severity: "medium", field, evidence: { matchClass: "phone", redactedExcerpt: "[phone]", ruleId: moderationRuleIds.phone }, recommendedAction: "ask_edit" });
  if (/(?:\b(?:whatsapp|wp|wa|telegram|tg)\b\s*[:@-]?\s*(?:\+?\d|@)[\w.-]{3,})/iu.test(value)) addSignal(signals, { code: "CONTACT_IN_TEXT", severity: "medium", field, evidence: { matchClass: "contact_handle", redactedExcerpt: "[contact-handle]", ruleId: moderationRuleIds.contactHandle }, recommendedAction: "ask_edit" });
  const links = findExternalLinks(value);
  if (links.length > 0) addSignal(signals, { code: "EXTERNAL_LINK", severity: "medium", field, evidence: { matchClass: "external_url", redactedExcerpt: "[external-link]", ruleId: moderationRuleIds.externalLink }, recommendedAction: "review" });
  if (links.length > 1 || phones.length > 1 || hasRepeatedPhrase(normalized.tokens)) addSignal(signals, { code: "SPAM_PATTERN", severity: "low", field, evidence: { matchClass: "repetition", redactedExcerpt: "[repetition]", ruleId: moderationRuleIds.repeatedPhrase }, recommendedAction: "review" });
  if (/(.)\1{9,}/u.test(value) || isMostlyPunctuation(value)) addSignal(signals, { code: "NONSENSE_OR_EXCESSIVE_REPETITION", severity: "low", field, evidence: { matchClass: /(.)\1{9,}/u.test(value) ? "repetition" : "punctuation", redactedExcerpt: /(.)\1{9,}/u.test(value) ? "[repetition]" : "[excessive-punctuation]", ruleId: /(.)\1{9,}/u.test(value) ? moderationRuleIds.repeatedCharacters : moderationRuleIds.excessivePunctuation }, recommendedAction: "review" });
}

function addSignal(signals: ModerationSignal[], signal: Omit<ModerationSignal, "confidence" | "source">) {
  if (!signals.some((item) => item.code === signal.code && item.field === signal.field)) signals.push({ ...signal, confidence: "high", source: "deterministic" });
}

function findTurkishPhones(value: string): string[] {
  const matches = value.match(/(?<!\d)(?:\+?90[\s().-]*)?0?5(?:[\s().-]*\d){9}(?!\d)/g) ?? [];
  return matches.filter((match) => match.replace(/\D/g, "").length >= 10);
}

function findExternalLinks(value: string): string[] {
  const candidates = value.match(new RegExp(`(?:https?:\\/\\/|www\\.)[^\\s]+|\\b[\\w-]+\\.(?:${urlSuffixes})\\b|\\b[\\w-]+\\s+(?:dot|nokta)\\s+(?:${urlSuffixes})\\b`, "giu")) ?? [];
  return candidates.filter((candidate) => {
    const host = candidate.replace(/^https?:\/\//iu, "").replace(/^www\./iu, "").replace(/\s+(dot|nokta)\s+/iu, ".").split(/[/?#]/)[0].toLocaleLowerCase("tr-TR");
    return !ownedListingHosts.has(host) && !ownedListingHosts.has(`www.${host}`);
  });
}

function hasRepeatedPhrase(tokens: readonly string[]) {
  if (tokens.length < 6) return false;
  const counts = new Map<string, number>();
  for (const token of tokens.filter((token) => token.length >= 3)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.values()].some((count) => count >= 6);
}

function isMostlyPunctuation(value: string) {
  const visible = value.replace(/\s/g, "");
  if (visible.length < 18) return false;
  const punctuation = Array.from(visible).filter((character) => !/[\p{L}\p{N}]/u.test(character)).length;
  return punctuation / visible.length >= 0.8;
}
