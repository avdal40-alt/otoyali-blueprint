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
        AND (
          (
            COALESCE(object.owner_id, object.owner::TEXT) = actor::TEXT
            AND vehicle.profile_media_path_matches(
              object.name,
              actor,
              NEW.vehicle_profile_id,
              NEW.id,
              path_record.variant_name
            )
          )
          OR (
            object.owner_id IS NULL
            AND object.owner IS NULL
            AND object.name ~ (
              '^public/' || NEW.vehicle_profile_id::TEXT || '/' || NEW.id::TEXT || '/'
              || CASE path_record.variant_name
                   WHEN 'storage' THEN 'large'
                   WHEN 'original' THEN 'master'
                   ELSE path_record.variant_name
                 END
              || '[.](webp|jpg|jpeg|png)$'
            )
          )
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
