/**
 * News is intentionally first-party editorial content for the MVP.
 *
 * This module is the only content boundary consumed by the news UI. Do not
 * add RSS/API fetching, scraping, or copied third-party article text here.
 * A future CMS/provider integration must introduce an explicitly approved,
 * licensed adapter before it can feed this contract.
 */
export const NEWS_CONTENT_SOURCE = "first-party-editorial" as const;

export const NEWS_CONTENT_SOURCE_POLICY = {
  source: NEWS_CONTENT_SOURCE,
  externalIngestionAllowed: false,
  requiresLicenseReview: true
} as const;

export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
  body: string[];
  source: typeof NEWS_CONTENT_SOURCE;
};

export const newsArticles: NewsArticle[] = [
  {
    slug: "elektr-kolikpen-saparga-daiyndyk",
    title: "Электромобильмен сапарға қалай дайындалуға болады?",
    excerpt: "Күнделікті маршрут, зарядтау жоспары және маусымдық қорды алдын ала бағалау жол жүруді жеңілдетеді.",
    category: "Электрлі көлік",
    publishedAt: "2026-07-01",
    source: NEWS_CONTENT_SOURCE,
    body: [
      "Электромобильді таңдарда тек паспорттағы жүріс қорына емес, өзіңіздің күнделікті бағытыңызға және маусымдық жағдайға назар аударыңыз.",
      "Ұзақ сапар алдында зарядтау нүктелерін, аялдау уақытын және балама бағыттарды жоспарлаған дұрыс.",
      "Jolcar материалдары көлікті бағаға ғана емес, нақты пайдалану қажеттілігі мен қауіпсіздікке сай бағалауға көмектеседі."
    ]
  },
  {
    slug: "qoldanylgan-kolik-tekseru-paragy",
    title: "Қолданылған көлікті қараудың қысқа чек-парағы",
    excerpt: "Алғашқы хабарласудан бастап техникалық тексеріске дейінгі негізгі қадамдар.",
    category: "Нұсқаулық",
    publishedAt: "2026-06-30",
    source: NEWS_CONTENT_SOURCE,
    body: [
      "Жарияланымдағы сипаттама, қызмет көрсету жазбалары, жүріс дерегі және фотолардың сәйкестігі алғашқы пайдалы белгілер болады.",
      "Кездесуге дейін ұқсас модельдердің бағасын, шығарылған жылын және қозғалтқыш нұсқаларын салыстырыңыз.",
      "Көлікті міндетті түрде жеке тексеріп, тәуелсіз техникалық сараптаманы ұйымдастырыңыз. Jolcar сатып алушы мен сатушы арасындағы төлемге араласпайды."
    ]
  },
  {
    slug: "qala-ishi-kolikke-tandau-zhasau",
    title: "Қала ішінде жүретін көлікті қалай таңдауға болады?",
    excerpt: "Жанармай шығыны, өлшем, тұраққа қою ыңғайлылығы және қауіпсіздік жабдықтарының тепе-теңдігін табыңыз.",
    category: "Нарық",
    publishedAt: "2026-06-28",
    source: NEWS_CONTENT_SOURCE,
    body: [
      "Қалада жүретін көлікте баға ғана емес, жанармай шығыны, жабдықталуы және тұраққа қоюға ыңғайлылығы да маңызды.",
      "Шағын хэтчбек, седан және кроссовер әртүрлі отбасы мен жұмыс тәртібіне сай келеді.",
      "Jolcar іздеуі өз қажеттілігіңізге қарай көліктерді салыстыруға көмектеседі."
    ]
  }
];

export function getArticle(slug: string) {
  return newsArticles.find((article) => article.slug === slug) ?? null;
}
