import type { Locale } from "@/i18n/types";

const searchResultsMessages: Record<Locale, (count: number) => string> = {
  tr: (count) => `${count} ilan bulundu.`,
  en: (count) => `${count} listings found.`
};

const searchMessages: Record<Locale, {
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
  }
};

export function getAiSearchResultsMessage(locale: Locale, count: number) {
  return searchResultsMessages[locale](count);
}

export function getAiSearchMessages(locale: Locale) {
  return searchMessages[locale];
}
