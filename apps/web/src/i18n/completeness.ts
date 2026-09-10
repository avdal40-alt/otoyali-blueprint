import type { Dictionary, DictionarySection } from "./types";

export function findMissingTranslationKeys(reference: Dictionary, candidate: Dictionary): string[] {
  return findMissingKeys(reference, candidate, []);
}

function findMissingKeys(reference: DictionarySection, candidate: DictionarySection, path: string[]): string[] {
  return Object.entries(reference).flatMap(([key, referenceValue]) => {
    const candidateValue = candidate[key];
    const nextPath = [...path, key];

    if (typeof referenceValue === "string") {
      return typeof candidateValue === "string" ? [] : [nextPath.join(".")];
    }

    if (!candidateValue || typeof candidateValue !== "object") {
      return [nextPath.join(".")];
    }

    return findMissingKeys(referenceValue, candidateValue as DictionarySection, nextPath);
  });
}
