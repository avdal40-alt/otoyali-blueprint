import { normalizeLocale } from "@/i18n/config";

export type FavoritesCopy = {
  configurationUnavailable: string;
  loadFailed: string;
  emptyTitle: string;
  emptyBody: string;
  searchListings: string;
};

const ru: FavoritesCopy = {
  configurationUnavailable: "Настройка приложения недоступна.", loadFailed: "Не удалось загрузить избранное.",
  emptyTitle: "В избранном пока нет объявлений", emptyBody: "Сохраняйте интересные автомобили, чтобы вернуться к ним позже.", searchListings: "Найти автомобили"
};
const kk: FavoritesCopy = {
  configurationUnavailable: "Қолданба баптауы қолжетімсіз.", loadFailed: "Таңдаулыларды жүктеу мүмкін болмады.",
  emptyTitle: "Таңдаулыларда әзірге хабарландыру жоқ", emptyBody: "Қызық көліктерді сақтап, оларға кейін оралыңыз.", searchListings: "Көлік іздеу"
};
const en: FavoritesCopy = {
  configurationUnavailable: "Application configuration is unavailable.", loadFailed: "Favorites could not be loaded.",
  emptyTitle: "No favorite listings yet", emptyBody: "Save vehicles you like to return to them later.", searchListings: "Search vehicles"
};
const zhCN: FavoritesCopy = {
  configurationUnavailable: "应用配置暂不可用。", loadFailed: "无法加载收藏内容。",
  emptyTitle: "暂无收藏车辆", emptyBody: "收藏感兴趣的车辆，方便以后查看。", searchListings: "搜索车辆"
};
const tr: FavoritesCopy = {
  configurationUnavailable: "Uygulama yapılandırması kullanılamıyor.", loadFailed: "Favoriler yüklenemedi.",
  emptyTitle: "Henüz favori ilan yok", emptyBody: "Beğendiğiniz araçları daha sonra görmek için kaydedin.", searchListings: "Araç ara"
};

export function getFavoritesCopy(locale?: string | null): FavoritesCopy {
  const value = locale?.toLowerCase().replace("_", "-");
  if (value?.startsWith("ru")) return ru;
  if (value?.startsWith("kk")) return kk;
  if (value === "zh-cn" || value === "zh") return zhCN;
  if (value?.startsWith("en")) return en;
  return normalizeLocale(locale) === "en" ? en : tr;
}
