export type AiResponseLanguage = string;

export function inferAiResponseLanguage(message: string, uiLocale: string): AiResponseLanguage {
  const value = message.trim();
  if (!value) return normalizeUiLocale(uiLocale);
  if (/\p{Script=Arabic}/u.test(value)) return "ar";
  if (/\p{Script=Han}/u.test(value)) return "zh-CN";
  if (/\p{Script=Cyrillic}/u.test(value)) return /[әіңғүұқөһ]/iu.test(value) ? "kk" : "ru";
  if (/[ğışçöü]/iu.test(value)) return "tr";
  if (/\b(der|die|das|und|mit|zuverlässig|zeige|zeig|millionen)\b/iu.test(value)) return "de";
  if (/\b(le|la|les|des|voiture|montre|fiable)\b/iu.test(value)) return "fr";
  if (/\b(el|la|los|coche|muestra|fiable)\b/iu.test(value)) return "es";
  if (/\b(the|show|reliable|car|price|with|for)\b/iu.test(value)) return "en";
  return normalizeUiLocale(uiLocale);
}

function normalizeUiLocale(locale: string): string {
  const value = locale.toLowerCase();
  if (value === "zh" || value === "zh-cn") return "zh-CN";
  if (value.startsWith("kk")) return "kk";
  if (value.startsWith("en")) return "en";
  if (value.startsWith("tr")) return "tr";
  return "ru";
}
