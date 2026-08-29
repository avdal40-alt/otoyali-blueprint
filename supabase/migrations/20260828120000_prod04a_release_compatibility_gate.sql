BEGIN;

-- PROD-04A is intentionally idempotent. Operations install this file once as
-- a pre-migration bootstrap, before any incompatible SECURITY-FINAL migration,
-- and the normal migration chain may safely encounter it again afterward.
CREATE TABLE IF NOT EXISTS public.release_compatibility_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  mode TEXT NOT NULL CHECK (mode IN ('normal', 'maintenance', 'enforce_minimum')),
  minimum_release BIGINT NOT NULL CHECK (minimum_release > 0),
  storage_release_segment TEXT NOT NULL CHECK (storage_release_segment ~ '^prod04a-[0-9]+$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.release_compatibility_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.release_compatibility_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.release_compatibility_state TO service_role;

INSERT INTO public.release_compatibility_state (
  singleton,
  mode,
  minimum_release,
  storage_release_segment
)
VALUES (TRUE, 'normal', 2026082801, 'prod04a-2026082801')
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.release_request_marker()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  raw_headers TEXT;
  parsed_headers JSONB;
BEGIN
  raw_headers := current_setting('request.headers', TRUE);
  IF raw_headers IS NULL OR btrim(raw_headers) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    parsed_headers := raw_headers::JSONB;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;

  RETURN parsed_headers ->> 'x-yolmod-release';
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_gate_allows_request()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  gate public.release_compatibility_state%ROWTYPE;
  marker TEXT;
  jwt_role TEXT := COALESCE(auth.role(), 'anon');
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO STRICT gate
  FROM public.release_compatibility_state
  WHERE singleton;

  IF gate.mode = 'normal' THEN
    RETURN TRUE;
  END IF;

  IF gate.mode = 'maintenance' THEN
    RETURN FALSE;
  END IF;

  marker := public.release_request_marker();
  RETURN marker IS NOT NULL
    AND marker ~ '^[0-9]{10}$'
    AND marker::BIGINT >= gate.minimum_release;
EXCEPTION
  WHEN no_data_found OR numeric_value_out_of_range THEN
    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_release_compatibility()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
BEGIN
  IF NOT public.release_gate_allows_request() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'YOLMOD_RELEASE_REQUIRED';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_gate_allows_storage_write(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, storage
AS $function$
DECLARE
  gate public.release_compatibility_state%ROWTYPE;
  jwt_role TEXT := COALESCE(auth.role(), 'anon');
BEGIN
  IF jwt_role = 'service_role' THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO STRICT gate
  FROM public.release_compatibility_state
  WHERE singleton;

  IF gate.mode = 'normal' THEN
    RETURN TRUE;
  END IF;

  IF gate.mode = 'maintenance' THEN
    RETURN FALSE;
  END IF;

  RETURN split_part(object_name, '/', 2) = gate.storage_release_segment;
EXCEPTION WHEN no_data_found THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_release_compatibility_mode(next_mode TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, storage
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'trusted release operation required';
  END IF;

  IF next_mode NOT IN ('maintenance', 'enforce_minimum') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid release compatibility mode';
  END IF;

  UPDATE public.release_compatibility_state
  SET mode = next_mode,
      updated_at = now()
  WHERE singleton;

  UPDATE storage.buckets
  SET public = FALSE
  WHERE id IN ('vehicle-photos', 'listing-media', 'listing-videos');
END;
$function$;

CREATE OR REPLACE FUNCTION public.abort_release_maintenance_before_migration()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, storage
AS $function$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'trusted release operation required';
  END IF;

  UPDATE public.release_compatibility_state
  SET mode = 'normal',
      updated_at = now()
  WHERE singleton;

  UPDATE storage.buckets
  SET public = TRUE
  WHERE id IN ('vehicle-photos', 'listing-media', 'listing-videos');
END;
$function$;

REVOKE ALL ON FUNCTION public.release_request_marker() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_gate_allows_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_release_compatibility() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_gate_allows_storage_write(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_release_compatibility_mode(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.abort_release_maintenance_before_migration() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.release_request_marker() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_gate_allows_request() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enforce_release_compatibility() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_gate_allows_storage_write(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_release_compatibility_mode(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.abort_release_maintenance_before_migration() TO service_role;

DROP POLICY IF EXISTS vehicle_photos_insert_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_insert_own_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS vehicle_photos_update_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_update_own_folder ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS vehicle_photos_delete_own_folder ON storage.objects;
CREATE POLICY vehicle_photos_delete_own_folder ON storage.objects
  FOR DELETE TO authenticated
  USING (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'vehicle-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_media_insert_own_folder ON storage.objects;
CREATE POLICY listing_media_insert_own_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_media_update_own_folder ON storage.objects;
CREATE POLICY listing_media_update_own_folder ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_media_delete_own_folder ON storage.objects;
CREATE POLICY listing_media_delete_own_folder ON storage.objects
  FOR DELETE TO authenticated
  USING (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_videos_storage_insert_own_folder ON storage.objects;
CREATE POLICY listing_videos_storage_insert_own_folder ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_videos_storage_update_own_folder ON storage.objects;
CREATE POLICY listing_videos_storage_update_own_folder ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS listing_videos_storage_delete_own_folder ON storage.objects;
CREATE POLICY listing_videos_storage_delete_own_folder ON storage.objects
  FOR DELETE TO authenticated
  USING (
    public.release_gate_allows_storage_write(name)
    AND bucket_id = 'listing-videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.enforce_release_compatibility';

COMMENT ON TABLE public.release_compatibility_state IS
  'PROD-04A singleton release gate. Mutated only by trusted cutover operations.';
COMMENT ON FUNCTION public.enforce_release_compatibility() IS
  'PostgREST pre-request boundary: maintenance denies ordinary API traffic; enforce_minimum requires the current release marker.';
COMMENT ON FUNCTION public.release_gate_allows_storage_write(TEXT) IS
  'Storage write boundary independent of browser-header propagation; post-cutover paths require the release segment.';

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

COMMIT;
