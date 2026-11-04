BEGIN;

-- Specialty listings share the trusted KZ seller-contact and moderation
-- boundary, but never pretend to be passenger-car profiles. This keeps
-- motorcycle, marine and mobility data out of vehicle.vehicle_profiles.
CREATE TABLE marketplace.specialty_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL CHECK (vertical IN ('motorcycles', 'marine', 'mobility')),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  seller_contact_phone_id UUID NOT NULL REFERENCES identity.seller_contact_phones(id),
  seller_type TEXT NOT NULL CHECK (seller_type IN ('private', 'dealer')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'active', 'rejected', 'archived', 'sold')),
  moderation_status TEXT NOT NULL DEFAULT 'draft' CHECK (moderation_status IN ('draft', 'pending_review', 'active', 'rejected', 'archived')),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  description TEXT CHECK (description IS NULL OR char_length(btrim(description)) <= 5000),
  category TEXT NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 80),
  brand TEXT CHECK (brand IS NULL OR char_length(btrim(brand)) <= 80),
  model TEXT CHECK (model IS NULL OR char_length(btrim(model)) <= 80),
  condition TEXT NOT NULL CHECK (condition IN ('new', 'used')),
  year SMALLINT CHECK (year IS NULL OR year BETWEEN 1900 AND EXTRACT(YEAR FROM now())::INTEGER + 1),
  engine_volume_cc INTEGER CHECK (engine_volume_cc IS NULL OR engine_volume_cc > 0),
  length_cm INTEGER CHECK (length_cm IS NULL OR length_cm > 0),
  range_km INTEGER CHECK (range_km IS NULL OR range_km > 0),
  price_amount BIGINT NOT NULL CHECK (price_amount > 0),
  currency TEXT NOT NULL DEFAULT 'KZT' CHECK (currency = 'KZT'),
  city_id UUID NOT NULL REFERENCES marketplace.cities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 500)
);
CREATE INDEX specialty_listings_public_idx ON marketplace.specialty_listings (vertical, city_id, published_at DESC, id) WHERE status = 'active' AND moderation_status = 'active';
CREATE INDEX specialty_listings_owner_idx ON marketplace.specialty_listings (seller_id, updated_at DESC);
CREATE TRIGGER specialty_listings_set_updated_at BEFORE UPDATE ON marketplace.specialty_listings FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

ALTER TABLE marketplace.specialty_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON marketplace.specialty_listings FROM PUBLIC, anon, authenticated;
GRANT ALL ON marketplace.specialty_listings TO service_role;

CREATE TABLE marketplace.specialty_contact_disclosures (
  listing_id UUID NOT NULL REFERENCES marketplace.specialty_listings(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  disclosed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, viewer_id)
);
ALTER TABLE marketplace.specialty_contact_disclosures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON marketplace.specialty_contact_disclosures FROM PUBLIC, anon, authenticated;
GRANT ALL ON marketplace.specialty_contact_disclosures TO service_role;

