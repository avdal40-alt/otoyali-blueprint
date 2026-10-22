import type { Locale } from "@/i18n/types";

const questions = {
  tr: { makeId: "Aracın markası nedir?", modelId: "Aracın modeli nedir?", year: "Aracın model yılı nedir?", mileageKm: "Aracın kilometresi nedir?", condition: "Araç yeni mi, ikinci el mi?", fuelType: "Yakıt türü nedir?", transmission: "Vites türü nedir?", engineVolumeL: "Motor hacmi nedir?", priceAmount: "İstenen fiyat nedir?", currency: "Para birimi nedir?", priceNegotiable: "Fiyat pazarlığa açık mı?", city: "Araç hangi şehirde?" },
  en: { makeId: "What is the vehicle make?", modelId: "What is the vehicle model?", year: "What is the model year?", mileageKm: "What is the mileage?", condition: "Is the vehicle new or used?", fuelType: "What is the fuel type?", transmission: "What is the transmission type?", engineVolumeL: "What is the engine volume?", priceAmount: "What is the asking price?", currency: "What is the currency?", priceNegotiable: "Is the price negotiable?", city: "Which city is the vehicle in?" }
} as const;

const ambiguityMessages = {
  tr: "Lütfen donanım, hasar veya boya bilgisini açıkça belirtin.",
  en: "Please state equipment, damage, or paint details explicitly."
} as const;

export function getAiSellDraftQuestion(locale: Locale, field: string): string | undefined {
  return questions[locale]?.[field as keyof typeof questions.tr];
}

export function getAiSellDraftAmbiguityMessage(locale: Locale): string {
  return ambiguityMessages[locale];
}
