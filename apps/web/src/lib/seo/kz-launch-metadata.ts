import { ACTIVE_MARKET_PROFILE } from "@/lib/market";

type KzLaunchMetadataCopy = {
  title: string;
  description: string;
  openGraphDescription: string;
  openGraphLocale: string;
};

const kzLaunchMetadata = {
  ru: {
    title: "Автомобильный маркетплейс Казахстана",
    description: "Находите автомобили, запчасти и автомобильные сервисы Казахстана на Jolmod.",
    openGraphDescription: "Автомобильный маркетплейс Казахстана.",
    openGraphLocale: "ru_KZ"
  },
  kk: {
    title: "Қазақстанның автокөлік маркетплейсі",
    description: "Jolmod арқылы Қазақстандағы көліктерді, қосалқы бөлшектерді және автосервистерді табыңыз.",
    openGraphDescription: "Қазақстанның автокөлік маркетплейсі.",
    openGraphLocale: "kk_KZ"
  },
  en: {
    title: "Kazakhstan vehicle marketplace",
    description: "Find vehicles, spare parts, and automotive services across Kazakhstan with Jolmod.",
    openGraphDescription: "Kazakhstan's vehicle marketplace.",
    openGraphLocale: "en_KZ"
  },
  "zh-CN": {
    title: "哈萨克斯坦车辆市场",
    description: "通过 Jolmod 查找哈萨克斯坦各地的车辆、零配件和汽车服务。",
    openGraphDescription: "面向哈萨克斯坦的车辆市场。",
    openGraphLocale: "zh_CN"
  }
} satisfies Record<"ru" | "kk" | "en" | "zh-CN", KzLaunchMetadataCopy>;

export function getKzLaunchMetadata(locale: string | null | undefined): KzLaunchMetadataCopy {
  switch (locale) {
    case "kk": return kzLaunchMetadata.kk;
    case "en": return kzLaunchMetadata.en;
    case "zh-CN": return kzLaunchMetadata["zh-CN"];
    case "ru":
    default: return kzLaunchMetadata.ru;
  }
}

export function getActiveLaunchMetadata(locale: string | null | undefined): KzLaunchMetadataCopy {
  if (ACTIVE_MARKET_PROFILE.countryCode === "KZ") return getKzLaunchMetadata(locale);

  return {
    title: ACTIVE_MARKET_PROFILE.metadata.defaultTitle,
    description: ACTIVE_MARKET_PROFILE.metadata.description,
    openGraphDescription: ACTIVE_MARKET_PROFILE.metadata.openGraphDescription,
    openGraphLocale: ACTIVE_MARKET_PROFILE.metadata.defaultLocale
  };
}
