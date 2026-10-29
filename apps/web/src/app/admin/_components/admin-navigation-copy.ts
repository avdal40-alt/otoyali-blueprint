export type AdminNavigationCopy = Record<
  "dashboard" | "listings" | "videos" | "services" | "reports" | "users" | "settings",
  string
>;

const ru: AdminNavigationCopy = {
  dashboard: "Панель управления",
  listings: "Объявления",
  videos: "Видео",
  services: "Сервисы",
  reports: "Жалобы",
  users: "Пользователи",
  settings: "Настройки"
};

const kk: AdminNavigationCopy = {
  dashboard: "Басқару тақтасы",
  listings: "Хабарландырулар",
  videos: "Бейнелер",
  services: "Қызметтер",
  reports: "Шағымдар",
  users: "Пайдаланушылар",
  settings: "Баптаулар"
};

const en: AdminNavigationCopy = {
  dashboard: "Dashboard",
  listings: "Listings",
  videos: "Videos",
  services: "Services",
  reports: "Reports",
  users: "Users",
  settings: "Settings"
};

const zhCN: AdminNavigationCopy = {
  dashboard: "管理面板",
  listings: "车辆信息",
  videos: "视频",
  services: "服务",
  reports: "举报",
  users: "用户",
  settings: "设置"
};

// Compatibility-only: Turkish is not released and cannot be selected through
// Jolmod's locale registry. Keeping this explicit mapping preserves historical
// Yolmod navigation records without making it the fallback.
const tr: AdminNavigationCopy = {
  dashboard: "Yönetim paneli",
  listings: "İlanlar",
  videos: "Videolar",
  services: "Servisler",
  reports: "Şikayetler",
  users: "Kullanıcılar",
  settings: "Ayarlar"
};

export function getAdminNavigationCopy(locale?: string | null): AdminNavigationCopy {
  const value = locale?.toLowerCase().replace("_", "-");
  if (value?.startsWith("kk")) return kk;
  if (value?.startsWith("en")) return en;
  if (value === "zh" || value === "zh-cn") return zhCN;
  if (value?.startsWith("tr")) return tr;
  return ru;
}
