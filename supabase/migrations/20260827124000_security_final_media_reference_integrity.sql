BEGIN;

-- SFI-001: profile_media is user-writable, so a media row must never be able
-- to turn another user's Storage object into approved public listing media.

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
  -- legacy rows are not rewritten or rejected unless an authenticated user
  -- attempts to change their storage relationship.
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
        AND (storage.foldername(object.name))[1] = actor::TEXT
        AND (storage.foldername(object.name))[2] = NEW.vehicle_profile_id::TEXT
        AND (storage.foldername(object.name))[3] = NEW.id::TEXT
        AND (
          path_record.variant_name = 'storage'
          OR (storage.foldername(object.name))[4] = path_record.variant_name
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

DROP TRIGGER IF EXISTS profile_media_reference_integrity ON vehicle.profile_media;
CREATE TRIGGER profile_media_reference_integrity
  BEFORE INSERT OR UPDATE OF vehicle_profile_id, storage_path, original_path, large_path, card_path, thumb_path
  ON vehicle.profile_media
  FOR EACH ROW
  EXECUTE FUNCTION vehicle.enforce_profile_media_reference_integrity();

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
          AND p_object_name IN (
            media.storage_path,
            media.original_path,
            media.large_path,
            media.card_path,
            media.thumb_path
          )
          AND (storage.foldername(p_object_name))[1] = ownership.owner_id::TEXT
          AND (storage.foldername(p_object_name))[2] = media.vehicle_profile_id::TEXT
          AND (storage.foldername(p_object_name))[3] = media.id::TEXT
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION vehicle.is_public_profile_media_object(TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vehicle.is_public_profile_media_object(TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

DROP POLICY IF EXISTS vehicle_photos_select_authorized ON storage.objects;
CREATE POLICY vehicle_photos_select_authorized
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (
      (auth.uid() IS NOT NULL AND COALESCE(owner_id, owner::TEXT) = auth.uid()::TEXT)
      OR public.is_admin(auth.uid())
      OR vehicle.is_public_profile_media_object(bucket_id, name, owner_id, owner)
    )
  );

DROP POLICY IF EXISTS listing_media_select_authorized ON storage.objects;
CREATE POLICY listing_media_select_authorized
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'listing-media'
    AND (
      (auth.uid() IS NOT NULL AND COALESCE(owner_id, owner::TEXT) = auth.uid()::TEXT)
      OR public.is_admin(auth.uid())
      OR vehicle.is_public_profile_media_object(bucket_id, name, owner_id, owner)
    )
  );

COMMENT ON FUNCTION vehicle.enforce_profile_media_reference_integrity() IS
  'SFI-001 write gate: authenticated profile_media paths must resolve to actor-owned, profile-scoped listing-media objects.';
COMMENT ON FUNCTION vehicle.is_public_profile_media_object(TEXT, TEXT, TEXT, UUID) IS
  'SFI-001 public-read gate: independently binds a Storage object owner to current vehicle ownership and an approved active listing.';
COMMENT ON POLICY listing_media_select_authorized ON storage.objects IS
  'Private bucket read gate: owner/admin or an owner-bound, profile-scoped media object on an approved active listing.';
COMMENT ON POLICY vehicle_photos_select_authorized ON storage.objects IS
  'Legacy private bucket read gate: owner/admin or owner-bound legacy media on an approved active listing.';

NOTIFY pgrst, 'reload schema';

COMMIT;
