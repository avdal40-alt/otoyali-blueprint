export type SettingsCopy = { title: string; account: string; firstName: string; lastName: string; city: string; save: string; missingSupabaseEnv: string; loginRequiredTitle: string; loginRequiredBody: string; loginRequiredAction: string };

const ru: SettingsCopy = { title: "Настройки", account: "Аккаунт", firstName: "Имя", lastName: "Фамилия", city: "Город", save: "Сохранить", missingSupabaseEnv: "Подключение к сервису сейчас недоступно.", loginRequiredTitle: "Войдите в аккаунт", loginRequiredBody: "Войдите, чтобы изменить настройки аккаунта.", loginRequiredAction: "Войти" };
const kk: SettingsCopy = { title: "Баптаулар", account: "Тіркелгі", firstName: "Аты", lastName: "Тегі", city: "Қала", save: "Сақтау", missingSupabaseEnv: "Сервиске қосылу қазір қолжетімсіз.", loginRequiredTitle: "Тіркелгіге кіріңіз", loginRequiredBody: "Тіркелгі баптауларын өзгерту үшін кіріңіз.", loginRequiredAction: "Кіру" };
const en: SettingsCopy = { title: "Settings", account: "Account", firstName: "First name", lastName: "Last name", city: "City", save: "Save", missingSupabaseEnv: "The service connection is unavailable right now.", loginRequiredTitle: "Sign in to your account", loginRequiredBody: "Sign in to change your account settings.", loginRequiredAction: "Sign in" };
const zhCN: SettingsCopy = { title: "设置", account: "账户", firstName: "名字", lastName: "姓氏", city: "城市", save: "保存", missingSupabaseEnv: "当前无法连接到服务。", loginRequiredTitle: "登录您的账户", loginRequiredBody: "请登录以修改账户设置。", loginRequiredAction: "登录" };

export function getSettingsCopy(locale?: string | null): SettingsCopy {
  const value = locale?.toLowerCase();
  if (value?.startsWith("kk")) return kk;
  if (value?.startsWith("en")) return en;
  if (value === "zh" || value === "zh-cn") return zhCN;
  return ru;
}
