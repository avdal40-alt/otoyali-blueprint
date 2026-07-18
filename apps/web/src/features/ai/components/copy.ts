import type { ClientDictionary, DictionarySection } from "@/i18n/types";

export function readAiCopy(dictionary: ClientDictionary, key: string, fallback: string) {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as DictionarySection)[part];
  }, dictionary.ai);

  return typeof value === "string" ? value : fallback;
}
