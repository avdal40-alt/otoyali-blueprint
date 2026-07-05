export function formatPrice(amount?: number | null, currency: string | null | undefined = "TRY", locale = "tr-TR") {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "Fiyat belirtilmedi";
  }

  const rounded = Math.round(Number(amount));
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0
  }).format(rounded);

  return `${formatted} ${currency || "TRY"}`;
}

export function formatMileage(km?: number | null, locale = "tr-TR") {
  if (km === null || km === undefined || Number.isNaN(Number(km))) {
    return "Bilgi yok";
  }

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(km))} km`;
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

export function fuelLabel(value?: string | null, locale = "tr") {
  if (!value) {
    return "Bilgi yok";
  }

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

export function transmissionLabel(value?: string | null, locale = "tr") {
  if (!value) {
    return "Bilgi yok";
  }

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

export function conditionLabel(value?: string | null) {
  const labels: Record<string, string> = {
    used: "İkinci el",
    new: "Sıfır km"
  };

  return value ? labels[value] ?? titleCase(value) : "Bilgi yok";
}

export function sellerTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    private: "Bireysel",
    individual: "Bireysel",
    dealer: "Galeri",
    corporate: "Galeri"
  };

  return value ? labels[value] ?? titleCase(value) : "Bilgi yok";
}

export function bodyTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    sedan: "Sedan",
    hatchback: "Hatchback",
    suv: "SUV",
    wagon: "Station wagon",
    coupe: "Coupe"
  };

  return value ? labels[value.toLocaleLowerCase("tr-TR")] ?? titleCase(value) : "Bilgi yok";
}

export function driveTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    front: "Önden çekiş",
    rear: "Arkadan itiş",
    awd: "4x4 / AWD"
  };

  return value ? labels[value] ?? titleCase(value) : "Bilgi yok";
}

export function damageStateLabel(value?: string | null) {
  const labels: Record<string, string> = {
    unknown: "Bilinmiyor",
    none: "Hasarsız",
    minor: "Hafif hasarlı",
    major: "Ağır hasarlı"
  };

  return value ? labels[value] ?? titleCase(value) : "Bilgi yok";
}

export function colorLabel(value?: string | null) {
  const labels: Record<string, string> = {
    white: "Beyaz",
    black: "Siyah",
    gray: "Gri",
    blue: "Mavi",
    red: "Kırmızı",
    silver: "Gümüş"
  };

  return value ? labels[value] ?? titleCase(value) : "Bilgi yok";
}

export function cityLabel(value?: string | null) {
  const labels: Record<string, string> = {
    Istanbul: "İstanbul",
    İstanbul: "İstanbul",
    Izmir: "İzmir",
    İzmir: "İzmir",
    Ankara: "Ankara",
    Antalya: "Antalya"
  };

  return value ? labels[value] ?? value : "Konum belirtilmedi";
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
