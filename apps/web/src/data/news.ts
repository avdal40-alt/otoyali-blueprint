/**
 * Jolcar news is repository-versioned first-party editorial content.
 *
 * This module is the only content-provider boundary consumed by the news UI.
 * It intentionally performs no network I/O: external RSS/API fetching,
 * scraping, and copied third-party article text are prohibited unless a
 * separately approved, licensed provider implements this contract.
 */
export const NEWS_CONTENT_SOURCE = "first-party-editorial" as const;

export const NEWS_CONTENT_SOURCE_POLICY = {
  source: NEWS_CONTENT_SOURCE,
  externalIngestionAllowed: false,
  requiresLicenseReview: true
} as const;

export type NewsContentContext = {
  countryCode?: string;
  locale?: string;
  limit?: number;
};

export type NewsSourceMetadata = {
  id: typeof NEWS_CONTENT_SOURCE;
  ownership: "jolcar-owned";
  licensing: "first-party-original";
  attribution: "Jolcar Editorial";
  copyrightNotice: "© Jolcar. Original editorial content.";
  countryCodes: readonly ["KZ"];
  supportedLocales: readonly ["kk-KZ", "ru-KZ", "en"];
  defaultContentLocale: "kk-KZ";
  externalIngestionAllowed: false;
};

export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
  body: readonly string[];
  source: typeof NEWS_CONTENT_SOURCE;
  provenance: "jolcar-owned";
  attribution: "Jolcar Editorial";
  contentLocale: "kk-KZ";
};

export type NewsContentProvider = {
  readonly metadata: NewsSourceMetadata;
  listArticles(context?: NewsContentContext): NewsArticle[];
  getArticle(slug: string, context?: NewsContentContext): NewsArticle | null;
};

export const FIRST_PARTY_EDITORIAL_SOURCE: NewsSourceMetadata = {
  id: NEWS_CONTENT_SOURCE,
  ownership: "jolcar-owned",
  licensing: "first-party-original",
  attribution: "Jolcar Editorial",
  copyrightNotice: "© Jolcar. Original editorial content.",
  countryCodes: ["KZ"],
  supportedLocales: ["kk-KZ", "ru-KZ", "en"],
  defaultContentLocale: "kk-KZ",
  externalIngestionAllowed: false
};

const editorialArticles: readonly NewsArticle[] = [
  {
    slug: "elektr-kolikpen-saparga-daiyndyk",
    title: "Электромобильмен сапарға қалай дайындалуға болады?",
    excerpt: "Күнделікті маршрут, зарядтау жоспары және маусымдық қорды алдын ала бағалау жол жүруді жеңілдетеді.",
    category: "Электрлі көлік",
    publishedAt: "2026-07-01",
    source: NEWS_CONTENT_SOURCE,
    provenance: "jolcar-owned",
    attribution: "Jolcar Editorial",
    contentLocale: "kk-KZ",
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
    provenance: "jolcar-owned",
    attribution: "Jolcar Editorial",
    contentLocale: "kk-KZ",
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
    provenance: "jolcar-owned",
    attribution: "Jolcar Editorial",
    contentLocale: "kk-KZ",
    body: [
      "Қалада жүретін көлікте баға ғана емес, жанармай шығыны, жабдықталуы және тұраққа қоюға ыңғайлылығы да маңызды.",
      "Шағын хэтчбек, седан және кроссовер әртүрлі отбасы мен жұмыс тәртібіне сай келеді.",
      "Jolcar іздеуі өз қажеттілігіңізге қарай көліктерді салыстыруға көмектеседі."
    ]
  }
];

function supportsCountry(countryCode?: string) {
  return !countryCode || countryCode.toUpperCase() === "KZ";
}

function resolveLimit(limit?: number) {
  if (!Number.isFinite(limit)) return editorialArticles.length;
  return Math.max(0, Math.min(Math.floor(Number(limit)), 50));
}

export const firstPartyEditorialNewsProvider: NewsContentProvider = {
  metadata: FIRST_PARTY_EDITORIAL_SOURCE,
  listArticles(context = {}) {
    if (!supportsCountry(context.countryCode)) return [];
    return editorialArticles.slice(0, resolveLimit(context.limit));
  },
  getArticle(slug, context = {}) {
    if (!supportsCountry(context.countryCode)) return null;
    return editorialArticles.find((article) => article.slug === slug) ?? null;
  }
};

// Consumers use these delegates, never a concrete provider implementation.
export const getNewsArticles = (context?: NewsContentContext) => firstPartyEditorialNewsProvider.listArticles(context);
export const getArticle = (slug: string, context?: NewsContentContext) => firstPartyEditorialNewsProvider.getArticle(slug, context);

// Compatibility export for existing server-rendered views; new reads should use
// getNewsArticles so providers can be selected without changing the UI.
export const newsArticles = getNewsArticles();
