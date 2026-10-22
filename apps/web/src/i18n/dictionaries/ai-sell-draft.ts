import type { LocaleId } from "@/i18n/types";

type SellDraftLocale = Extract<LocaleId, "tr" | "en" | "ru" | "kk" | "zh-CN">;

const questions = {
  tr: { makeId: "Aracın markası nedir?", modelId: "Aracın modeli nedir?", year: "Aracın model yılı nedir?", mileageKm: "Aracın kilometresi nedir?", condition: "Araç yeni mi, ikinci el mi?", fuelType: "Yakıt türü nedir?", transmission: "Vites türü nedir?", engineVolumeL: "Motor hacmi nedir?", priceAmount: "İstenen fiyat nedir?", currency: "Para birimi nedir?", priceNegotiable: "Fiyat pazarlığa açık mı?", city: "Araç hangi şehirde?" },
  en: { makeId: "What is the vehicle make?", modelId: "What is the vehicle model?", year: "What is the model year?", mileageKm: "What is the mileage?", condition: "Is the vehicle new or used?", fuelType: "What is the fuel type?", transmission: "What is the transmission type?", engineVolumeL: "What is the engine volume?", priceAmount: "What is the asking price?", currency: "What is the currency?", priceNegotiable: "Is the price negotiable?", city: "Which city is the vehicle in?" },
  ru: { makeId: "Какая марка автомобиля?", modelId: "Какая модель автомобиля?", year: "Какой модельный год автомобиля?", mileageKm: "Какой пробег автомобиля?", condition: "Автомобиль новый или с пробегом?", fuelType: "Какой тип топлива?", transmission: "Какая коробка передач?", engineVolumeL: "Какой объём двигателя?", priceAmount: "Какова запрашиваемая цена?", currency: "Какая валюта?", priceNegotiable: "Возможен ли торг?", city: "В каком городе находится автомобиль?" },
  kk: { makeId: "Көліктің маркасы қандай?", modelId: "Көліктің моделі қандай?", year: "Көліктің шығарылған жылы қандай?", mileageKm: "Көліктің жүрген жолы қанша?", condition: "Көлік жаңа ма, әлде қолданыста болған ба?", fuelType: "Жанармай түрі қандай?", transmission: "Беріліс қорабы қандай?", engineVolumeL: "Қозғалтқыш көлемі қандай?", priceAmount: "Сұралатын баға қандай?", currency: "Валютасы қандай?", priceNegotiable: "Бағасы келісімді ме?", city: "Көлік қай қалада орналасқан?" },
  "zh-CN": { makeId: "车辆品牌是什么？", modelId: "车辆型号是什么？", year: "车辆的出厂年份是什么？", mileageKm: "车辆里程是多少？", condition: "车辆是新车还是二手车？", fuelType: "燃料类型是什么？", transmission: "变速箱类型是什么？", engineVolumeL: "发动机排量是多少？", priceAmount: "期望售价是多少？", currency: "使用什么货币？", priceNegotiable: "价格可以协商吗？", city: "车辆位于哪个城市？" }
} as const satisfies Record<SellDraftLocale, Record<string, string>>;

const ambiguityMessages = {
  tr: "Lütfen donanım, hasar veya boya bilgisini açıkça belirtin.",
  en: "Please state equipment, damage, or paint details explicitly.",
  ru: "Пожалуйста, явно укажите комплектацию, повреждения или сведения о окраске.",
  kk: "Жабдық, зақым немесе бояу туралы мәліметті нақты көрсетіңіз.",
  "zh-CN": "请明确说明配置、损伤或喷漆情况。"
} as const satisfies Record<SellDraftLocale, string>;

export function getAiSellDraftQuestion(locale: SellDraftLocale, field: string): string | undefined {
  return questions[locale]?.[field as keyof typeof questions.tr];
}

export function getAiSellDraftAmbiguityMessage(locale: SellDraftLocale): string {
  return ambiguityMessages[locale];
}
