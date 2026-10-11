BEGIN;

ALTER TABLE marketplace.listings
  ADD COLUMN IF NOT EXISTS raised_at TIMESTAMPTZ;

ALTER TABLE marketplace.listing_search_documents
  ADD COLUMN IF NOT EXISTS raised_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS listings_active_raised_freshness_idx
  ON marketplace.listings (status, moderation_status, raised_at DESC NULLS LAST, published_at DESC, id);
CREATE INDEX IF NOT EXISTS listing_search_documents_newest_raised_idx
  ON marketplace.listing_search_documents (raised_at DESC NULLS LAST, published_at DESC, listing_id);

CREATE OR REPLACE FUNCTION marketplace.refresh_listing_search_document(p_listing_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, vehicle, pg_catalog AS $$
BEGIN
  IF NOT marketplace.is_listing_search_eligible(p_listing_id) THEN
    DELETE FROM marketplace.listing_search_documents WHERE listing_id = p_listing_id;
    RETURN;
  END IF;

  INSERT INTO marketplace.listing_search_documents (
    listing_id,make_id,model_id,variant_id,make_name,model_name,variant_name,condition,year,mileage_km,fuel_type,transmission,body_type,drive_type,color,engine_volume_l,power_kw,battery_capacity_kwh,electric_range_km,seller_service_declaration,seller_damage_declaration,price_amount,currency,price_negotiable,trade_in_accepted,city_id,district_id,city_name,district_name,seller_type,cover_image_url,photo_count,has_video,published_at,raised_at,projected_at
  )
  SELECT l.id,vp.make_id,vp.model_id,vp.variant_id,ma.name,mo.name,va.name,vp.condition::text,vp.year,vp.mileage_km,vp.fuel_type::text,vp.transmission::text,vp.body_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.power_kw,vp.battery_capacity_kwh,vp.electric_range_km,vp.seller_service_declaration::text,vp.seller_damage_declaration::text,l.price_amount,l.currency,l.price_negotiable,l.trade_in_accepted,l.city_id,l.district_id,ci.name,di.name,l.seller_type,cm.url,coalesce(mc.n,0),false,l.published_at,l.raised_at,now()
  FROM marketplace.listings l JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id JOIN vehicle.makes ma ON ma.id=vp.make_id JOIN vehicle.models mo ON mo.id=vp.model_id LEFT JOIN vehicle.variants va ON va.id=vp.variant_id LEFT JOIN marketplace.cities ci ON ci.id=l.city_id LEFT JOIN marketplace.districts di ON di.id=l.district_id LEFT JOIN LATERAL(SELECT url FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id ORDER BY is_cover DESC,sort_order LIMIT 1) cm ON true LEFT JOIN LATERAL(SELECT count(*)::int n FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id) mc ON true WHERE l.id=p_listing_id
  ON CONFLICT(listing_id) DO UPDATE SET price_amount=EXCLUDED.price_amount,published_at=EXCLUDED.published_at,raised_at=EXCLUDED.raised_at,projected_at=EXCLUDED.projected_at;
END;$$;
REVOKE ALL ON FUNCTION marketplace.refresh_listing_search_document(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION marketplace.refresh_listing_search_document(UUID) TO service_role;

CREATE OR REPLACE FUNCTION marketplace.sync_listing_search_document_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status OR OLD.price_amount IS DISTINCT FROM NEW.price_amount OR OLD.raised_at IS DISTINCT FROM NEW.raised_at THEN
    PERFORM marketplace.refresh_listing_search_document(NEW.id);
    IF EXISTS (SELECT 1 FROM marketplace.listing_search_documents WHERE listing_id = NEW.id) THEN
      IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
        PERFORM marketplace.generate_saved_search_alerts_for_listing(NEW.id);
      END IF;
      IF TG_OP = 'UPDATE' AND NEW.price_amount < OLD.price_amount AND NEW.status = 'active' AND NEW.moderation_status = 'active' THEN
        PERFORM marketplace.generate_price_drop_alerts_for_listing(NEW.id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS listing_search_document_lifecycle_sync ON marketplace.listings;
CREATE TRIGGER listing_search_document_lifecycle_sync
  AFTER INSERT OR UPDATE OF status, moderation_status, price_amount, raised_at ON marketplace.listings
  FOR EACH ROW EXECUTE FUNCTION marketplace.sync_listing_search_document_lifecycle();

CREATE OR REPLACE FUNCTION public.raise_own_listing(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, raised_at TIMESTAMPTZ, next_raise_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, public, pg_catalog AS $$
DECLARE v_actor_id UUID := auth.uid(); v_listing marketplace.listings%ROWTYPE; v_now TIMESTAMPTZ := now();
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_listing FROM marketplace.listings WHERE id = p_listing_id AND seller_id = v_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF v_listing.status <> 'active' OR v_listing.moderation_status <> 'active' THEN RAISE EXCEPTION 'listing is not eligible to raise' USING ERRCODE = 'OT422'; END IF;
  IF v_listing.raised_at IS NOT NULL AND v_listing.raised_at + interval '7 days' > v_now THEN RAISE EXCEPTION 'listing raise cooldown active' USING ERRCODE = 'OT409'; END IF;
  UPDATE marketplace.listings SET raised_at = v_now WHERE id = p_listing_id RETURNING id, marketplace.listings.raised_at INTO listing_id, raised_at;
  PERFORM marketplace.refresh_listing_search_document(p_listing_id);
  INSERT INTO public.admin_audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor_id, 'listing.raised', 'listing', p_listing_id, jsonb_build_object('raised_at', raised_at, 'next_raise_at', raised_at + interval '7 days'));
  next_raise_at := raised_at + interval '7 days';
  RETURN NEXT;
END;$$;
REVOKE ALL ON FUNCTION public.raise_own_listing(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.raise_own_listing(UUID) TO authenticated;

CREATE OR REPLACE VIEW public.ff_home_listings WITH (security_invoker = true) AS
SELECT l.id AS listing_id,l.vehicle_profile_id,l.title,l.price_amount,l.currency::text AS currency,l.city,l.published_at,ma.name AS make_name,mo.name AS model_name,vp.year,vp.mileage_km,vp.fuel_type::text AS fuel_type,vp.transmission::text AS transmission,cover_media.url AS cover_image_url,COALESCE(media_stats.media_count,0) AS media_count,l.price_negotiable,vp.body_type,COALESCE(vp.condition,'used'::text) AS condition,l.seller_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.damage_state,vp.owner_count,l.quality_score,l.seller_display_name,COALESCE(video_stats.video_count,0) AS video_count,l.views_count,COALESCE(l.raised_at,l.published_at) AS ranking_freshness_at
FROM marketplace.listings l JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id JOIN vehicle.makes ma ON ma.id=vp.make_id JOIN vehicle.models mo ON mo.id=vp.model_id LEFT JOIN LATERAL(SELECT COALESCE(pm.card_url,pm.large_url,pm.url) AS url FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id ORDER BY (pm.id=l.cover_media_id) DESC,pm.is_cover DESC,pm.sort_order,pm.created_at LIMIT 1) cover_media ON true LEFT JOIN LATERAL(SELECT count(*)::integer AS media_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id) media_stats ON true LEFT JOIN LATERAL(SELECT count(*)::integer AS video_count FROM marketplace.listing_videos lv WHERE lv.listing_id=l.id AND lv.status='active' AND lv.visibility='public') video_stats ON true
WHERE l.status='active' AND l.moderation_status='active' AND vp.profile_status='active' AND ma.is_active AND mo.is_active;

CREATE OR REPLACE FUNCTION marketplace.search_listings_v1(p_request JSONB) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = marketplace, pg_catalog AS $$
DECLARE v_semantics marketplace.search_listings_v1_semantics; v_cursor JSONB := p_request -> 'cursor'; v_limit INTEGER := 24; v_sort TEXT := COALESCE(p_request ->> 'sort','newest'); v_cursor_listing_id UUID; v_cursor_freshness TIMESTAMPTZ; v_cursor_price BIGINT; v_cursor_year SMALLINT; v_cursor_mileage INTEGER; v_items JSONB; v_next_cursor JSONB;
BEGIN
  v_semantics := marketplace.normalize_search_listings_v1_semantics(p_request);
  IF p_request ? 'limit' AND (jsonb_typeof(p_request->'limit')<>'number' OR (p_request->>'limit') !~ '^(?:[1-9]|[1-5][0-9]|60)$') THEN RAISE EXCEPTION 'search limit is invalid' USING ERRCODE='22023'; END IF;
  IF p_request ? 'limit' THEN v_limit := (p_request->>'limit')::INTEGER; END IF;
  IF v_limit NOT BETWEEN 1 AND 60 OR v_sort NOT IN ('newest','price_asc','price_desc','year_desc','mileage_asc') THEN RAISE EXCEPTION 'search pagination or sort is invalid' USING ERRCODE='22023'; END IF;
  IF v_cursor IS NOT NULL THEN
    IF jsonb_typeof(v_cursor)<>'object' OR v_cursor->>'version' IS DISTINCT FROM 'v1' OR v_cursor->>'sort' IS DISTINCT FROM v_sort OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_cursor) key WHERE key NOT IN ('version','sort','listing_id','published_at','ranked_at','price_amount','year','mileage_km')) OR NOT COALESCE((v_cursor->>'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false) OR (v_sort='newest' AND jsonb_typeof(COALESCE(v_cursor->'ranked_at',v_cursor->'published_at')) IS DISTINCT FROM 'string') OR (v_sort IN ('price_asc','price_desc') AND (jsonb_typeof(v_cursor->'price_amount') IS DISTINCT FROM 'number' OR v_cursor->>'price_amount' !~ '^-?[0-9]+$')) OR (v_sort='year_desc' AND (jsonb_typeof(v_cursor->'year') IS DISTINCT FROM 'number' OR v_cursor->>'year' !~ '^-?[0-9]+$')) OR (v_sort='mileage_asc' AND (jsonb_typeof(v_cursor->'mileage_km') IS DISTINCT FROM 'number' OR v_cursor->>'mileage_km' !~ '^-?[0-9]+$')) THEN RAISE EXCEPTION 'search cursor is invalid' USING ERRCODE='22023'; END IF;
    v_cursor_listing_id := (v_cursor->>'listing_id')::UUID;
    BEGIN IF v_sort='newest' THEN v_cursor_freshness := COALESCE(v_cursor->>'ranked_at',v_cursor->>'published_at')::TIMESTAMPTZ; ELSIF v_sort IN ('price_asc','price_desc') THEN v_cursor_price := (v_cursor->>'price_amount')::BIGINT; ELSIF v_sort='year_desc' THEN v_cursor_year := (v_cursor->>'year')::SMALLINT; ELSE v_cursor_mileage := (v_cursor->>'mileage_km')::INTEGER; END IF; EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN RAISE EXCEPTION 'search cursor is invalid' USING ERRCODE='22023'; END;
  END IF;
  WITH filtered AS (SELECT d.* FROM marketplace.listing_search_documents d WHERE marketplace.search_listing_document_matches_v1(v_semantics,d)), page AS (SELECT d.*,row_number() OVER (ORDER BY CASE WHEN v_sort='newest' THEN COALESCE(d.raised_at,d.published_at,'epoch'::TIMESTAMPTZ) END DESC,CASE WHEN v_sort='price_asc' THEN d.price_amount END ASC,CASE WHEN v_sort='price_desc' THEN d.price_amount END DESC,CASE WHEN v_sort='year_desc' THEN COALESCE(d.year,-1::SMALLINT) END DESC,CASE WHEN v_sort='mileage_asc' THEN COALESCE(d.mileage_km,2147483647) END ASC,d.listing_id ASC) page_position FROM filtered d WHERE v_cursor_listing_id IS NULL OR (v_sort='newest' AND (COALESCE(d.raised_at,d.published_at,'epoch'::TIMESTAMPTZ),d.listing_id)<(v_cursor_freshness,v_cursor_listing_id)) OR (v_sort='price_asc' AND (d.price_amount,d.listing_id)>(v_cursor_price,v_cursor_listing_id)) OR (v_sort='price_desc' AND (d.price_amount,d.listing_id)<(v_cursor_price,v_cursor_listing_id)) OR (v_sort='year_desc' AND (COALESCE(d.year,-1::SMALLINT),d.listing_id)<(v_cursor_year,v_cursor_listing_id)) OR (v_sort='mileage_asc' AND (COALESCE(d.mileage_km,2147483647),d.listing_id)>(v_cursor_mileage,v_cursor_listing_id)) ORDER BY CASE WHEN v_sort='newest' THEN COALESCE(d.raised_at,d.published_at,'epoch'::TIMESTAMPTZ) END DESC,CASE WHEN v_sort='price_asc' THEN d.price_amount END ASC,CASE WHEN v_sort='price_desc' THEN d.price_amount END DESC,CASE WHEN v_sort='year_desc' THEN COALESCE(d.year,-1::SMALLINT) END DESC,CASE WHEN v_sort='mileage_asc' THEN COALESCE(d.mileage_km,2147483647) END ASC,d.listing_id ASC LIMIT v_limit)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('listing_id',listing_id,'make_id',make_id,'model_id',model_id,'variant_id',variant_id,'make_name',make_name,'model_name',model_name,'variant_name',variant_name,'condition',condition,'year',year,'mileage_km',mileage_km,'fuel_type',fuel_type,'transmission',transmission,'body_type',body_type,'drive_type',drive_type,'color',color,'engine_volume_l',engine_volume_l,'power_kw',power_kw,'battery_capacity_kwh',battery_capacity_kwh,'electric_range_km',electric_range_km,'seller_service_declaration',seller_service_declaration,'seller_damage_declaration',seller_damage_declaration,'price_amount',price_amount,'currency',currency,'price_negotiable',price_negotiable,'trade_in_accepted',trade_in_accepted,'city_id',city_id,'district_id',district_id,'city_name',city_name,'district_name',district_name,'seller_type',seller_type,'cover_image_url',cover_image_url,'photo_count',photo_count,'has_video',has_video,'published_at',published_at,'projected_at',projected_at) ORDER BY page_position),'[]'::JSONB),(jsonb_agg(jsonb_build_object('version','v1','sort',v_sort,'listing_id',listing_id,'ranked_at',COALESCE(raised_at,published_at,'epoch'::TIMESTAMPTZ),'price_amount',price_amount,'year',COALESCE(year,-1::SMALLINT),'mileage_km',COALESCE(mileage_km,2147483647)) ORDER BY page_position)->-1) INTO v_items,v_next_cursor FROM page;
  RETURN jsonb_build_object('version','v1','items',v_items,'next_cursor',v_next_cursor);
END;$$;
REVOKE ALL ON FUNCTION marketplace.search_listings_v1(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.search_listings_v1(JSONB) TO anon, authenticated, service_role;

COMMENT ON COLUMN marketplace.listings.raised_at IS 'Last owner-approved free raise-to-top time; never replaces published_at.';
COMMENT ON FUNCTION public.raise_own_listing(UUID) IS 'Authenticated owner-only active-listing raise; one free raise every seven days, atomically audited.';
NOTIFY pgrst, 'reload schema';
COMMIT;
