import type { LocaleId } from "@/i18n/types";

type FormatEnumLocale = Extract<LocaleId, "tr" | "en" | "ru" | "kk" | "zh-CN">;

const labels = {
  tr: {
    fuel: { gasoline: "Benzin", diesel: "Dizel", lpg: "LPG", electric: "Elektrikli", hybrid: "Hibrit", other: "Diğer" },
    transmission: { manual: "Manuel", automatic: "Otomatik", semi_automatic: "Yarı otomatik" },
    condition: { used: "İkinci el", new: "Sıfır km" },
    sellerType: { private: "Bireysel", individual: "Bireysel", dealer: "Galeri", corporate: "Galeri" },
    bodyType: { sedan: "Sedan", hatchback: "Hatchback", suv: "SUV", wagon: "Station wagon", coupe: "Coupe", pickup: "Pickup", minivan: "Minivan", commercial: "Ticari", other: "Diğer" },
    driveType: { front: "Önden çekiş", rear: "Arkadan itiş", awd: "AWD", "4x4": "4x4" },
    damageState: { unknown: "Bilinmiyor", none: "Hasarsız", minor: "Hafif hasarlı", major: "Ağır hasarlı", painted: "Boyalı", replaced: "Değişenli", heavy_damage: "Ağır hasar kayıtlı" },
    color: { white: "Beyaz", black: "Siyah", gray: "Gri", blue: "Mavi", red: "Kırmızı", silver: "Gümüş" }
  },
  en: {
    fuel: { gasoline: "Petrol", diesel: "Diesel", lpg: "LPG", electric: "Electric", hybrid: "Hybrid", other: "Other" },
    transmission: { manual: "Manual", automatic: "Automatic", semi_automatic: "Semi-automatic" },
    condition: { used: "Used", new: "New" },
    sellerType: { private: "Individual seller", individual: "Individual seller", dealer: "Dealer", corporate: "Dealer" },
    bodyType: { sedan: "Sedan", hatchback: "Hatchback", suv: "SUV", wagon: "Station wagon", coupe: "Coupe", pickup: "Pickup", minivan: "Minivan", commercial: "Commercial", other: "Other" },
    driveType: { front: "Front-wheel drive", rear: "Rear-wheel drive", awd: "AWD", "4x4": "4x4" },
    damageState: { unknown: "Unknown", none: "No damage", minor: "Minor damage", major: "Major damage", painted: "Painted", replaced: "Replaced parts", heavy_damage: "Heavy damage record" },
    color: { white: "White", black: "Black", gray: "Gray", blue: "Blue", red: "Red", silver: "Silver" }
  },
  ru: {
    fuel: { gasoline: "Бензин", diesel: "Дизель", lpg: "Газ", electric: "Электро", hybrid: "Гибрид", other: "Другое" },
    transmission: { manual: "Механика", automatic: "Автомат", semi_automatic: "Робот" },
    condition: { used: "С пробегом", new: "Новый" },
    sellerType: { private: "Частное лицо", individual: "Частное лицо", dealer: "Дилер", corporate: "Компания" },
    bodyType: { sedan: "Седан", hatchback: "Хэтчбек", suv: "Внедорожник", wagon: "Универсал", coupe: "Купе", pickup: "Пикап", minivan: "Минивэн", commercial: "Коммерческий", other: "Другое" },
    driveType: { front: "Передний", rear: "Задний", awd: "Полный", "4x4": "4x4" },
    damageState: { unknown: "Неизвестно", none: "Без повреждений", minor: "Незначительные повреждения", major: "Серьёзные повреждения", painted: "Окрашен", replaced: "Заменён", heavy_damage: "Тяжёлые повреждения" },
    color: { white: "Белый", black: "Чёрный", gray: "Серый", blue: "Синий", red: "Красный", silver: "Серебристый" }
  },
  kk: {
    fuel: { gasoline: "Бензин", diesel: "Дизель", lpg: "Газ", electric: "Электр", hybrid: "Гибрид", other: "Басқа" },
    transmission: { manual: "Қолмен", automatic: "Автоматты", semi_automatic: "Робот" },
    condition: { used: "Жүрілген", new: "Жаңа" },
    sellerType: { private: "Жеке тұлға", individual: "Жеке тұлға", dealer: "Дилер", corporate: "Компания" },
    bodyType: { sedan: "Седан", hatchback: "Хэтчбек", suv: "Жол талғамайтын", wagon: "Универсал", coupe: "Купе", pickup: "Пикап", minivan: "Минивэн", commercial: "Коммерциялық", other: "Басқа" },
    driveType: { front: "Алдыңғы", rear: "Артқы", awd: "Толық", "4x4": "4x4" },
    damageState: { unknown: "Белгісіз", none: "Зақымсыз", minor: "Ұсақ зақым", major: "Айтарлықтай зақым", painted: "Боялған", replaced: "Ауыстырылған", heavy_damage: "Ауыр зақым" },
    color: { white: "Ақ", black: "Қара", gray: "Сұр", blue: "Көк", red: "Қызыл", silver: "Күміс" }
  },
  "zh-CN": {
    fuel: { gasoline: "汽油", diesel: "柴油", lpg: "液化石油气", electric: "纯电", hybrid: "混合动力", other: "其他" },
    transmission: { manual: "手动", automatic: "自动", semi_automatic: "半自动" },
    condition: { used: "二手", new: "新车" },
    sellerType: { private: "个人", individual: "个人", dealer: "经销商", corporate: "公司" },
    bodyType: { sedan: "轿车", hatchback: "掀背车", suv: "SUV", wagon: "旅行车", coupe: "双门轿跑", pickup: "皮卡", minivan: "小型客车", commercial: "商用车", other: "其他" },
    driveType: { front: "前驱", rear: "后驱", awd: "全轮驱动", "4x4": "4×4" },
    damageState: { unknown: "未知", none: "无事故", minor: "轻微损伤", major: "严重损伤", painted: "补漆", replaced: "更换过部件", heavy_damage: "重大事故损伤" },
    color: { white: "白色", black: "黑色", gray: "灰色", blue: "蓝色", red: "红色", silver: "银色" }
  }
} as const satisfies Record<FormatEnumLocale, Record<string, Record<string, string>>>;

export function getFormatEnumLabel(locale: LocaleId, group: string, value: string) {
  const localeLabels = labels[locale as FormatEnumLocale];
  const groupLabels = localeLabels?.[group as keyof typeof labels.ru] as Record<string, string> | undefined;
  return groupLabels?.[value];
}

export const getKazakhstanFormatEnumLabel = getFormatEnumLabel;
