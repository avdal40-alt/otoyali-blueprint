export function formatPrice(amount: number, currency = "TRY", locale = "tr-TR") {
  const rounded = Math.round(Number(amount || 0));
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0
  }).format(rounded);

  return `${formatted} ${currency || "TRY"}`;
}

export function formatMileage(km: number, locale = "tr-TR") {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(km || 0))} km`;
}

export function formatDate(value: string | null, locale = "tr-TR") {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function fuelLabel(value: string, locale = "tr") {
  const labels: Record<string, Record<string, string>> = {
    tr: {
      gasoline: "Benzin",
      diesel: "Dizel",
      lpg: "LPG",
      electric: "Elektrik",
      hybrid: "Hibrit"
    },
    en: {
      gasoline: "Petrol",
      diesel: "Diesel",
      lpg: "LPG",
      electric: "Electric",
      hybrid: "Hybrid"
    }
  };

  return labels[locale]?.[value] ?? titleCase(value);
}

export function transmissionLabel(value: string, locale = "tr") {
  const labels: Record<string, Record<string, string>> = {
    tr: {
      manual: "Manuel",
      automatic: "Otomatik"
    },
    en: {
      manual: "Manual",
      automatic: "Automatic"
    }
  };

  return labels[locale]?.[value] ?? titleCase(value);
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
