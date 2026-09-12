BEGIN;
CREATE FUNCTION marketplace.refresh_listing_search_document(p_listing_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, vehicle, pg_catalog AS $$
BEGIN
 IF NOT marketplace.is_listing_search_eligible(p_listing_id) THEN DELETE FROM marketplace.listing_search_documents WHERE listing_id=p_listing_id; RETURN; END IF;
 INSERT INTO marketplace.listing_search_documents (listing_id,make_id,model_id,variant_id,make_name,model_name,variant_name,condition,year,mileage_km,fuel_type,transmission,body_type,drive_type,color,engine_volume_l,power_kw,battery_capacity_kwh,electric_range_km,seller_service_declaration,seller_damage_declaration,price_amount,currency,price_negotiable,trade_in_accepted,city_id,district_id,city_name,district_name,seller_type,cover_image_url,photo_count,has_video,published_at,projected_at)
 SELECT l.id,vp.make_id,vp.model_id,vp.variant_id,ma.name,mo.name,va.name,vp.condition::text,vp.year,vp.mileage_km,vp.fuel_type::text,vp.transmission::text,vp.body_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.power_kw,vp.battery_capacity_kwh,vp.electric_range_km,vp.seller_service_declaration::text,vp.seller_damage_declaration::text,l.price_amount,l.currency,l.price_negotiable,l.trade_in_accepted,l.city_id,l.district_id,ci.name,di.name,l.seller_type,cm.url,coalesce(mc.n,0),false,l.published_at,now()
 FROM marketplace.listings l JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id JOIN vehicle.makes ma ON ma.id=vp.make_id JOIN vehicle.models mo ON mo.id=vp.model_id LEFT JOIN vehicle.variants va ON va.id=vp.variant_id LEFT JOIN marketplace.cities ci ON ci.id=l.city_id LEFT JOIN marketplace.districts di ON di.id=l.district_id LEFT JOIN LATERAL(SELECT url FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id ORDER BY is_cover DESC,sort_order LIMIT 1) cm ON true LEFT JOIN LATERAL(SELECT count(*)::int n FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id) mc ON true WHERE l.id=p_listing_id
 ON CONFLICT(listing_id) DO UPDATE SET price_amount=EXCLUDED.price_amount,projected_at=EXCLUDED.projected_at;
END;$$;
REVOKE ALL ON FUNCTION marketplace.refresh_listing_search_document(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION marketplace.refresh_listing_search_document(UUID) TO service_role;
COMMIT;
