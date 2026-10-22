import type { LocaleId } from "@/i18n/types";

type ListingExpertLocale = Extract<LocaleId, "tr" | "en" | "ru" | "kk" | "zh-CN">;

type ListingExpertMessages = {
  listingUnavailable: string;
  factUnavailable: string;
  comparisonItemsRequired: string;
  comparisonUnavailable: string;
  comparisonCountRequired: string;
  criterionRequired: string;
  genericComparison: string;
  comparisonValueUnavailable: string;
  newestYear: string;
  lowestPrice: string;
  lowestMileage: string;
  factAnswer: (label: string, value: string | number | boolean) => string;
  selectedComparison: (itemId: string, description: string) => string;
};

const messages = {
  tr: {
    listingUnavailable: "Bu ilan herkese açık olarak kullanılamıyor.",
    factUnavailable: "Bu bilgi ilanda belirtilmemiş.",
    comparisonItemsRequired: "Karşılaştırmak için iki ile dört farklı herkese açık ilan veya kanonik araç nesli seçin.",
    comparisonUnavailable: "Seçilen araçlardan biri veya birkaçı herkese açık olarak kullanılamıyor.",
    comparisonCountRequired: "Karşılaştırmak için iki ile dört farklı öğe seçin.",
    criterionRequired: "Olgusal bir ölçüt belirtin; Jolmod genel bir kazanan seçmez.",
    genericComparison: "Bu, yalnızca herkese açık ilan, katalog ve onaylı sahip değerlendirmesi verilerine dayanan olgusal bir karşılaştırmadır. Eksik değerler kullanılamıyor olarak gösterilir.",
    comparisonValueUnavailable: "İstenen karşılaştırma değeri seçilen öğeler için kullanılamıyor.",
    newestYear: "en yeni listelenen yıl",
    lowestPrice: "en düşük fiyat",
    lowestMileage: "en düşük kilometre",
    factAnswer: (label, value) => `${label}: ${String(value)}.`,
    selectedComparison: (itemId, description) => `${itemId}, ${description} değerine sahip.`
  },
  en: {
    listingUnavailable: "This listing is not publicly available.",
    factUnavailable: "This information is not specified in the listing.",
    comparisonItemsRequired: "Provide two to four distinct public listings or canonical vehicle generations to compare.",
    comparisonUnavailable: "One or more selected vehicles are not publicly available.",
    comparisonCountRequired: "Provide two to four distinct public comparison items.",
    criterionRequired: "Specify a factual criterion; Jolmod does not choose an overall winner.",
    genericComparison: "Here is a factual comparison using only available public listing, catalog, and approved owner-review data. Missing values are shown as unavailable.",
    comparisonValueUnavailable: "The requested comparison value is unavailable for the selected items.",
    newestYear: "newest listed year",
    lowestPrice: "lowest price",
    lowestMileage: "lowest mileage",
    factAnswer: (label, value) => `${label}: ${String(value)}.`,
    selectedComparison: (itemId, description) => `${itemId} has the ${description}.`
  },
  ru: {
    listingUnavailable: "Это объявление недоступно публично.",
    factUnavailable: "Эта информация не указана в объявлении.",
    comparisonItemsRequired: "Выберите от двух до четырёх разных публичных объявлений или канонических поколений автомобилей для сравнения.",
    comparisonUnavailable: "Один или несколько выбранных автомобилей недоступны публично.",
    comparisonCountRequired: "Выберите от двух до четырёх разных объектов для сравнения.",
    criterionRequired: "Укажите фактический критерий: Jolmod не выбирает общего победителя.",
    genericComparison: "Ниже приведено фактическое сравнение только по доступным публичным данным объявлений, каталога и подтверждённым отзывам владельцев. Отсутствующие значения помечены как недоступные.",
    comparisonValueUnavailable: "Запрошенное значение для сравнения недоступно у выбранных объектов.",
    newestYear: "самый новый указанный год",
    lowestPrice: "самая низкая цена",
    lowestMileage: "наименьший пробег",
    factAnswer: (label, value) => `${label}: ${String(value)}.`,
    selectedComparison: (itemId, description) => `У ${itemId} ${description}.`
  },
  kk: {
    listingUnavailable: "Бұл хабарландыру көпшілікке қолжетімді емес.",
    factUnavailable: "Бұл ақпарат хабарландыруда көрсетілмеген.",
    comparisonItemsRequired: "Салыстыру үшін екіден төртке дейінгі әртүрлі ашық хабарландыруды немесе көліктің канондық буынын таңдаңыз.",
    comparisonUnavailable: "Таңдалған көліктердің біреуі немесе бірнешеуі көпшілікке қолжетімді емес.",
    comparisonCountRequired: "Салыстыру үшін екіден төртке дейінгі әртүрлі нысанды таңдаңыз.",
    criterionRequired: "Нақты критерийді көрсетіңіз: Jolmod жалпы жеңімпазды таңдамайды.",
    genericComparison: "Бұл тек қолжетімді ашық хабарландыру, каталог және иелердің расталған пікірлері деректеріне негізделген нақты салыстыру. Жоқ мәндер қолжетімсіз ретінде көрсетіледі.",
    comparisonValueUnavailable: "Сұралған салыстыру мәні таңдалған нысандар үшін қолжетімсіз.",
    newestYear: "ең жаңа көрсетілген жыл",
    lowestPrice: "ең төмен баға",
    lowestMileage: "ең аз жүрген жол",
    factAnswer: (label, value) => `${label}: ${String(value)}.`,
    selectedComparison: (itemId, description) => `${itemId} үшін ${description} көрсетілген.`
  },
  "zh-CN": {
    listingUnavailable: "该车源目前不公开可用。",
    factUnavailable: "该信息未在车源中说明。",
    comparisonItemsRequired: "请选择两到四个不同的公开车源或标准车型代际进行比较。",
    comparisonUnavailable: "一个或多个所选车辆目前不公开可用。",
    comparisonCountRequired: "请选择两到四个不同的比较对象。",
    criterionRequired: "请说明客观比较标准；Jolmod 不会选出总体获胜者。",
    genericComparison: "以下是仅基于可用公开车源、目录和已核实车主评价数据的客观比较。缺失值将显示为不可用。",
    comparisonValueUnavailable: "所选对象没有可用的请求比较值。",
    newestYear: "最新标注年份",
    lowestPrice: "最低价格",
    lowestMileage: "最低里程",
    factAnswer: (label, value) => `${label}: ${String(value)}。`,
    selectedComparison: (itemId, description) => `${itemId} 的${description}。`
  }
} as const satisfies Record<ListingExpertLocale, ListingExpertMessages>;

export function getAiListingExpertMessages(locale: ListingExpertLocale): ListingExpertMessages {
  return messages[locale];
}
