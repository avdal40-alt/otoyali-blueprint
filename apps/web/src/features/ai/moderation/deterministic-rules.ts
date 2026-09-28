import "server-only";

export const DETERMINISTIC_MODERATION_RULESET_VERSION = "ai-01g-a-2026-09-29";

export type DeterministicAbuseRule = {
  id: string;
  terms: readonly string[];
  severity: "low" | "medium";
};

/**
 * This is intentionally a small, reviewable Turkish-first dictionary. It is
 * not returned by any HTTP contract; contextual coverage belongs to AI-01G-B.
 */
export const deterministicAbuseRules: readonly DeterministicAbuseRule[] = [
  { id: "tr-abuse-basic-v1", terms: ["aptal", "salak", "gerizekali"], severity: "low" },
  { id: "tr-profanity-explicit-v1", terms: ["siktir", "orospu"], severity: "medium" },
  { id: "ru-abuse-basic-v1", terms: ["дурак", "идиот"], severity: "low" },
  { id: "kz-abuse-basic-v1", terms: ["ақымақ"], severity: "low" }
];

export const ownedListingHosts = new Set(["yolmod.com", "www.yolmod.com"]);

export const moderationRuleIds = {
  phone: "tr-phone-v1",
  contactHandle: "contact-handle-v1",
  externalLink: "external-link-v1",
  repeatedPhrase: "repeated-phrase-v1",
  excessivePunctuation: "excessive-punctuation-v1",
  repeatedCharacters: "repeated-characters-v1"
} as const;
