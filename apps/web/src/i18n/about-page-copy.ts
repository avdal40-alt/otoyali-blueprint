export type AboutPageCopy = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  pillars: readonly Readonly<{ title: string; body: string }>[];
  home: string;
}>;

const ru: AboutPageCopy = {
  eyebrow: "Jolmod",
  title: "Автомобильный маркетплейс Казахстана",
  description: "Jolmod объединяет поиск автомобилей, публикацию объявлений и полезные автомобильные материалы на одной платформе.",
  pillars: [
    { title: "Гостевой доступ", body: "Просматривайте объявления без аккаунта; вход понадобится при связи с продавцом или публикации." },
    { title: "Понятный автомобильный опыт", body: "Поиск, просмотр и размещение автомобилей собраны в одном удобном сервисе." },
    { title: "Казахстанский рынок", body: "Категории, города и валюта платформы соответствуют автомобильному рынку Казахстана." }
  ],
  home: "На главную"
};

const kk: AboutPageCopy = {
  eyebrow: "Jolmod",
  title: "Қазақстанның автокөлік маркетплейсі",
  description: "Jolmod көлік іздеуді, хабарландыру жариялауды және пайдалы автокөлік материалдарын бір платформаға біріктіреді.",
  pillars: [
    { title: "Қонақ ретінде қарау", body: "Хабарландыруларды аккаунтсыз көріңіз; кіру сатушымен байланысу немесе жариялау үшін қажет." },
    { title: "Түсінікті автокөлік тәжірибесі", body: "Көлікті іздеу, қарау және жариялау бір ыңғайлы сервисте жиналған." },
    { title: "Қазақстан нарығы", body: "Платформаның санаттары, қалалары және валютасы Қазақстанның автокөлік нарығына сай." }
  ],
  home: "Басты бетке"
};

const en: AboutPageCopy = {
  eyebrow: "Jolmod",
  title: "Kazakhstan's vehicle marketplace",
  description: "Jolmod brings vehicle search, listing publication, and useful automotive content together on one platform.",
  pillars: [
    { title: "Browse as a guest", body: "Explore listings without an account; sign in only to contact a seller or publish a listing." },
    { title: "Clear automotive experience", body: "Vehicle search, viewing, and publishing are brought together in one practical service." },
    { title: "Kazakhstan market", body: "The platform's categories, cities, and currency are aligned with Kazakhstan's vehicle market." }
  ],
  home: "Go to home"
};

const zhCN: AboutPageCopy = {
  eyebrow: "Jolmod",
  title: "哈萨克斯坦车辆市场",
  description: "Jolmod 将车辆搜索、发布和实用汽车内容整合在一个平台上。",
  pillars: [
    { title: "访客浏览", body: "无需账户即可浏览车辆；仅在联系卖家或发布车辆时需要登录。" },
    { title: "清晰的汽车体验", body: "车辆搜索、查看和发布汇集在一个实用服务中。" },
    { title: "哈萨克斯坦市场", body: "平台的分类、城市和货币均与哈萨克斯坦车辆市场相匹配。" }
  ],
  home: "返回首页"
};

export function getAboutPageCopy(locale?: string | null): AboutPageCopy {
  switch (locale?.toLowerCase().replace("_", "-")) {
    case "kk": return kk;
    case "en":
    case "en-us": return en;
    case "zh":
    case "zh-cn": return zhCN;
    case "ru":
    case "ru-ru":
    default: return ru;
  }
}
