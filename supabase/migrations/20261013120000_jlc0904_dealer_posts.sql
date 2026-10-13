BEGIN;

-- JLC-0904: Dealer Social posts reuse only listing media that is already
-- eligible for public display. No new storage bucket or public media path is
-- introduced by a post.
CREATE TABLE marketplace.dealer_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_posts_body_chk CHECK (body IS NULL OR char_length(btrim(body)) BETWEEN 1 AND 5000),
  CONSTRAINT dealer_posts_status_chk CHECK (status IN ('active', 'archived'))
);

CREATE TABLE marketplace.dealer_post_listing_attachments (
  post_id UUID NOT NULL REFERENCES marketplace.dealer_posts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  sort_order SMALLINT NOT NULL,
  PRIMARY KEY (post_id, listing_id),
  CONSTRAINT dealer_post_listing_attachments_sort_chk CHECK (sort_order BETWEEN 0 AND 7)
);

CREATE UNIQUE INDEX dealer_post_listing_attachments_sort_idx
  ON marketplace.dealer_post_listing_attachments (post_id, sort_order);
CREATE INDEX dealer_posts_dealer_active_created_idx
  ON marketplace.dealer_posts (dealer_id, created_at DESC, id DESC) WHERE status = 'active';

CREATE TRIGGER dealer_posts_set_updated_at
  BEFORE UPDATE ON marketplace.dealer_posts
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_own_dealer_post(
  p_body TEXT DEFAULT NULL,
  p_listing_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketplace, vehicle, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_post_id UUID;
  v_listing_id UUID;
  v_position SMALLINT := 0;
  v_listing_ids UUID[] := COALESCE(p_listing_ids, ARRAY[]::UUID[]);
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF COALESCE(btrim(p_body), '') = '' AND cardinality(v_listing_ids) = 0 THEN
    RAISE EXCEPTION 'post body or listing attachment required' USING ERRCODE = 'OT422';
  END IF;
  IF char_length(COALESCE(btrim(p_body), '')) > 5000 OR cardinality(v_listing_ids) > 8
     OR cardinality(v_listing_ids) <> cardinality(ARRAY(SELECT DISTINCT item FROM unnest(v_listing_ids) AS item)) THEN
    RAISE EXCEPTION 'invalid dealer post' USING ERRCODE = 'OT422';
  END IF;
  IF NOT public.is_verified_dealer(v_actor) THEN
    RAISE EXCEPTION 'verified dealer required' USING ERRCODE = 'OT403';
  END IF;

  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM marketplace.listings listing
      WHERE listing.id = v_listing_id AND listing.seller_id = v_actor
        AND listing.seller_type = 'dealer' AND listing.status = 'active'
        AND listing.moderation_status = 'active' AND listing.archived_at IS NULL
        AND marketplace.is_listing_search_eligible(listing.id)
    ) THEN RAISE EXCEPTION 'dealer-owned eligible listing required' USING ERRCODE = 'OT422'; END IF;
  END LOOP;

  INSERT INTO marketplace.dealer_posts (dealer_id, body)
  VALUES (v_actor, NULLIF(btrim(p_body), '')) RETURNING id INTO v_post_id;
  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    INSERT INTO marketplace.dealer_post_listing_attachments (post_id, listing_id, sort_order)
    VALUES (v_post_id, v_listing_id, v_position);
    v_position := v_position + 1;
  END LOOP;
  RETURN v_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_dealer_posts(p_dealer_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (post_id UUID, body TEXT, created_at TIMESTAMPTZ, attachments JSONB)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace, vehicle, pg_catalog
AS $$
  SELECT post.id, post.body, post.created_at,
    COALESCE(jsonb_agg(jsonb_build_object(
      'listing_id', listing.id, 'title', listing.title, 'price_amount', listing.price_amount,
      'currency', listing.currency, 'image_url', COALESCE(media.card_url, media.large_url, media.url),
      'has_video', EXISTS (SELECT 1 FROM marketplace.listing_videos video WHERE video.listing_id = listing.id AND marketplace.is_listing_video_publicly_eligible(video.id))
    ) ORDER BY attachment.sort_order) FILTER (WHERE attachment.listing_id IS NOT NULL), '[]'::jsonb)
  FROM marketplace.dealer_posts post
  LEFT JOIN marketplace.dealer_post_listing_attachments attachment ON attachment.post_id = post.id
  LEFT JOIN marketplace.listings listing ON listing.id = attachment.listing_id
    AND listing.seller_id = post.dealer_id AND listing.seller_type = 'dealer'
    AND listing.status = 'active' AND listing.moderation_status = 'active' AND listing.archived_at IS NULL
    AND marketplace.is_listing_search_eligible(listing.id)
  LEFT JOIN LATERAL (
    SELECT profile_media.card_url, profile_media.large_url, profile_media.url
    FROM vehicle.profile_media profile_media WHERE profile_media.vehicle_profile_id = listing.vehicle_profile_id
    ORDER BY (profile_media.id = listing.cover_media_id) DESC, profile_media.is_cover DESC, profile_media.sort_order, profile_media.created_at LIMIT 1
  ) media ON TRUE
  WHERE post.dealer_id = p_dealer_id AND post.status = 'active' AND public.is_verified_dealer(post.dealer_id)
  GROUP BY post.id
  ORDER BY post.created_at DESC, post.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$;

ALTER TABLE marketplace.dealer_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_post_listing_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_posts_service_role_all ON marketplace.dealer_posts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY dealer_post_listing_attachments_service_role_all ON marketplace.dealer_post_listing_attachments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE marketplace.dealer_posts, marketplace.dealer_post_listing_attachments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.dealer_posts, marketplace.dealer_post_listing_attachments TO service_role;
REVOKE ALL ON FUNCTION public.create_own_dealer_post(TEXT, UUID[]), public.get_public_dealer_posts(UUID, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_own_dealer_post(TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_dealer_posts(UUID, INTEGER) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_dealer_posts(UUID, INTEGER) IS 'Public-safe dealer social projection. Listing attachments expose only existing public listing fields and sanitized card/large/original fallback media URLs.';
NOTIFY pgrst, 'reload schema';
COMMIT;
