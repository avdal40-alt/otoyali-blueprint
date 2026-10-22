import type { LocaleId } from "@/i18n/types";

type FormatFallbackLocale = LocaleId;

const messages = {
  tr: { priceNotProvided: "Fiyat belirtilmedi", noInfo: "Bilgi yok", locationUnknown: "Konum bilinmiyor" },
  en: { priceNotProvided: "Price not provided", noInfo: "No information", locationUnknown: "Location unknown" },
  ru: { priceNotProvided: "Цена не указана", noInfo: "Нет информации", locationUnknown: "Местоположение неизвестно" },
  kk: { priceNotProvided: "Бағасы көрсетілмеген", noInfo: "Ақпарат жоқ", locationUnknown: "Орналасқан жері белгісіз" },
  ar: { priceNotProvided: "السعر غير محدد", noInfo: "لا توجد معلومات", locationUnknown: "الموقع غير معروف" },
  "zh-CN": { priceNotProvided: "未注明价格", noInfo: "暂无信息", locationUnknown: "位置未知" }
} as const satisfies Record<FormatFallbackLocale, { priceNotProvided: string; noInfo: string; locationUnknown: string }>;

export function getFormatFallbackMessages(locale: FormatFallbackLocale) {
  return messages[locale];
}
