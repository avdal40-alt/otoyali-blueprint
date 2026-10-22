import type { Locale } from "@/i18n/types";

const assistantMessages: Record<Locale, { messageTooLong: string; unavailable: string }> = {
  tr: {
    messageTooLong: "Mesaj çok uzun. Lütfen daha kısa yazın.",
    unavailable: "Rif şu anda yanıt veremiyor. Biraz sonra tekrar deneyin."
  },
  en: {
    messageTooLong: "Message is too long. Please shorten it.",
    unavailable: "Rif cannot respond right now. Please try again shortly."
  }
};

export function getAiAssistantMessages(locale: Locale) {
  return assistantMessages[locale];
}
