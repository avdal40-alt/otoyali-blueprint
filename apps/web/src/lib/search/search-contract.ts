export type SearchV1Request = {
  version: "v1";
  limit: number;
  sort: "newest" | "price_asc" | "price_desc" | "year_desc" | "mileage_asc";
  cursor?: SearchCursor;
  filters: Record<string, unknown>;
};

export type SearchCursor = {
  version: "v1";
  sort: SearchV1Request["sort"];
  listing_id: string;
  published_at?: string;
  ranked_at?: string;
  price_amount?: number;
  year?: number;
  mileage_km?: number;
};

export type PublicSearchItem = {
  listing_id: string;
  make_name: string | null;
  model_name: string | null;
  variant_name?: string | null;
  city_name: string | null;
  district_name?: string | null;
  cover_image_url?: string | null;
  photo_count: number;
  has_video: boolean;
  published_at: string | null;
  views_count?: number | null;
  price_amount: number | null;
  currency: string | null;
  year: number | null;
  mileage_km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
  condition: string | null;
  seller_type: string | null;
  drive_type?: string | null;
  color?: string | null;
  engine_volume_l?: number | null;
  price_negotiable?: boolean | null;
  make_id?: string | null;
  model_id?: string | null;
};

export type SearchV1Response = {
  version: "v1";
  items: PublicSearchItem[];
  next_cursor: SearchCursor | null;
};

export type SearchService = {
  search(request: SearchV1Request): Promise<{ data: SearchV1Response | null; error: string | null }>;
};
