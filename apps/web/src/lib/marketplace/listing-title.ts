export type VehicleListingTitleInput = {
  makeName?: string | null;
  modelName?: string | null;
  year?: string | number | null;
};

function normalizeTitlePart(value: string | number | null | undefined) {
  return value?.toString().trim().replace(/\s+/g, " ") ?? "";
}

export function generateVehicleListingTitle({ makeName, modelName, year }: VehicleListingTitleInput) {
  return [makeName, modelName, year]
    .map(normalizeTitlePart)
    .filter(Boolean)
    .join(" ");
}