CREATE FUNCTION marketplace.create_own_specialty_listing_draft(
  p_vertical TEXT, p_title TEXT, p_description TEXT, p_category TEXT, p_brand TEXT, p_model TEXT,
  p_condition TEXT, p_year SMALLINT, p_engine_volume_cc INTEGER, p_length_cm INTEGER, p_range_km INTEGER,
  p_price_amount_text TEXT, p_city_id UUID, p_seller_contact_phone_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, identity, public, pg_catalog AS $$
DECLARE v_user UUID := auth.uid(); v_seller_type TEXT; v_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.is_admin(v_user) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403'; END IF;
  IF p_vertical NOT IN ('motorcycles', 'marine', 'mobility') OR p_title IS NULL OR p_category IS NULL OR p_condition NOT IN ('new', 'used') OR p_price_amount_text !~ '^[1-9][0-9]{0,18}$' THEN RAISE EXCEPTION 'invalid specialty listing fields' USING ERRCODE = 'OT422'; END IF;
  IF (p_vertical = 'motorcycles' AND (p_brand IS NULL OR btrim(p_brand) = '' OR p_model IS NULL OR btrim(p_model) = ''))
     OR (p_vertical = 'marine' AND p_length_cm IS NOT NULL AND p_length_cm <= 0)
     OR (p_vertical = 'mobility' AND p_engine_volume_cc IS NOT NULL) THEN RAISE EXCEPTION 'invalid specialty attributes' USING ERRCODE = 'OT422'; END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user, p_seller_contact_phone_id);
  IF NOT EXISTS (SELECT 1 FROM marketplace.cities WHERE id = p_city_id AND is_active AND country_code = 'KZ') THEN RAISE EXCEPTION 'invalid city' USING ERRCODE = 'OT422'; END IF;
  SELECT seller_type INTO v_seller_type FROM public.profiles WHERE id = v_user FOR SHARE;
  IF v_seller_type NOT IN ('private', 'dealer') THEN RAISE EXCEPTION 'seller profile required' USING ERRCODE = 'OT403'; END IF;
  INSERT INTO marketplace.specialty_listings(vertical,seller_id,seller_contact_phone_id,seller_type,title,description,category,brand,model,condition,year,engine_volume_cc,length_cm,range_km,price_amount,city_id)
  VALUES (p_vertical,v_user,p_seller_contact_phone_id,v_seller_type,btrim(p_title),NULLIF(btrim(p_description),''),btrim(p_category),NULLIF(btrim(p_brand),''),NULLIF(btrim(p_model),''),p_condition,p_year,p_engine_volume_cc,p_length_cm,p_range_km,p_price_amount_text::BIGINT,p_city_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE FUNCTION marketplace.submit_own_specialty_listing_for_review(p_listing_id UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  UPDATE marketplace.specialty_listings SET status='pending_review', moderation_status='pending_review', rejection_reason=NULL
  WHERE id=p_listing_id AND seller_id=v_user AND status IN ('draft','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'listing cannot be submitted' USING ERRCODE = 'OT403'; END IF;
  RETURN 'pending_review';
END; $$;

CREATE FUNCTION marketplace.review_specialty_listing(p_listing_id UUID, p_decision TEXT, p_reason TEXT DEFAULT NULL) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, public, pg_catalog AS $$
DECLARE v_user UUID := auth.uid(); v_status TEXT;
BEGIN
  IF v_user IS NULL OR NOT public.is_admin(v_user) THEN RAISE EXCEPTION 'admin required' USING ERRCODE = 'OT403'; END IF;
  IF p_decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'invalid decision' USING ERRCODE = 'OT422'; END IF;
  UPDATE marketplace.specialty_listings SET status=CASE WHEN p_decision='approve' THEN 'active' ELSE 'rejected' END, moderation_status=CASE WHEN p_decision='approve' THEN 'active' ELSE 'rejected' END, published_at=CASE WHEN p_decision='approve' THEN COALESCE(published_at,now()) ELSE published_at END, moderated_at=now(), moderated_by=v_user, rejection_reason=CASE WHEN p_decision='reject' THEN NULLIF(btrim(p_reason),'') ELSE NULL END
  WHERE id=p_listing_id AND status='pending_review' AND moderation_status='pending_review' RETURNING status INTO v_status;
  IF v_status IS NULL THEN RAISE EXCEPTION 'listing cannot be reviewed' USING ERRCODE = 'OT409'; END IF;
  RETURN v_status;
END; $$;

CREATE FUNCTION marketplace.public_specialty_listings(p_vertical TEXT, p_query TEXT DEFAULT NULL, p_category TEXT DEFAULT NULL, p_city_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 48)
RETURNS TABLE(listing_id UUID, vertical TEXT, title TEXT, category TEXT, brand TEXT, model TEXT, condition TEXT, year SMALLINT, engine_volume_cc INTEGER, length_cm INTEGER, range_km INTEGER, price_amount BIGINT, currency TEXT, city_name TEXT, published_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
  SELECT s.id,s.vertical,s.title,s.category,s.brand,s.model,s.condition,s.year,s.engine_volume_cc,s.length_cm,s.range_km,s.price_amount,s.currency,c.name,s.published_at
  FROM marketplace.specialty_listings s JOIN marketplace.cities c ON c.id=s.city_id AND c.country_code='KZ'
  WHERE s.status='active' AND s.moderation_status='active' AND s.vertical=p_vertical
    AND (p_query IS NULL OR s.title ILIKE '%'||p_query||'%' OR COALESCE(s.brand,'') ILIKE '%'||p_query||'%' OR COALESCE(s.model,'') ILIKE '%'||p_query||'%')
    AND (p_category IS NULL OR s.category=p_category) AND (p_city_id IS NULL OR s.city_id=p_city_id)
  ORDER BY s.published_at DESC, s.id LIMIT LEAST(GREATEST(COALESCE(p_limit,48),1),48);
$$;

CREATE FUNCTION marketplace.public_specialty_listing_detail(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, vertical TEXT, title TEXT, description TEXT, category TEXT, brand TEXT, model TEXT, condition TEXT, year SMALLINT, engine_volume_cc INTEGER, length_cm INTEGER, range_km INTEGER, price_amount BIGINT, currency TEXT, city_name TEXT, published_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
  SELECT s.id,s.vertical,s.title,s.description,s.category,s.brand,s.model,s.condition,s.year,s.engine_volume_cc,s.length_cm,s.range_km,s.price_amount,s.currency,c.name,s.published_at FROM marketplace.specialty_listings s JOIN marketplace.cities c ON c.id=s.city_id AND c.country_code='KZ' WHERE s.id=p_listing_id AND s.status='active' AND s.moderation_status='active';
$$;

CREATE FUNCTION marketplace.get_specialty_listing_seller_contact(p_listing_id UUID) RETURNS TABLE(phone TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = marketplace, identity, pg_catalog AS $$
  SELECT phone.phone_e164 FROM marketplace.specialty_listings s JOIN identity.seller_contact_phones phone ON phone.id=s.seller_contact_phone_id JOIN marketplace.specialty_contact_disclosures disclosure ON disclosure.listing_id=s.id AND disclosure.viewer_id=auth.uid() WHERE s.id=p_listing_id AND s.status='active' AND s.moderation_status='active' AND phone.user_id=auth.uid() IS NOT TRUE AND disclosure.disclosed_at > now() - interval '5 minutes';
$$;

CREATE FUNCTION marketplace.reserve_specialty_listing_seller_contact_disclosure(p_listing_id UUID) RETURNS TABLE(allowed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
DECLARE v_user UUID := auth.uid(); v_recent TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM marketplace.specialty_listings WHERE id=p_listing_id AND status='active' AND moderation_status='active' AND seller_id <> v_user) THEN RAISE EXCEPTION 'contact unavailable' USING ERRCODE='OT403'; END IF;
  SELECT disclosed_at INTO v_recent FROM marketplace.specialty_contact_disclosures WHERE listing_id=p_listing_id AND viewer_id=v_user FOR UPDATE;
  IF v_recent IS NOT NULL AND v_recent > now() - interval '10 seconds' THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
  INSERT INTO marketplace.specialty_contact_disclosures(listing_id,viewer_id,disclosed_at) VALUES(p_listing_id,v_user,now()) ON CONFLICT(listing_id,viewer_id) DO UPDATE SET disclosed_at=EXCLUDED.disclosed_at;
  RETURN QUERY SELECT TRUE;
END; $$;

REVOKE ALL ON FUNCTION marketplace.create_own_specialty_listing_draft(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,SMALLINT,INTEGER,INTEGER,INTEGER,TEXT,UUID,UUID) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION marketplace.submit_own_specialty_listing_for_review(UUID) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION marketplace.review_specialty_listing(UUID,TEXT,TEXT) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION marketplace.public_specialty_listings(TEXT,TEXT,TEXT,UUID,INTEGER) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION marketplace.public_specialty_listing_detail(UUID) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION marketplace.get_specialty_listing_seller_contact(UUID) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION marketplace.reserve_specialty_listing_seller_contact_disclosure(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION marketplace.create_own_specialty_listing_draft(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,SMALLINT,INTEGER,INTEGER,INTEGER,TEXT,UUID,UUID), marketplace.submit_own_specialty_listing_for_review(UUID), marketplace.review_specialty_listing(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.public_specialty_listings(TEXT,TEXT,TEXT,UUID,INTEGER), marketplace.public_specialty_listing_detail(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION marketplace.get_specialty_listing_seller_contact(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.reserve_specialty_listing_seller_contact_disclosure(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
