const reservedServiceSlugs = new Set([
  "basvuru",
  "apply",
  "admin",
  "api",
  "arama",
  "search",
  "kategori",
  "category",
  "trust",
  "guven",
  "new",
  "edit"
]);

const turkishCharacterMap: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  i: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "c",
  Ğ: "g",
  İ: "i",
  I: "i",
  Ö: "o",
  Ş: "s",
  Ü: "u"
};

export function normalizeServiceSlug(value: string) {
  const normalized = value
    .trim()
    .split("")
    .map((char) => turkishCharacterMap[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return normalized || "servis";
}

export function isReservedServiceSlug(value?: string | null) {
  if (!value) return false;
  return reservedServiceSlugs.has(normalizeServiceSlug(value));
}

export function isSafeServiceSlug(value?: string | null) {
  if (!value) return false;
  const slug = normalizeServiceSlug(value);
  return slug === value && !isReservedServiceSlug(slug);
}
