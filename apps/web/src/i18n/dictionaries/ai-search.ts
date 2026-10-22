import type { LocaleId } from "@/i18n/types";

type AiSearchLocale = Extract<LocaleId, "tr" | "en" | "ru" | "kk" | "zh-CN">;

const searchResultsMessages: Record<AiSearchLocale, (count: number) => string> = {
  tr: (count) => `${count} ilan bulundu.`,
  en: (count) => `${count} listings found.`,
  ru: (count) => `Найдено объявлений: ${count}.`,
  kk: (count) => `${count} хабарландыру табылды.`,
  "zh-CN": (count) => `找到 ${count} 个车源。`
};

const searchMessages: Record<AiSearchLocale, {
  unavailableCatalog: string;
  unavailable: string;
  verifiedDealerUnavailable: string;
  compareCriteria: string;
  threshold: string;
  clarifyEntity: (entity: string) => string;
  modelDoesNotMatchMake: string;
  variantDoesNotMatchModel: string;
  districtDoesNotMatchCity: string;
  selectedMakeUnavailable: string;
  selectedModelUnavailable: string;
  selectedVariantUnavailable: string;
  selectedCityUnavailable: string;
  selectedDistrictUnavailable: string;
}> = {
  tr: {
    unavailableCatalog: "Katalog yapılandırılmadığı için arama kullanılamıyor.",
    unavailable: "Arama şu anda kullanılamıyor.",
    verifiedDealerUnavailable: "Doğrulanmış galeri filtresi mevcut Search v1 sözleşmesinde kullanılamıyor.",
    compareCriteria: "Lütfen karşılaştırma ölçütlerini belirtin.",
    threshold: "Lütfen yıl, fiyat veya kilometre eşiği belirtin.",
    clarifyEntity: (entity) => `Lütfen ${entity} bilgisini netleştirin.`,
    modelDoesNotMatchMake: "Model seçilen markaya ait değil.",
    variantDoesNotMatchModel: "Varyant seçilen modele ait değil.",
    districtDoesNotMatchCity: "İlçe seçilen şehre ait değil.",
    selectedMakeUnavailable: "Seçilen marka mevcut değil.",
    selectedModelUnavailable: "Seçilen model bu marka için mevcut değil.",
    selectedVariantUnavailable: "Seçilen varyant bu model için mevcut değil.",
    selectedCityUnavailable: "Seçilen şehir mevcut değil.",
    selectedDistrictUnavailable: "Seçilen ilçe bu şehir için mevcut değil."
  },
  en: {
    unavailableCatalog: "Search is unavailable while the catalog is not configured.",
    unavailable: "Search is temporarily unavailable.",
    verifiedDealerUnavailable: "This filter is not available in the current Search v1 contract.",
    compareCriteria: "Please specify the criteria to compare.",
    threshold: "Please provide a year, price, or mileage threshold.",
    clarifyEntity: (entity) => `Please clarify the ${entity}.`,
    modelDoesNotMatchMake: "The model does not belong to the selected make.",
    variantDoesNotMatchModel: "The variant does not belong to the selected model.",
    districtDoesNotMatchCity: "The district does not belong to the selected city.",
    selectedMakeUnavailable: "The selected make is not available.",
    selectedModelUnavailable: "The selected model is not available for that make.",
    selectedVariantUnavailable: "The selected variant is not available for that model.",
    selectedCityUnavailable: "The selected city is not available.",
    selectedDistrictUnavailable: "The selected district is not available for that city."
  },
  ru: {
    unavailableCatalog: "Поиск недоступен, пока каталог не настроен.",
    unavailable: "Поиск временно недоступен.",
    verifiedDealerUnavailable: "Этот фильтр недоступен в текущем контракте Search v1.",
    compareCriteria: "Укажите критерии для сравнения.",
    threshold: "Укажите порог года, цены или пробега.",
    clarifyEntity: (entity) => `Уточните: ${entity}.`,
    modelDoesNotMatchMake: "Модель не относится к выбранной марке.",
    variantDoesNotMatchModel: "Вариант не относится к выбранной модели.",
    districtDoesNotMatchCity: "Район не относится к выбранному городу.",
    selectedMakeUnavailable: "Выбранная марка недоступна.",
    selectedModelUnavailable: "Выбранная модель недоступна для этой марки.",
    selectedVariantUnavailable: "Выбранный вариант недоступен для этой модели.",
    selectedCityUnavailable: "Выбранный город недоступен.",
    selectedDistrictUnavailable: "Выбранный район недоступен для этого города."
  },
  kk: {
    unavailableCatalog: "Каталог бапталмағандықтан, іздеу қолжетімсіз.",
    unavailable: "Іздеу уақытша қолжетімсіз.",
    verifiedDealerUnavailable: "Бұл сүзгі қазіргі Search v1 келісімшартында қолжетімсіз.",
    compareCriteria: "Салыстыру критерийлерін көрсетіңіз.",
    threshold: "Жыл, баға немесе жүрген жол шегін көрсетіңіз.",
    clarifyEntity: (entity) => `${entity} мәнін нақтылаңыз.`,
    modelDoesNotMatchMake: "Модель таңдалған маркаға жатпайды.",
    variantDoesNotMatchModel: "Нұсқа таңдалған модельге жатпайды.",
    districtDoesNotMatchCity: "Аудан таңдалған қалаға жатпайды.",
    selectedMakeUnavailable: "Таңдалған марка қолжетімсіз.",
    selectedModelUnavailable: "Таңдалған модель бұл марка үшін қолжетімсіз.",
    selectedVariantUnavailable: "Таңдалған нұсқа бұл модель үшін қолжетімсіз.",
    selectedCityUnavailable: "Таңдалған қала қолжетімсіз.",
    selectedDistrictUnavailable: "Таңдалған аудан бұл қала үшін қолжетімсіз."
  },
  "zh-CN": {
    unavailableCatalog: "目录尚未配置，暂时无法搜索。",
    unavailable: "搜索暂时不可用。",
    verifiedDealerUnavailable: "当前 Search v1 合同不支持此筛选条件。",
    compareCriteria: "请说明比较标准。",
    threshold: "请提供年份、价格或里程阈值。",
    clarifyEntity: (entity) => `请明确${entity}。`,
    modelDoesNotMatchMake: "该车型不属于所选品牌。",
    variantDoesNotMatchModel: "该配置不属于所选车型。",
    districtDoesNotMatchCity: "该区不属于所选城市。",
    selectedMakeUnavailable: "所选品牌不可用。",
    selectedModelUnavailable: "所选品牌暂无该车型。",
    selectedVariantUnavailable: "所选车型暂无该配置。",
    selectedCityUnavailable: "所选城市不可用。",
    selectedDistrictUnavailable: "所选城市暂无该区。"
  }
};

export function getAiSearchResultsMessage(locale: AiSearchLocale, count: number) {
  return searchResultsMessages[locale](count);
}

export function getAiSearchMessages(locale: AiSearchLocale) {
  return searchMessages[locale];
}
