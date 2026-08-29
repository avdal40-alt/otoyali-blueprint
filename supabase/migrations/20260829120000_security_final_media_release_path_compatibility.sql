BEGIN;

-- PROD-04C: SECURITY-FINAL-R1 originally parsed only the legacy listing-media
-- layout. PROD-04A adds the authoritative release segment as folder two. Keep
-- both layouts without treating that segment as an ownership boundary.
CREATE OR REPLACE FUNCTION vehicle.profile_media_path_matches(
  p_object_name TEXT,
  p_owner_id UUID,
  p_vehicle_profile_id UUID,
  p_media_id UUID,
  p_variant_name TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH parsed AS (
    SELECT
      storage.foldername(p_object_name) AS folders,
      state.storage_release_segment
    FROM public.release_compatibility_state AS state
    WHERE state.singleton
  ), normalized AS (
    SELECT
      folders,
      CASE
        WHEN cardinality(folders) = 4 THEN 0
        WHEN cardinality(folders) = 5
          AND folders[2] = storage_release_segment THEN 1
        ELSE NULL
      END AS release_offset
    FROM parsed
  )
  SELECT COALESCE(
    release_offset IS NOT NULL
    AND folders[1] = p_owner_id::TEXT
    AND folders[2 + release_offset] = p_vehicle_profile_id::TEXT
    AND folders[3 + release_offset] = p_media_id::TEXT
    AND (
      (
        p_variant_name = 'storage'
        AND folders[4 + release_offset] IN ('original', 'large', 'card', 'thumb')
      )
      OR folders[4 + release_offset] = p_variant_name
    ),
    FALSE
  )
  FROM normalized;
$$;

REVOKE ALL ON FUNCTION vehicle.profile_media_path_matches(TEXT, UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION vehicle.enforce_profile_media_reference_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor UUID := auth.uid();
  path_record RECORD;
BEGIN
  -- Trusted backend maintenance remains available to service_role. Existing
  -- rows are not rewritten or rejected unless an authenticated user changes
  -- their storage relationship.
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF actor IS NULL THEN
    RAISE EXCEPTION 'authenticated media mutation requires a user identity'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.vehicle_profile_id IS NOT DISTINCT FROM OLD.vehicle_profile_id
     AND NEW.storage_path IS NOT DISTINCT FROM OLD.storage_path
     AND NEW.original_path IS NOT DISTINCT FROM OLD.original_path
     AND NEW.large_path IS NOT DISTINCT FROM OLD.large_path
     AND NEW.card_path IS NOT DISTINCT FROM OLD.card_path
     AND NEW.thumb_path IS NOT DISTINCT FROM OLD.thumb_path THEN
    RETURN NEW;
  END IF;

  FOR path_record IN
    SELECT *
    FROM (VALUES
      ('storage', NEW.storage_path),
      ('original', NEW.original_path),
      ('large', NEW.large_path),
      ('card', NEW.card_path),
      ('thumb', NEW.thumb_path)
    ) AS paths(variant_name, object_path)
    WHERE object_path IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects AS object
      WHERE object.bucket_id = 'listing-media'
        AND object.name = path_record.object_path
        AND COALESCE(object.owner_id, object.owner::TEXT) = actor::TEXT
        AND vehicle.profile_media_path_matches(
          object.name,
          actor,
          NEW.vehicle_profile_id,
          NEW.id,
          path_record.variant_name
        )
    ) THEN
      RAISE EXCEPTION 'media path % is not an authorized object for this media record', path_record.object_path
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION vehicle.enforce_profile_media_reference_integrity() FROM PUBLIC;

CREATE OR REPLACE FUNCTION vehicle.is_public_profile_media_object(
  p_bucket_id TEXT,
  p_object_name TEXT,
  p_object_owner_id TEXT,
  p_legacy_object_owner UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    p_bucket_id IN ('vehicle-photos', 'listing-media')
    AND p_object_name IS NOT NULL
    AND COALESCE(p_object_owner_id, p_legacy_object_owner::TEXT) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM vehicle.profile_media AS media
      INNER JOIN vehicle.profile_ownership AS ownership
        ON ownership.vehicle_profile_id = media.vehicle_profile_id
       AND ownership.is_current = TRUE
       AND ownership.ended_at IS NULL
       AND ownership.owner_id::TEXT = COALESCE(p_object_owner_id, p_legacy_object_owner::TEXT)
      INNER JOIN marketplace.listings AS listing
        ON listing.vehicle_profile_id = media.vehicle_profile_id
       AND listing.seller_id = ownership.owner_id
       AND listing.status = 'active'
       AND listing.moderation_status = 'active'
      WHERE (
        (
          p_bucket_id = 'vehicle-photos'
          AND media.storage_path = p_object_name
          AND (storage.foldername(p_object_name))[1] = ownership.owner_id::TEXT
        )
        OR
        (
          p_bucket_id = 'listing-media'
          AND (
            (
              media.storage_path = p_object_name
              AND vehicle.profile_media_path_matches(
                p_object_name,
                ownership.owner_id,
                media.vehicle_profile_id,
                media.id,
                'storage'
              )
            )
            OR (
              media.original_path = p_object_name
              AND vehicle.profile_media_path_matches(
                p_object_name,
                ownership.owner_id,
                media.vehicle_profile_id,
                media.id,
                'original'
              )
            )
            OR (
              media.large_path = p_object_name
              AND vehicle.profile_media_path_matches(
                p_object_name,
                ownership.owner_id,
                media.vehicle_profile_id,
                media.id,
                'large'
              )
            )
            OR (
              media.card_path = p_object_name
              AND vehicle.profile_media_path_matches(
                p_object_name,
                ownership.owner_id,
                media.vehicle_profile_id,
                media.id,
                'card'
              )
            )
            OR (
              media.thumb_path = p_object_name
              AND vehicle.profile_media_path_matches(
                p_object_name,
                ownership.owner_id,
                media.vehicle_profile_id,
                media.id,
                'thumb'
              )
            )
          )
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION vehicle.is_public_profile_media_object(TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vehicle.is_public_profile_media_object(TEXT, TEXT, TEXT, UUID)
  TO anon, authenticated;

COMMENT ON FUNCTION vehicle.profile_media_path_matches(TEXT, UUID, UUID, UUID, TEXT) IS
  'PROD-04C strict path parser for legacy and the authoritative release-prefixed listing-media layouts; never an ownership boundary.';
COMMENT ON FUNCTION vehicle.enforce_profile_media_reference_integrity() IS
  'SFI-001 write gate: authenticated profile_media paths must resolve to actor-owned, profile-scoped listing-media objects in a canonical legacy or release-prefixed layout.';
COMMENT ON FUNCTION vehicle.is_public_profile_media_object(TEXT, TEXT, TEXT, UUID) IS
  'SFI-001 public-read gate: independently binds a canonical Storage object path and owner to current vehicle ownership and an approved active listing.';

NOTIFY pgrst, 'reload schema';

COMMIT;
