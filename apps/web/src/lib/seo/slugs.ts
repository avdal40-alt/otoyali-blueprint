const TURKISH_CHARACTERS: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u"
};

export function toSeoSlug(value?: string | null) {
  const clean = value?.trim() ?? "";
  if (!clean) return "";

  return clean
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (character) => TURKISH_CHARACTERS[character] ?? character)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ve ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function citySeoSlug(cityName?: string | null, citySlug?: string | null) {
  return toSeoSlug(citySlug || cityName);
}

export function makeSeoSlug(makeName?: string | null, makeSlug?: string | null) {
  return toSeoSlug(makeSlug || makeName);
}

export function modelSeoSlug(modelName?: string | null, modelSlug?: string | null) {
  return toSeoSlug(modelSlug || modelName);
}
