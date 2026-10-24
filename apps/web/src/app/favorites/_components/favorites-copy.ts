export type FavoritesCopy = {
  title: string;
  eyebrow: string;
  favorite: string;
  configurationUnavailable: string;
  loadFailed: string;
  actionFailed: string;
  emptyTitle: string;
  emptyBody: string;
  searchListings: string;
};

const ru: FavoritesCopy = {
  title: "Избранное", eyebrow: "Аккаунт", favorite: "Добавить в избранное",
  configurationUnavailable: "Настройка приложения недоступна.", loadFailed: "Не удалось загрузить избранное.",
  actionFailed: "Не удалось обновить избранное.", emptyTitle: "В избранном пока нет объявлений", emptyBody: "Сохраняйте интересные автомобили, чтобы вернуться к ним позже.", searchListings: "Найти автомобили"
};
const kk: FavoritesCopy = {
  title: "Таңдаулылар", eyebrow: "Тіркелгі", favorite: "Таңдаулыға қосу",
  configurationUnavailable: "Қолданба баптауы қолжетімсіз.", loadFailed: "Таңдаулыларды жүктеу мүмкін болмады.",
  actionFailed: "Таңдаулыларды жаңарту мүмкін болмады.", emptyTitle: "Таңдаулыларда әзірге хабарландыру жоқ", emptyBody: "Қызық көліктерді сақтап, оларға кейін оралыңыз.", searchListings: "Көлік іздеу"
};
const en: FavoritesCopy = {
  title: "Favorites", eyebrow: "Account", favorite: "Add to favorites",
  configurationUnavailable: "Application configuration is unavailable.", loadFailed: "Favorites could not be loaded.",
  actionFailed: "Favorites could not be updated.", emptyTitle: "No favorite listings yet", emptyBody: "Save vehicles you like to return to them later.", searchListings: "Search vehicles"
};
const zhCN: FavoritesCopy = {
  title: "收藏", eyebrow: "账户", favorite: "添加到收藏",
  configurationUnavailable: "应用配置暂不可用。", loadFailed: "无法加载收藏内容。",
  actionFailed: "无法更新收藏。", emptyTitle: "暂无收藏车辆", emptyBody: "收藏感兴趣的车辆，方便以后查看。", searchListings: "搜索车辆"
};
const tr: FavoritesCopy = {
  title: "Favoriler", eyebrow: "Hesap", favorite: "Favorilere ekle",
  configurationUnavailable: "Uygulama yapılandırması kullanılamıyor.", loadFailed: "Favoriler yüklenemedi.",
  actionFailed: "Favoriler güncellenemedi.", emptyTitle: "Henüz favori ilan yok", emptyBody: "Beğendiğiniz araçları daha sonra görmek için kaydedin.", searchListings: "Araç ara"
};

export function getFavoritesCopy(locale?: string | null): FavoritesCopy {
  const value = locale?.toLowerCase().replace("_", "-");
  if (value?.startsWith("ru")) return ru;
  if (value?.startsWith("kk")) return kk;
  if (value === "zh-cn" || value === "zh") return zhCN;
  if (value?.startsWith("en")) return en;
  if (value?.startsWith("tr")) return tr;
  return ru;
}
