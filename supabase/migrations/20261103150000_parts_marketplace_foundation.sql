BEGIN;

-- A parts listing is deliberately separate from vehicle inventory: it has no
-- vehicle-profile or vehicle-ownership row to spoof.  All writes remain
-- behind owner-bound RPCs, while public readers receive projections only.
CREATE TYPE marketplace.parts_listing_status AS ENUM (
  'draft', 'pending_review', 'active', 'paused', 'rejected', 'archived'
);

CREATE TABLE marketplace.parts_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_contact_phone_id UUID NOT NULL REFERENCES identity.verified_seller_contact_phones(id) ON DELETE RESTRICT,
  city_id UUID NOT NULL REFERENCES marketplace.cities(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  part_condition TEXT NOT NULL,
  brand TEXT,
  part_number TEXT,
  compatible_vehicles TEXT[] NOT NULL DEFAULT '{}',
  price_amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'KZT',
  status marketplace.parts_listing_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT parts_listings_title_chk CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  CONSTRAINT parts_listings_description_chk CHECK (description IS NULL OR char_length(btrim(description)) <= 5000),
  CONSTRAINT parts_listings_category_chk CHECK (char_length(btrim(category)) BETWEEN 1 AND 80),
  CONSTRAINT parts_listings_condition_chk CHECK (part_condition IN ('new', 'used', 'refurbished')),
  CONSTRAINT parts_listings_brand_chk CHECK (brand IS NULL OR char_length(btrim(brand)) BETWEEN 1 AND 80),
  CONSTRAINT parts_listings_part_number_chk CHECK (part_number IS NULL OR char_length(btrim(part_number)) BETWEEN 1 AND 100),
  CONSTRAINT parts_listings_compatible_vehicles_chk CHECK (cardinality(compatible_vehicles) <= 20),
  CONSTRAINT parts_listings_price_chk CHECK (price_amount > 0),
  CONSTRAINT parts_listings_currency_chk CHECK (currency = 'KZT')
);

CREATE INDEX parts_listings_public_search_idx
  ON marketplace.parts_listings (city_id, category, part_condition, published_at DESC, id)
  WHERE status = 'active';
CREATE INDEX parts_listings_owner_idx ON marketplace.parts_listings (seller_id, updated_at DESC, id);

CREATE TRIGGER parts_listings_set_updated_at
  BEFORE UPDATE ON marketplace.parts_listings
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.set_parts_listing_published_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = marketplace, pg_catalog AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
  ELSIF NEW.status <> 'active' THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER parts_listings_set_published_at
  BEFORE INSERT OR UPDATE OF status ON marketplace.parts_listings
  FOR EACH ROW EXECUTE FUNCTION marketplace.set_parts_listing_published_at();

ALTER TABLE marketplace.parts_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE marketplace.parts_listings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.parts_listings TO service_role;

