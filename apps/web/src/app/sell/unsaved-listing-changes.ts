export type ListingDraftChangeState = {
  makeId: string;
  modelId: string;
  year: string;
  city: string;
  condition: string;
  sellerType: string;
  mileageKm: string;
  fuelType: string;
  transmission: string;
  bodyType: string;
  driveType: string;
  color: string;
  engineVolumeL: string;
  damageState: string;
  ownerCount: string;
  priceAmount: string;
  currency: string;
  priceNegotiable: boolean;
  description: string;
  photoCount: number;
  sellerContactId: string;
};

export function createListingDraftChangeSnapshot(state: ListingDraftChangeState): string {
  return JSON.stringify(state);
}

export function hasMeaningfulListingChanges(
  baseline: string | null,
  state: ListingDraftChangeState
): boolean {
  return baseline !== null && baseline !== createListingDraftChangeSnapshot(state);
}
