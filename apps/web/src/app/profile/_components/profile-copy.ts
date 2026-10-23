import { normalizeLocale } from "@/i18n/config";

export type ProfileCopy = {
  title: string; detailsHint: string; authConfiguration: string; loadFailed: string;
  saveFailed: string; saveSuccess: string; saving: string; save: string;
  loginRequiredTitle: string; loginRequiredBody: string; loginRequiredAction: string;
  accountId: string; phone: string; noPhone: string; listingCount: string; createdAt: string;
  noInfo: string; fullName: string; contactName: string; dealerName: string; displayName: string;
  phoneVerifiedHint: string; city: string; selectCity: string; sellerType: string;
  verifiedDealer: string; privateSeller: string; dealerStatusHint: string;
  myListings: string; sellerContacts: string; favorites: string; messages: string;
  notifications: string; savedSearches: string; dealerCrm: string; dealerAnalytics: string;
  settings: string; publishListing: string; logout: string;
};

const ru: ProfileCopy = {
  title: "Профиль", detailsHint: "Управляйте личными данными и настройками аккаунта.", authConfiguration: "Настройка авторизации недоступна.", loadFailed: "Не удалось загрузить профиль.",
  saveFailed: "Не удалось сохранить изменения.", saveSuccess: "Профиль обновлён.", saving: "Сохранение…", save: "Сохранить",
  loginRequiredTitle: "Войдите в профиль", loginRequiredBody: "Войдите, чтобы просматривать и изменять данные профиля.", loginRequiredAction: "Войти",
  accountId: "ID аккаунта", phone: "Номер телефона", noPhone: "Не указан", listingCount: "Объявления", createdAt: "Дата регистрации",
  noInfo: "Нет данных", fullName: "Полное имя", contactName: "Контактное лицо", dealerName: "Название дилера", displayName: "Отображаемое имя",
  phoneVerifiedHint: "Этот номер подтверждён и изменяется через настройки безопасности.", city: "Город", selectCity: "Выберите город", sellerType: "Тип продавца",
  verifiedDealer: "Проверенный дилер", privateSeller: "Частный продавец", dealerStatusHint: "Статус продавца определяется проверкой аккаунта.",
  myListings: "Мои объявления", sellerContacts: "Контакты продавца", favorites: "Избранное", messages: "Сообщения",
  notifications: "Уведомления", savedSearches: "Сохранённые поиски", dealerCrm: "CRM дилера", dealerAnalytics: "Аналитика дилера",
  settings: "Настройки", publishListing: "Разместить объявление", logout: "Выйти"
};

const kk: ProfileCopy = {
  title: "Профиль", detailsHint: "Жеке деректеріңіз бен тіркелгі баптауларын басқарыңыз.", authConfiguration: "Аутентификация баптауы қолжетімсіз.", loadFailed: "Профильді жүктеу мүмкін болмады.",
  saveFailed: "Өзгерістерді сақтау мүмкін болмады.", saveSuccess: "Профиль жаңартылды.", saving: "Сақталуда…", save: "Сақтау",
  loginRequiredTitle: "Профильге кіріңіз", loginRequiredBody: "Профиль деректерін көру және өзгерту үшін кіріңіз.", loginRequiredAction: "Кіру",
  accountId: "Тіркелгі ID-і", phone: "Телефон нөмірі", noPhone: "Көрсетілмеген", listingCount: "Хабарландырулар", createdAt: "Тіркелген күні",
  noInfo: "Дерек жоқ", fullName: "Толық аты-жөні", contactName: "Байланысушы тұлға", dealerName: "Дилер атауы", displayName: "Көрсетілетін аты",
  phoneVerifiedHint: "Бұл нөмір расталған және қауіпсіздік баптаулары арқылы өзгертіледі.", city: "Қала", selectCity: "Қаланы таңдаңыз", sellerType: "Сатушы түрі",
  verifiedDealer: "Расталған дилер", privateSeller: "Жеке сатушы", dealerStatusHint: "Сатушы мәртебесі тіркелгіні тексеру арқылы анықталады.",
  myListings: "Менің хабарландыруларым", sellerContacts: "Сатушы контактілері", favorites: "Таңдаулылар", messages: "Хабарламалар",
  notifications: "Хабарландырулар", savedSearches: "Сақталған іздеулер", dealerCrm: "Дилер CRM", dealerAnalytics: "Дилер талдауы",
  settings: "Баптаулар", publishListing: "Хабарландыру орналастыру", logout: "Шығу"
};

