export type VehicleListingTitleInput = {
  makeName?: string | null;
  modelName?: string | null;
  year?: string | number | null;
};

function normalizeTitlePart(value: string | number | null | undefined) {
  // Keep this ASCII whitespace set aligned with rejected-edit SQL. Catalog
  // labels are otherwise preserved verbatim, including case and Unicode.
  return value
    ?.toString()
    .replace(/[ \t\n\v\f\r]+/g, " ")
    .replace(/^ | $/g, "") ?? "";
}

export function generateVehicleListingTitle({ makeName, modelName, year }: VehicleListingTitleInput) {
  return [makeName, modelName, year]
    .map(normalizeTitlePart)
    .filter(Boolean)
    .join(" ");
}
