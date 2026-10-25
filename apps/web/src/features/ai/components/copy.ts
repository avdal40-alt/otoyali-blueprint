import type { Locale } from "@/i18n/types";
import { getAssistantUiCopy } from "./assistant-ui-copy";

export function readAiCopy(locale: Locale, key: string) {
  const copy = getAssistantUiCopy(locale);
  const values: Record<string, string> = {
    open: copy.open, launcher: copy.launcher, close: copy.close, title: copy.title, subtitle: copy.subtitle,
    "status.localPreview": copy.localPreview, introMessage: copy.intro, loading: copy.loading, placeholder: copy.placeholder,
    inputLabel: copy.inputLabel, clear: copy.clear, send: copy.send, disclaimer: copy.disclaimer,
    openTrustCenter: copy.trustCenter, featureNotConnected: copy.featureUnavailable,
    "capabilities.assistant_chat.label": copy.assistant,
    "capabilities.search_vehicles.label": copy.search, "capabilities.compare_vehicles.label": copy.compare,
    "capabilities.explain_listing.label": copy.listing, "capabilities.interpret_price.label": copy.price,
    "capabilities.publishing_help.label": copy.publish, "capabilities.improve_listing.label": copy.publish,
    "capabilities.ownership_guidance.label": copy.trust, "capabilities.general_help.label": copy.assistant,
    "capabilities.trust_and_safety.label": copy.trust
  };
  return values[key] ?? key;
}
