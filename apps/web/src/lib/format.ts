import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { CURRENT_MARKET } from "@/lib/market";
import type { CurrencyPlacement, MarketProfile } from "@/lib/market";

export function formatCurrency(amount?: number | null, currency: string | null | undefined = CURRENT_MARKET.currencyCode, locale?: string | null, market: MarketProfile = CURRENT_MARKET) {
  const normalizedLocale = resolveFormatLocale(locale);
  const context = resolveFormatContext(normalizedLocale, market);
  if (!context || !isFiniteNumber(amount)) {
    return t(normalizedLocale, "format.priceNotProvided");
  }

  const rounded = Math.round(Number(amount));
  const code = normalizeCurrencyCode(currency) ?? market.currencyCode;
  const formatted = formatIntlNumber(rounded, context.intlLocale);
  const label = code === market.currencyCode ? context.currencyLabel : code;
  return placeCurrency(formatted, label, context.currencyPlacement);
}

export function formatPrice(amount?: number | null, currency: string | null | undefined = CURRENT_MARKET.currencyCode, locale?: string | null, market: MarketProfile = CURRENT_MARKET) {
  return formatCurrency(amount, currency, locale, market);
}

export function formatNumber(value?: number | null, locale?: string | null, market: MarketProfile = CURRENT_MARKET) {
  const normalizedLocale = resolveFormatLocale(locale);
  const context = resolveFormatContext(normalizedLocale, market);
  if (!context || !isFiniteNumber(value)) return "";

  return formatIntlNumber(Number(value), context.intlLocale);
}

export function formatMileage(km?: number | null, locale?: string | null, market: MarketProfile = CURRENT_MARKET) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (!resolveFormatContext(normalizedLocale, market) || !isFiniteNumber(km)) {
    return t(normalizedLocale, "format.noInfo");
  }

  return `${formatNumber(Number(km), normalizedLocale, market)} km`;
}