CREATE TABLE identity.parts_listing_seller_contact_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  parts_listing_id UUID NOT NULL REFERENCES marketplace.parts_listings(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parts_listing_contact_disclosures_buyer_created_idx
  ON identity.parts_listing_seller_contact_disclosures (buyer_id, created_at DESC);
ALTER TABLE identity.parts_listing_seller_contact_disclosures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE identity.parts_listing_seller_contact_disclosures FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION marketplace.public_parts_search(
  p_query TEXT DEFAULT NULL, p_category TEXT DEFAULT NULL, p_condition TEXT DEFAULT NULL,
  p_city_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 48
) RETURNS TABLE (
  listing_id UUID, title TEXT, description TEXT, category TEXT, part_condition TEXT,
  brand TEXT, part_number TEXT, compatible_vehicles TEXT[], price_amount BIGINT,
  currency CHAR(3), city_name TEXT, published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
  SELECT l.id, l.title, l.description, l.category, l.part_condition, l.brand,
    l.part_number, l.compatible_vehicles, l.price_amount, l.currency, c.name, l.published_at
  FROM marketplace.parts_listings l
  JOIN marketplace.cities c ON c.id = l.city_id AND c.country_code = 'KZ' AND c.is_active
  WHERE l.status = 'active'
    AND (p_query IS NULL OR btrim(p_query) = '' OR l.title ILIKE '%' || btrim(p_query) || '%' OR coalesce(l.part_number, '') ILIKE '%' || btrim(p_query) || '%')
    AND (p_category IS NULL OR btrim(p_category) = '' OR l.category = btrim(p_category))
    AND (p_condition IS NULL OR btrim(p_condition) = '' OR l.part_condition = btrim(p_condition))
    AND (p_city_id IS NULL OR l.city_id = p_city_id)
  ORDER BY l.published_at DESC, l.id
  LIMIT least(greatest(coalesce(p_limit, 48), 1), 48);
$$;

CREATE OR REPLACE FUNCTION public.create_own_parts_listing_draft(
  p_title TEXT, p_description TEXT, p_category TEXT, p_part_condition TEXT, p_brand TEXT,
  p_part_number TEXT, p_compatible_vehicles TEXT[], p_price_amount_text TEXT,
  p_city_id UUID, p_seller_contact_phone_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, identity, pg_catalog AS $$
DECLARE v_user UUID := auth.uid(); v_id UUID;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF public.is_admin(v_user) THEN RAISE EXCEPTION 'staff accounts cannot perform seller actions' USING ERRCODE = 'OT403'; END IF;
  PERFORM identity.require_kazakhstan_seller_contact_phone(v_user, p_seller_contact_phone_id);
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 3 AND 160
     OR p_category IS NULL OR char_length(btrim(p_category)) NOT BETWEEN 1 AND 80
     OR p_part_condition NOT IN ('new', 'used', 'refurbished')
     OR p_price_amount_text !~ '^[1-9][0-9]{0,18}$'
     OR p_city_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM marketplace.cities c WHERE c.id = p_city_id AND c.country_code = 'KZ' AND c.is_active)
  THEN RAISE EXCEPTION 'invalid parts listing fields' USING ERRCODE = 'OT422'; END IF;
  INSERT INTO marketplace.parts_listings(seller_id, seller_contact_phone_id, city_id, title, description, category, part_condition, brand, part_number, compatible_vehicles, price_amount)
  VALUES (v_user, p_seller_contact_phone_id, p_city_id, btrim(p_title), NULLIF(btrim(p_description), ''), btrim(p_category), p_part_condition, NULLIF(btrim(p_brand), ''), NULLIF(btrim(p_part_number), ''), coalesce(p_compatible_vehicles, '{}'), p_price_amount_text::BIGINT)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_own_parts_listing_for_review(p_listing_id UUID)
RETURNS marketplace.parts_listing_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, identity, pg_catalog AS $$
DECLARE v_user UUID := auth.uid(); v_status marketplace.parts_listing_status;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  UPDATE marketplace.parts_listings l SET status = 'pending_review'
  WHERE l.id = p_listing_id AND l.seller_id = v_user AND l.status IN ('draft', 'rejected')
    AND EXISTS (SELECT 1 FROM identity.verified_seller_contact_phones c WHERE c.id = l.seller_contact_phone_id AND c.user_id = v_user AND c.is_active AND c.revoked_at IS NULL)
  RETURNING l.status INTO v_status;
  IF v_status IS NULL THEN RAISE EXCEPTION 'parts listing is not available for submission' USING ERRCODE = 'OT403'; END IF;
  RETURN v_status;
END;
$$;

-- Public browse may reveal listing content but never the seller identity or the
-- selected contact identifier. Contact disclosure has its own authenticated
-- facade below.
CREATE OR REPLACE FUNCTION marketplace.public_parts_listing_detail(p_listing_id UUID)
RETURNS TABLE (
  listing_id UUID, title TEXT, description TEXT, category TEXT, part_condition TEXT,
  brand TEXT, part_number TEXT, compatible_vehicles TEXT[], price_amount BIGINT,
  currency CHAR(3), city_name TEXT, published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
  SELECT l.id, l.title, l.description, l.category, l.part_condition, l.brand,
    l.part_number, l.compatible_vehicles, l.price_amount, l.currency, c.name, l.published_at
  FROM marketplace.parts_listings l
  JOIN marketplace.cities c ON c.id = l.city_id AND c.country_code = 'KZ' AND c.is_active
  WHERE l.id = p_listing_id AND l.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.get_parts_listing_seller_contact(p_listing_id UUID)
RETURNS TABLE (phone TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, marketplace, identity, pg_catalog AS $$
  SELECT c.phone_e164
  FROM marketplace.parts_listings l
  JOIN identity.verified_seller_contact_phones c
    ON c.id = l.seller_contact_phone_id AND c.user_id = l.seller_id
  WHERE auth.uid() IS NOT NULL
    AND l.id = p_listing_id
    AND l.status = 'active'
    AND l.seller_id <> auth.uid()
    AND c.is_active AND c.revoked_at IS NULL
    AND identity.is_kazakhstan_e164_phone(c.phone_e164);
$$;

CREATE OR REPLACE FUNCTION public.reserve_parts_listing_seller_contact_disclosure(p_listing_id UUID)
RETURNS TABLE (allowed BOOLEAN)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, marketplace, identity, pg_catalog AS $$
DECLARE v_buyer UUID := auth.uid(); v_now TIMESTAMPTZ := now();
BEGIN
  IF v_buyer IS NULL OR p_listing_id IS NULL THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_buyer::TEXT || ':' || p_listing_id::TEXT, 0));
  IF NOT EXISTS (
    SELECT 1 FROM marketplace.parts_listings l JOIN identity.verified_seller_contact_phones c
      ON c.id=l.seller_contact_phone_id AND c.user_id=l.seller_id
    WHERE l.id=p_listing_id AND l.status='active' AND l.seller_id<>v_buyer
      AND c.is_active AND c.revoked_at IS NULL AND identity.is_kazakhstan_e164_phone(c.phone_e164)
  ) OR (SELECT count(*) FROM identity.parts_listing_seller_contact_disclosures WHERE buyer_id=v_buyer AND created_at>=v_now-INTERVAL '1 hour')>=20
    OR (SELECT count(*) FROM identity.parts_listing_seller_contact_disclosures WHERE buyer_id=v_buyer AND created_at>=v_now-INTERVAL '1 day')>=100
  THEN RETURN QUERY SELECT FALSE; RETURN; END IF;
  INSERT INTO identity.parts_listing_seller_contact_disclosures(buyer_id, parts_listing_id) VALUES(v_buyer,p_listing_id);
  RETURN QUERY SELECT TRUE;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.public_parts_search(TEXT, TEXT, TEXT, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marketplace.public_parts_search(TEXT, TEXT, TEXT, UUID, INTEGER) TO anon, authenticated;
REVOKE ALL ON FUNCTION marketplace.public_parts_listing_detail(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION marketplace.public_parts_listing_detail(UUID) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.create_own_parts_listing_draft(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_own_parts_listing_draft(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_own_parts_listing_for_review(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_own_parts_listing_for_review(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.get_parts_listing_seller_contact(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_parts_listing_seller_contact(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.reserve_parts_listing_seller_contact_disclosure(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_parts_listing_seller_contact_disclosure(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
