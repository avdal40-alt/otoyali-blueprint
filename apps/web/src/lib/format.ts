import { DEFAULT_LOCALE, getIntlLocale, normalizeLocale } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";

export function formatCurrency(amount?: number | null, currency: string | null | undefined = "TRY", locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return t(normalizedLocale, "format.priceNotProvided");
  }

  const rounded = Math.round(Number(amount));
  const code = currency || "TRY";
  const formatted = formatNumber(rounded, normalizedLocale);

  if (normalizedLocale === "tr") {
    return code === "TRY" ? `${formatted} TL` : `${formatted} ${code}`;
  }

  return code === "TRY" ? `TRY ${formatted}` : `${code} ${formatted}`;
}

export function formatPrice(amount?: number | null, currency: string | null | undefined = "TRY", locale?: string | null) {
  return formatCurrency(amount, currency, locale);
}

export function formatNumber(value?: number | null, locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";

  return new Intl.NumberFormat(getIntlLocale(normalizedLocale), {
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function formatMileage(km?: number | null, locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (km === null || km === undefined || Number.isNaN(Number(km))) {
    return t(normalizedLocale, "format.noInfo");
  }

  return `${formatNumber(Number(km), normalizedLocale)} km`;
}

export function formatDate(value: string | null | undefined, locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (!value) return "";

  return new Intl.DateTimeFormat(getIntlLocale(normalizedLocale), {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined, locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (!value) return "";

  return new Intl.DateTimeFormat(getIntlLocale(normalizedLocale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatRelativeDate(value: string | null | undefined, locale?: string | null) {
  const normalizedLocale = resolveFormatLocale(locale);
  if (!value) return "";

  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return new Intl.RelativeTimeFormat(getIntlLocale(normalizedLocale), {
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

export function normalizePhoneTR(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("90")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    return `+90${digits.slice(1)}`;
  }

  return `+90${digits}`;
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
