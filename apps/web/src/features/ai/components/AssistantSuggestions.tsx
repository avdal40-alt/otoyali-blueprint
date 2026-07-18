"use client";

import { getSuggestionsForSurface } from "../domain/suggestions";
import type { AiIntentId, AiSurface } from "../domain/types";
import { useI18n } from "@/i18n/client";
import { readAiCopy } from "./copy";

export function AssistantSuggestions({
  surface,
  disabled,
  onSelect
}: {
  surface: AiSurface;
  disabled?: boolean;
  onSelect: (text: string, intent: AiIntentId) => void;
}) {
  const { dictionary } = useI18n();
  const suggestions = getSuggestionsForSurface(surface);

  return (
    <div className="grid gap-2">
      {suggestions.map((suggestion) => {
        const text = readAiCopy(dictionary, suggestion.textKey.replace(/^ai\./, ""), suggestion.id);
        return (
          <button
            key={suggestion.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(text, suggestion.intent)}
            className="rounded-md border border-oto-border bg-white px-3 py-2 text-left text-sm font-bold leading-5 text-oto-text transition hover:border-oto-blue hover:bg-oto-blue/5 disabled:cursor-not-allowed disabled:opacity-disabled"
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
