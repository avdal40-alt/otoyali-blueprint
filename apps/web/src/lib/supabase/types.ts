export type HomeListing = {
  listing_id: string;
  vehicle_profile_id?: string | null;
  title?: string | null;
  price_amount?: number | null;
  currency?: string | null;
  price_negotiable?: boolean | null;
  city?: string | null;
  published_at: string | null;
  make_name?: string | null;
  model_name?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  cover_image_url?: string | null;
  media_count?: number | null;
  body_type?: string | null;
  condition?: string | null;
  seller_type?: string | null;
  drive_type?: string | null;
  color?: string | null;
  engine_volume_l?: number | null;
  damage_state?: string | null;
  owner_count?: number | null;
  quality_score?: number | null;
  seller_display_name?: string | null;
  video_count?: number | null;
};

export type ListingDetails = {
  listing_id: string;
  vehicle_profile_id?: string | null;
  seller_id?: string | null;
  title?: string | null;
  description: string | null;
  price_amount?: number | null;
  currency?: string | null;
  price_negotiable?: boolean | null;
  city?: string | null;
  published_at: string | null;
  make_name?: string | null;
  model_name?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel_type?: string | null;
  transmission?: string | null;
  cover_image_url?: string | null;
  media_count?: number | null;
  body_type?: string | null;
  condition?: string | null;
  seller_type?: string | null;
  drive_type?: string | null;
  color?: string | null;
  engine_volume_l?: number | null;
  damage_state?: string | null;
  owner_count?: number | null;
  quality_score?: number | null;
  seller_display_name?: string | null;
  video_count?: number | null;
};

export type AkisVideo = {
  video_id: string;
  listing_id?: string | null;
  title?: string | null;
  description?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  likes_count?: number | null;
  views_count?: number | null;
  created_at?: string | null;
  sort_order?: number | null;
  listing_title?: string | null;
  price_amount?: number | null;
  currency?: string | null;
  city?: string | null;
  year?: number | null;
  mileage_km?: number | null;
  fuel_type?: string | null;
  seller_type?: string | null;
  seller_display_name?: string | null;
  cover_image_url?: string | null;
};

export type ListingMedia = {
  listing_id: string;
  vehicle_profile_id?: string | null;
  media_id?: string | null;
  url?: string | null;
  storage_path?: string | null;
  media_type?: string | null;
  sort_order?: number | null;
  is_cover?: boolean | null;
};

export type Make = {
  make_id: string;
  make_name?: string | null;
  make_slug?: string | null;
};

export type Model = {
  model_id: string;
  make_id?: string | null;
  make_name?: string | null;
  model_name?: string | null;
  model_slug?: string | null;
};

export type City = {
  city_id: string;
  city_name?: string | null;
  city_slug?: string | null;
  country_code?: string | null;
  sort_order?: number | null;
};

export type Profile = {
  id: string;
  phone: string | null;
  email?: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  seller_type?: string | null;
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
