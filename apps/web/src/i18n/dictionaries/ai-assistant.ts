import type { LocaleId } from "@/i18n/types";

type AiAssistantLocale = Extract<LocaleId, "tr" | "en" | "ru" | "kk" | "zh-CN">;

const assistantMessages: Record<AiAssistantLocale, { messageTooLong: string; unavailable: string }> = {
  tr: {
    messageTooLong: "Mesaj çok uzun. Lütfen daha kısa yazın.",
    unavailable: "Rif şu anda yanıt veremiyor. Biraz sonra tekrar deneyin."
  },
  en: {
    messageTooLong: "Message is too long. Please shorten it.",
    unavailable: "Rif cannot respond right now. Please try again shortly."
  },
  ru: {
    messageTooLong: "Сообщение слишком длинное. Сократите его.",
    unavailable: "Rif сейчас не может ответить. Повторите попытку позже."
  },
  kk: {
    messageTooLong: "Хабарлама тым ұзын. Қысқартып жазыңыз.",
    unavailable: "Rif қазір жауап бере алмайды. Кейінірек қайталап көріңіз."
  },
  "zh-CN": {
    messageTooLong: "消息过长，请缩短后重试。",
    unavailable: "Rif 目前无法回复，请稍后再试。"
  }
};

export function getAiAssistantMessages(locale: AiAssistantLocale) {
  return assistantMessages[locale];
}
