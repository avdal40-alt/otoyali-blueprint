import type { LocaleId } from "@/i18n/types";

type SellDescriptionLocale = Extract<LocaleId, "tr" | "en" | "ru" | "kk" | "zh-CN">;

const templates = {
  tr: { vehicle: "araç", declaration: (text: string) => `Satıcının beyanına göre ${text}`, city: (city: string) => `Araç ${city} konumundadır.` },
  en: { vehicle: "vehicle", declaration: (text: string) => `According to the seller's declaration: ${text}`, city: (city: string) => `The vehicle is located in ${city}.` },
  ru: { vehicle: "автомобиль", declaration: (text: string) => `По заявлению продавца: ${text}`, city: (city: string) => `Автомобиль находится в городе ${city}.` },
  kk: { vehicle: "көлік", declaration: (text: string) => `Сатушының мәлімдеуінше: ${text}`, city: (city: string) => `Көлік ${city} қаласында орналасқан.` },
  "zh-CN": { vehicle: "车辆", declaration: (text: string) => `根据卖家声明：${text}`, city: (city: string) => `车辆位于${city}。` }
} as const satisfies Record<SellDescriptionLocale, { vehicle: string; declaration: (text: string) => string; city: (city: string) => string }>;

export function getAiSellDescriptionTemplates(locale: SellDescriptionLocale) {
  return templates[locale];
}
