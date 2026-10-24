import type { Dictionary } from "./types";

/**
 * Direct shared-shell messages for the Kazakhstan launch. These are kept apart
 * from the historical Turkey dictionaries so a Jolmod locale can never inherit
 * Turkish navigation or footer copy when the public registry is enabled.
 */
type SharedShellCopy = Pick<Dictionary, "common" | "navigation" | "footer">;

export const globalLaunchSharedCopy = {
  ru: {
    common: {
      translationUnavailable: "Содержимое сейчас недоступно.", appName: "Jolmod", continue: "Продолжить", cancel: "Отмена", save: "Сохранить", loading: "Загрузка", back: "Назад", close: "Закрыть", search: "Поиск", reset: "Сбросить", clear: "Очистить", showAll: "Показать все", publishListing: "Разместить объявление", adminPanel: "Панель администратора", comingSoon: "Скоро будет доступно", noInfo: "Нет данных", locationUnknown: "Местоположение не указано", priceNotProvided: "Цена не указана", language: "Язык", turkish: "Турецкий", english: "Английский", imageLoading: "Подготовка изображения"
    },
    navigation: {
      buyVehicle: "Купить автомобиль", vehicles: "Автомобили", newCars: "Новые автомобили", usedCars: "Автомобили с пробегом", video: "Видео", categories: "Категории", favorites: "Избранное", profile: "Профиль", notifications: "Уведомления", parts: "Запчасти", services: "Услуги", insurance: "Страхование", myListings: "Мои объявления", settings: "Настройки", admin: "Администрирование", messages: "Сообщения"
    },
    footer: {
      description: "Маркетплейс Jolmod для поиска, размещения и выбора автомобилей в Казахстане.", about: "О Jolmod", trustCenter: "Центр доверия", contact: "Контакты", marketplace: "Маркетплейс", buyVehicle: "Купить автомобиль", sell: "Разместить объявление", listingRules: "Правила объявлений", policies: "Документы", terms: "Условия использования", privacy: "Политика конфиденциальности", cookies: "Политика cookie", moderation: "Правила модерации", content: "Материалы", news: "Новости", mobileApp: "Мобильное приложение"
    }
  },
  kk: {
    common: {
      translationUnavailable: "Мазмұн қазір қолжетімсіз.", appName: "Jolmod", continue: "Жалғастыру", cancel: "Бас тарту", save: "Сақтау", loading: "Жүктелуде", back: "Артқа", close: "Жабу", search: "Іздеу", reset: "Қалпына келтіру", clear: "Тазалау", showAll: "Барлығын көру", publishListing: "Хабарландыру жариялау", adminPanel: "Әкімші панелі", comingSoon: "Жақында қолжетімді", noInfo: "Ақпарат жоқ", locationUnknown: "Орналасқан жері көрсетілмеген", priceNotProvided: "Бағасы көрсетілмеген", language: "Тіл", turkish: "Түрік тілі", english: "Ағылшын тілі", imageLoading: "Сурет дайындалуда"
    },
    navigation: {
      buyVehicle: "Көлік сатып алу", vehicles: "Көліктер", newCars: "Жаңа көліктер", usedCars: "Жүрілген көліктер", video: "Бейне", categories: "Санаттар", favorites: "Таңдаулылар", profile: "Профиль", notifications: "Хабарландырулар", parts: "Қосалқы бөлшектер", services: "Қызметтер", insurance: "Сақтандыру", myListings: "Менің хабарландыруларым", settings: "Баптаулар", admin: "Әкімшілендіру", messages: "Хабарламалар"
    },
    footer: {
      description: "Қазақстанда көлік іздеуге, жариялауға және таңдауға арналған Jolmod маркетплейсі.", about: "Jolmod туралы", trustCenter: "Сенім орталығы", contact: "Байланыс", marketplace: "Маркетплейс", buyVehicle: "Көлік сатып алу", sell: "Хабарландыру жариялау", listingRules: "Хабарландыру ережелері", policies: "Құжаттар", terms: "Пайдалану шарттары", privacy: "Құпиялылық саясаты", cookies: "Cookie саясаты", moderation: "Модерация ережелері", content: "Материалдар", news: "Жаңалықтар", mobileApp: "Мобильді қосымша"
    }
  },
  en: {
    common: {
      translationUnavailable: "Content is unavailable right now.", appName: "Jolmod", continue: "Continue", cancel: "Cancel", save: "Save", loading: "Loading", back: "Back", close: "Close", search: "Search", reset: "Reset", clear: "Clear", showAll: "View all", publishListing: "Publish listing", adminPanel: "Admin panel", comingSoon: "Coming soon", noInfo: "No information", locationUnknown: "Location not specified", priceNotProvided: "Price not provided", language: "Language", turkish: "Turkish", english: "English", imageLoading: "Preparing image"
    },
    navigation: {
      buyVehicle: "Buy a vehicle", vehicles: "Vehicles", newCars: "New cars", usedCars: "Used cars", video: "Video", categories: "Categories", favorites: "Favorites", profile: "Profile", notifications: "Notifications", parts: "Spare parts", services: "Services", insurance: "Insurance", myListings: "My listings", settings: "Settings", admin: "Administration", messages: "Messages"
    },
    footer: {
      description: "Jolmod is Kazakhstan's marketplace for finding, listing, and choosing vehicles.", about: "About Jolmod", trustCenter: "Trust Center", contact: "Contact", marketplace: "Marketplace", buyVehicle: "Buy a vehicle", sell: "Publish listing", listingRules: "Listing rules", policies: "Policies", terms: "Terms of use", privacy: "Privacy policy", cookies: "Cookie policy", moderation: "Moderation policy", content: "Content", news: "News", mobileApp: "Mobile app"
    }
  },
  "zh-CN": {
    common: {
      translationUnavailable: "内容暂时不可用。", appName: "Jolmod", continue: "继续", cancel: "取消", save: "保存", loading: "加载中", back: "返回", close: "关闭", search: "搜索", reset: "重置", clear: "清除", showAll: "查看全部", publishListing: "发布车辆", adminPanel: "管理面板", comingSoon: "即将推出", noInfo: "暂无信息", locationUnknown: "未指定地点", priceNotProvided: "未提供价格", language: "语言", turkish: "土耳其语", english: "英语", imageLoading: "正在准备图片"
    },
    navigation: {
      buyVehicle: "购买车辆", vehicles: "车辆", newCars: "新车", usedCars: "二手车", video: "视频", categories: "分类", favorites: "收藏", profile: "个人资料", notifications: "通知", parts: "零配件", services: "服务", insurance: "保险", myListings: "我的车辆", settings: "设置", admin: "管理", messages: "消息"
    },
    footer: {
      description: "Jolmod 是面向哈萨克斯坦的车辆搜索、发布和选购平台。", about: "关于 Jolmod", trustCenter: "信任中心", contact: "联系我们", marketplace: "车辆市场", buyVehicle: "购买车辆", sell: "发布车辆", listingRules: "发布规则", policies: "政策", terms: "使用条款", privacy: "隐私政策", cookies: "Cookie 政策", moderation: "审核政策", content: "内容", news: "新闻", mobileApp: "移动应用"
    }
  }
} satisfies Record<"ru" | "kk" | "en" | "zh-CN", SharedShellCopy>;

export type GlobalLaunchLocale = keyof typeof globalLaunchSharedCopy;

export function getGlobalLaunchSharedCopy(locale: string | null | undefined) {
  switch (locale) {
    case "ru": return globalLaunchSharedCopy.ru;
    case "kk": return globalLaunchSharedCopy.kk;
    case "en": return globalLaunchSharedCopy.en;
    case "zh-CN": return globalLaunchSharedCopy["zh-CN"];
    default: return undefined;
  }
}
