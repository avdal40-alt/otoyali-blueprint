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

export type OtoyaliVideo = {
  video_id: string;
  listing_id?: string | null;
  title?: string | null;
  description?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  poster_url?: string | null;
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
  original_url?: string | null;
  large_url?: string | null;
  card_url?: string | null;
  thumb_url?: string | null;
  storage_path?: string | null;
  original_path?: string | null;
  large_path?: string | null;
  card_path?: string | null;
  thumb_path?: string | null;
  media_type?: string | null;
  sort_order?: number | null;
  is_cover?: boolean | null;
  processed_status?: string | null;
  blur_status?: string | null;
  width?: number | null;
  height?: number | null;
  aspect_ratio?: number | null;
  mime_type?: string | null;
  size_bytes?: number | null;
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

export type ServicePublicCategory = {
  category_id: string;
  category_key: string;
  seo_slug?: string | null;
  icon_name?: string | null;
  supported_verticals?: string[] | null;
  availability_status?: string | null;
  booking_readiness?: string | null;
  emergency_relevant?: boolean | null;
  sort_order?: number | null;
};

export type ServicePublicProvider = {
  provider_id: string;
  provider_slug: string;
  business_name: string;
  public_summary?: string | null;
  website_url?: string | null;
  verification_status?: string | null;
  primary_city?: string | null;
  primary_district?: string | null;
  branch_count?: number | null;
  service_category_keys?: string[] | null;
  supported_verticals?: string[] | null;
  published_at?: string | null;
};

export type ServicePublicProviderDetails = {
  provider_id: string;
  provider_slug: string;
  business_name: string;
  public_summary?: string | null;
  website_url?: string | null;
  verification_status?: string | null;
  provider_published_at?: string | null;
  branch_id: string;
  branch_slug: string;
  branch_name: string;
  branch_description?: string | null;
  city?: string | null;
  district?: string | null;
  public_address?: string | null;
  branch_status?: string | null;
  branch_published_at?: string | null;
};

export type ServicePublicOffering = {
  offering_id: string;
  provider_id: string;
  provider_slug: string;
  branch_id: string;
  branch_slug: string;
  category_id: string;
  category_key: string;
  display_name: string;
  description?: string | null;
  pricing_mode?: string | null;
  price_min_amount?: number | null;
  price_max_amount?: number | null;
  currency?: string | null;
  duration_min_minutes?: number | null;
  duration_max_minutes?: number | null;
  booking_mode?: string | null;
  supported_verticals?: string[] | null;
};

export type ServiceProviderApplicationAdminRow = {
  application_id: string;
  submitter_id?: string | null;
  status?: string | null;
  business_name?: string | null;
  contact_person_name?: string | null;
  contact_phone?: string | null;
  city?: string | null;
  district?: string | null;
  category_keys?: string[] | null;
  supported_verticals?: string[] | null;
  website_url?: string | null;
  notes?: string | null;
  consent_accuracy?: boolean | null;
  moderation_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
