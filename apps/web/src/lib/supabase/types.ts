export type HomeListing = {
  listing_id: string;
  vehicle_profile_id: string;
  title: string;
  price_amount: number;
  currency: string;
  city: string;
  published_at: string | null;
  make_name: string;
  model_name: string;
  year: number;
  mileage_km: number;
  fuel_type: string;
  transmission: string;
  cover_image_url: string | null;
};

export type ListingDetails = {
  listing_id: string;
  vehicle_profile_id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_amount: number;
  currency: string;
  price_negotiable: boolean;
  city: string;
  published_at: string | null;
  make_name: string;
  model_name: string;
  year: number;
  mileage_km: number;
  fuel_type: string;
  transmission: string;
};

export type ListingMedia = {
  listing_id: string;
  vehicle_profile_id: string;
  media_id: string;
  url: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
};

export type Make = {
  make_id: string;
  make_name: string;
  make_slug: string;
};

export type Model = {
  model_id: string;
  make_id: string;
  make_name: string;
  model_name: string;
  model_slug: string;
};

export type Profile = {
  id: string;
  phone: string | null;
  email?: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
  language: string;
  country: string;
  city: string | null;
  timezone: string;
  onboarding_completed_at?: string | null;
};

export type FavoriteRow = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type PublishListingInput = {
  makeId: string;
  modelId: string;
  year: number;
  mileageKm: number;
  fuelType: string;
  transmission: string;
  city: string;
  priceAmount: number;
  currency: string;
  priceNegotiable: boolean;
  title: string;
  description: string | null;
  photos: File[];
};