export function formatDate(value: string | null | undefined, locale?: string | null, market: MarketProfile = CURRENT_MARKET) {
  const normalizedLocale = resolveFormatLocale(locale);
  const context = resolveFormatContext(normalizedLocale, market);
  const date = parseDate(value);
  if (!context || !date) return "";

  return new Intl.DateTimeFormat(context.intlLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(value: string | null | undefined, locale?: string | null, market: MarketProfile = CURRENT_MARKET) {
  const normalizedLocale = resolveFormatLocale(locale);
  const context = resolveFormatContext(normalizedLocale, market);
  const date = parseDate(value);
  if (!context || !date) return "";

  return new Intl.DateTimeFormat(context.intlLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatRelativeDate(value: string | null | undefined, locale?: string | null, market: MarketProfile = CURRENT_MARKET) {
  const normalizedLocale = resolveFormatLocale(locale);
  const context = resolveFormatContext(normalizedLocale, market);
  const date = parseDate(value);
  if (!context || !date) return "";

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return new Intl.RelativeTimeFormat(context.intlLocale, {
    numeric: "auto"
  }).format(diffDays, "day");
}

export function fuelLabel(value?: string | null, locale?: string | null) {
  return enumLabel("fuel", value, locale);
}

export function transmissionLabel(value?: string | null, locale?: string | null) {
  return enumLabel("transmission", value, locale);
}

export function conditionLabel(value?: string | null, locale?: string | null) {
  return enumLabel("condition", value, locale);
}

export function sellerTypeLabel(value?: string | null, locale?: string | null) {
  return enumLabel("sellerType", value, locale);
}

export function bodyTypeLabel(value?: string | null, locale?: string | null) {
  return enumLabel("bodyType", value, locale);
}

export function driveTypeLabel(value?: string | null, locale?: string | null) {
  return enumLabel("driveType", value, locale);
}

export function damageStateLabel(value?: string | null, locale?: string | null) {
  return enumLabel("damageState", value, locale);
}

export function colorLabel(value?: string | null, locale?: string | null) {
  return enumLabel("color", value, locale);
}

export function cityLabel(value?: string | null, locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  const labels: Record<string, string> = {
    Istanbul: "İstanbul",
    İstanbul: "İstanbul",
    Izmir: "İzmir",
    İzmir: "İzmir",
    Ankara: "Ankara",
    Antalya: "Antalya"
  };

  return value ? labels[value] ?? value : t(normalizedLocale, "format.locationUnknown");
}

export function titleCase(value: string) {
  const clean = value.trim();
  if (!clean) {
    return "-";
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function enumLabel(group: keyof typeof enumLabels, value?: string | null, locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (!value) return t(normalizedLocale, "format.noInfo");
  const normalizedValue = value.toLocaleLowerCase("en-US");
  const labels = enumLabels[group]?.[normalizedLocale] as Record<string, string> | undefined;

  return labels?.[normalizedValue] ?? titleCase(value.replace(/_/g, " "));
}

function resolveFormatLocale(locale?: string | null): Locale {
  if (locale) return normalizeLocale(locale);

  if (typeof document !== "undefined") {
    const cookieLocale = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("otoyali_locale="))
      ?.split("=")[1];

    if (cookieLocale) return normalizeLocale(cookieLocale);

    if (window.location.pathname === "/en" || window.location.pathname.startsWith("/en/")) {
      return "en";
    }
  }

  return DEFAULT_LOCALE;
}

type FormatContext = {
  intlLocale: string;
  currencyLabel: string;
  currencyPlacement: CurrencyPlacement;
};

function resolveFormatContext(locale: Locale, market: MarketProfile): FormatContext | null {
  const formatting = market?.formatting;
  if (!formatting || typeof formatting !== "object") return null;

  const intlLocale = formatting.intlLocaleByLocale?.[locale] ?? formatting.defaultIntlLocale;
  const currencyPlacement = formatting.currencyPlacementByLocale?.[locale] ?? formatting.defaultCurrencyPlacement;
  const currencyLabel = formatting.currencyLabelByLocale?.[locale] ?? formatting.defaultCurrencyLabel;
  if (
    typeof intlLocale !== "string" ||
    typeof formatting.defaultCurrencyLabel !== "string" ||
    typeof currencyLabel !== "string" ||
    !isCurrencyPlacement(currencyPlacement) ||
    !isValidIntlLocale(intlLocale)
  ) {
    return null;
  }

  return { intlLocale, currencyLabel, currencyPlacement };
}

function formatIntlNumber(value: number, intlLocale: string) {
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(value);
}

function placeCurrency(amount: string, label: string, placement: CurrencyPlacement) {
  return placement === "prefix" ? `${label} ${amount}` : `${amount} ${label}`;
}

function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isCurrencyPlacement(value: unknown): value is CurrencyPlacement {
  return value === "prefix" || value === "suffix";
}

function isValidIntlLocale(value: string) {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

const enumLabels = {
  fuel: {
    tr: {
      gasoline: "Benzin",
      diesel: "Dizel",
      lpg: "LPG",
      electric: "Elektrikli",
      hybrid: "Hibrit",
      other: "Diğer"
    },
    en: {
      gasoline: "Petrol",
      diesel: "Diesel",
      lpg: "LPG",
      electric: "Electric",
      hybrid: "Hybrid",
      other: "Other"
    }
  },
  transmission: {
    tr: {
      manual: "Manuel",
      automatic: "Otomatik",
      semi_automatic: "Yarı otomatik"
    },
    en: {
      manual: "Manual",
      automatic: "Automatic",
      semi_automatic: "Semi-automatic"
    }
  },
  condition: {
    tr: {
      used: "İkinci el",
      new: "Sıfır km"
    },
    en: {
      used: "Used",
      new: "New"
    }
  },
  sellerType: {
    tr: {
      private: "Bireysel",
      individual: "Bireysel",
      dealer: "Galeri",
      corporate: "Galeri"
    },
    en: {
      private: "Individual seller",
      individual: "Individual seller",
      dealer: "Dealer",
      corporate: "Dealer"
    }
  },
  bodyType: {
    tr: {
      sedan: "Sedan",
      hatchback: "Hatchback",
      suv: "SUV",
      wagon: "Station wagon",
      coupe: "Coupe",
      pickup: "Pickup",
      minivan: "Minivan",
      commercial: "Ticari",
      other: "Diğer"
    },
    en: {
      sedan: "Sedan",
      hatchback: "Hatchback",
      suv: "SUV",
      wagon: "Station wagon",
      coupe: "Coupe",
      pickup: "Pickup",
      minivan: "Minivan",
      commercial: "Commercial",
      other: "Other"
    }
  },
  driveType: {
    tr: {
      front: "Önden çekiş",
      rear: "Arkadan itiş",
      awd: "AWD",
      "4x4": "4x4"
    },
    en: {
      front: "Front-wheel drive",
      rear: "Rear-wheel drive",
      awd: "AWD",
      "4x4": "4x4"
    }
  },
  damageState: {
    tr: {
      unknown: "Bilinmiyor",
      none: "Hasarsız",
      minor: "Hafif hasarlı",
      major: "Ağır hasarlı",
      painted: "Boyalı",
      replaced: "Değişenli",
      heavy_damage: "Ağır hasar kayıtlı"
    },
    en: {
      unknown: "Unknown",
      none: "No damage",
      minor: "Minor damage",
      major: "Major damage",
      painted: "Painted",
      replaced: "Replaced parts",
      heavy_damage: "Heavy damage record"
    }
  },
  color: {
    tr: {
      white: "Beyaz",
      black: "Siyah",
      gray: "Gri",
      blue: "Mavi",
      red: "Kırmızı",
      silver: "Gümüş"
    },
    en: {
      white: "White",
      black: "Black",
      gray: "Gray",
      blue: "Blue",
      red: "Red",
      silver: "Silver"
    }
  }
};
