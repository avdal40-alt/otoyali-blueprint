export type SellDescriptionLocale = "ru" | "kk";

const templates = {
  ru: { vehicle: "автомобиль", declaration: (text: string) => `По заявлению продавца: ${text}`, city: (city: string) => `Автомобиль находится в городе ${city}.` },
  kk: { vehicle: "көлік", declaration: (text: string) => `Сатушының мәлімдеуінше: ${text}`, city: (city: string) => `Көлік ${city} қаласында орналасқан.` }
} as const satisfies Record<SellDescriptionLocale, { vehicle: string; declaration: (text: string) => string; city: (city: string) => string }>;

export function getAiSellDescriptionTemplates(locale: SellDescriptionLocale) {
  return templates[locale];
}