const en: ProfileCopy = {
  title: "Profile", detailsHint: "Manage your personal information and account settings.", authConfiguration: "Authentication configuration is unavailable.", loadFailed: "Your profile could not be loaded.",
  saveFailed: "Your changes could not be saved.", saveSuccess: "Profile updated.", saving: "Saving…", save: "Save",
  loginRequiredTitle: "Sign in to your profile", loginRequiredBody: "Sign in to view and edit your profile information.", loginRequiredAction: "Sign in",
  accountId: "Account ID", phone: "Phone number", noPhone: "Not provided", listingCount: "Listings", createdAt: "Joined",
  noInfo: "No information", fullName: "Full name", contactName: "Contact person", dealerName: "Dealer name", displayName: "Display name",
  phoneVerifiedHint: "This number is verified and can be changed in security settings.", city: "City", selectCity: "Select a city", sellerType: "Seller type",
  verifiedDealer: "Verified dealer", privateSeller: "Private seller", dealerStatusHint: "Seller status is determined by account verification.",
  myListings: "My listings", sellerContacts: "Seller contacts", favorites: "Favorites", messages: "Messages",
  notifications: "Notifications", savedSearches: "Saved searches", dealerCrm: "Dealer CRM", dealerAnalytics: "Dealer analytics",
  settings: "Settings", publishListing: "Publish listing", logout: "Sign out"
};

const zhCN: ProfileCopy = {
  title: "个人资料", detailsHint: "管理您的个人信息和账户设置。", authConfiguration: "身份验证配置暂不可用。", loadFailed: "无法加载您的个人资料。",
  saveFailed: "无法保存更改。", saveSuccess: "个人资料已更新。", saving: "正在保存…", save: "保存",
  loginRequiredTitle: "登录后查看个人资料", loginRequiredBody: "请登录以查看和编辑您的个人资料。", loginRequiredAction: "登录",
  accountId: "账户 ID", phone: "手机号", noPhone: "未提供", listingCount: "车辆发布", createdAt: "注册时间",
  noInfo: "暂无信息", fullName: "姓名", contactName: "联系人", dealerName: "经销商名称", displayName: "显示名称",
  phoneVerifiedHint: "此号码已验证，可在安全设置中更改。", city: "城市", selectCity: "选择城市", sellerType: "卖家类型",
  verifiedDealer: "已认证经销商", privateSeller: "个人卖家", dealerStatusHint: "卖家状态由账户验证确定。",
  myListings: "我的发布", sellerContacts: "卖家联系方式", favorites: "收藏", messages: "消息",
  notifications: "通知", savedSearches: "已保存的搜索", dealerCrm: "经销商 CRM", dealerAnalytics: "经销商数据分析",
  settings: "设置", publishListing: "发布车辆", logout: "退出登录"
};

const tr: ProfileCopy = {
  title: "Profil", detailsHint: "Kişisel bilgilerinizi ve hesap ayarlarınızı yönetin.", authConfiguration: "Kimlik doğrulama yapılandırması kullanılamıyor.", loadFailed: "Profil yüklenemedi.",
  saveFailed: "Değişiklikler kaydedilemedi.", saveSuccess: "Profil güncellendi.", saving: "Kaydediliyor…", save: "Kaydet",
  loginRequiredTitle: "Profilinize giriş yapın", loginRequiredBody: "Profil bilgilerinizi görmek ve düzenlemek için giriş yapın.", loginRequiredAction: "Giriş yap",
  accountId: "Hesap kimliği", phone: "Telefon numarası", noPhone: "Belirtilmedi", listingCount: "İlanlar", createdAt: "Katılım tarihi",
  noInfo: "Bilgi yok", fullName: "Ad soyad", contactName: "İletişim kişisi", dealerName: "Bayi adı", displayName: "Görünen ad",
  phoneVerifiedHint: "Bu numara doğrulandı; güvenlik ayarlarından değiştirilebilir.", city: "Şehir", selectCity: "Şehir seçin", sellerType: "Satıcı türü",
  verifiedDealer: "Doğrulanmış bayi", privateSeller: "Bireysel satıcı", dealerStatusHint: "Satıcı durumu hesap doğrulamasıyla belirlenir.",
  myListings: "İlanlarım", sellerContacts: "Satıcı iletişim bilgileri", favorites: "Favoriler", messages: "Mesajlar",
  notifications: "Bildirimler", savedSearches: "Kayıtlı aramalar", dealerCrm: "Bayi CRM", dealerAnalytics: "Bayi analitiği",
  settings: "Ayarlar", publishListing: "İlan yayınla", logout: "Çıkış yap"
};

export function getProfileCopy(locale?: string | null): ProfileCopy {
  const value = locale?.toLowerCase().replace("_", "-");
  if (value?.startsWith("ru")) return ru;
  if (value?.startsWith("kk")) return kk;
  if (value === "zh-cn" || value === "zh") return zhCN;
  if (value?.startsWith("en")) return en;
  return normalizeLocale(locale) === "en" ? en : tr;
}
