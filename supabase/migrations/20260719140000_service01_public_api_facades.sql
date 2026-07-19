-- SERVICE-01 PostgREST compatibility facades.
-- service_marketplace remains a private domain schema; public clients use these
-- narrow RPCs instead of exposing the complete schema through api.schemas.

CREATE OR REPLACE FUNCTION public.submit_service_provider_application(
  p_business_name TEXT,
  p_contact_person_name TEXT,
  p_contact_phone TEXT,
  p_city TEXT,
  p_category_keys TEXT[],
  p_supported_verticals TEXT[],
  p_district TEXT DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_consent_accuracy BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  application_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_business_name TEXT := regexp_replace(btrim(COALESCE(p_business_name, '')), '\s+', ' ', 'g');
  v_contact_person_name TEXT := regexp_replace(btrim(COALESCE(p_contact_person_name, '')), '\s+', ' ', 'g');
  v_contact_phone TEXT := regexp_replace(btrim(COALESCE(p_contact_phone, '')), '\s+', ' ', 'g');
  v_contact_phone_compact TEXT := regexp_replace(COALESCE(p_contact_phone, ''), '[\s().-]+', '', 'g');
  v_city TEXT := regexp_replace(btrim(COALESCE(p_city, '')), '\s+', ' ', 'g');
  v_district TEXT := NULLIF(regexp_replace(btrim(COALESCE(p_district, '')), '\s+', ' ', 'g'), '');
  v_website_url TEXT := NULLIF(btrim(COALESCE(p_website_url, '')), '');
  v_notes TEXT := NULLIF(regexp_replace(btrim(COALESCE(p_notes, '')), '\s+', ' ', 'g'), '');
  v_category_keys TEXT[];
  v_supported_verticals TEXT[];
  v_application_id UUID;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
  v_invalid_category TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required to submit a service provider application' USING ERRCODE = '42501';
  END IF;

  v_category_keys := ARRAY(
    SELECT DISTINCT lower(btrim(item))
    FROM unnest(COALESCE(p_category_keys, ARRAY[]::TEXT[])) AS item
    WHERE btrim(item) <> ''
    ORDER BY lower(btrim(item))
  );

  v_supported_verticals := ARRAY(
    SELECT DISTINCT lower(btrim(item))
    FROM unnest(COALESCE(p_supported_verticals, ARRAY[]::TEXT[])) AS item
    WHERE btrim(item) <> ''
    ORDER BY lower(btrim(item))
  );

  IF char_length(v_business_name) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'business_name must be between 2 and 160 characters' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_contact_person_name) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'contact_person_name must be between 2 and 120 characters' USING ERRCODE = '22023';
  END IF;

  IF v_contact_phone_compact !~ '^\+?[0-9]{8,15}$' OR char_length(v_contact_phone) > 32 THEN
    RAISE EXCEPTION 'contact_phone is invalid' USING ERRCODE = '22023';
  END IF;

  IF char_length(v_city) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'city must be between 2 and 80 characters' USING ERRCODE = '22023';
  END IF;

  IF v_district IS NOT NULL AND char_length(v_district) > 80 THEN
    RAISE EXCEPTION 'district is too long' USING ERRCODE = '22023';
  END IF;

  IF cardinality(v_category_keys) = 0 THEN
    RAISE EXCEPTION 'at least one service category is required' USING ERRCODE = '22023';
  END IF;

  IF cardinality(v_supported_verticals) = 0 THEN
    RAISE EXCEPTION 'at least one supported vertical is required' USING ERRCODE = '22023';
  END IF;

  IF NOT v_supported_verticals <@ ARRAY['cars', 'commercial', 'marine', 'parts', 'services', 'insurance', 'motorcycles', 'machinery', 'mobility']::TEXT[] THEN
    RAISE EXCEPTION 'supported_verticals contains an unsupported value' USING ERRCODE = '23514';
  END IF;

  SELECT item
  INTO v_invalid_category
  FROM unnest(v_category_keys) AS item
  WHERE NOT EXISTS (
    SELECT 1
    FROM service_marketplace.categories category
    WHERE category.category_key = item
      AND category.is_active = true
  )
  LIMIT 1;

  IF v_invalid_category IS NOT NULL THEN
    RAISE EXCEPTION 'invalid service category: %', v_invalid_category USING ERRCODE = '23514';
  END IF;

  IF v_website_url IS NOT NULL AND (char_length(v_website_url) > 240 OR v_website_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/.*)?$') THEN
    RAISE EXCEPTION 'website_url must be an HTTPS URL' USING ERRCODE = '22023';
  END IF;

  IF v_notes IS NOT NULL AND char_length(v_notes) > 1600 THEN
    RAISE EXCEPTION 'notes is too long' USING ERRCODE = '22023';
  END IF;

  IF p_consent_accuracy IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'consent_accuracy is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO service_marketplace.provider_applications AS application (
    submitter_id,
    status,
    business_name,
    contact_person_name,
    contact_phone,
    city,
    district,
    category_keys,
    supported_verticals,
    website_url,
    notes,
    consent_accuracy
  ) VALUES (
    v_user_id,
    'pending_review',
    v_business_name,
    v_contact_person_name,
    v_contact_phone,
    v_city,
    v_district,
    v_category_keys,
    v_supported_verticals,
    v_website_url,
    v_notes,
    true
  )
  RETURNING application.id, application.status, application.created_at
  INTO v_application_id, v_status, v_created_at;

  RETURN QUERY SELECT v_application_id, v_status, v_created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_service_provider_application(
  p_application_id UUID,
  p_decision TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  application_id UUID,
  status TEXT,
  reviewed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_review_note TEXT := NULLIF(regexp_replace(btrim(COALESCE(p_review_note, '')), '\s+', ' ', 'g'), '');
  v_previous_status TEXT;
  v_application_id UUID;
  v_status TEXT;
  v_reviewed_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required to review a service provider application' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'admin authorization required to review a service provider application' USING ERRCODE = '42501';
  END IF;

  IF p_application_id IS NULL THEN
    RAISE EXCEPTION 'application_id is required' USING ERRCODE = '22023';
  END IF;

  IF v_decision NOT IN ('reviewing', 'approved', 'rejected', 'archived') THEN
    RAISE EXCEPTION 'unsupported service provider application decision: %', v_decision USING ERRCODE = '23514';
  END IF;

  IF v_decision IN ('rejected', 'archived') AND v_review_note IS NULL THEN
    RAISE EXCEPTION 'review_note is required for rejected or archived applications' USING ERRCODE = '22023';
  END IF;

  IF v_review_note IS NOT NULL AND char_length(v_review_note) > 1600 THEN
    RAISE EXCEPTION 'review_note is too long' USING ERRCODE = '22023';
  END IF;

  SELECT application.status
  INTO v_previous_status
  FROM service_marketplace.provider_applications application
  WHERE application.id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service provider application not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE service_marketplace.provider_applications application
  SET
    status = v_decision,
    moderation_note = v_review_note,
    reviewed_by = v_user_id,
    reviewed_at = now()
  WHERE application.id = p_application_id
  RETURNING
    application.id,
    application.status,
    application.reviewed_at
  INTO
    v_application_id,
    v_status,
    v_reviewed_at;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    v_decision || '_service_application',
    'service_provider_application',
    p_application_id,
    jsonb_build_object(
      'note', v_review_note,
      'previous_status', v_previous_status
    )
  );

  RETURN QUERY SELECT v_application_id, v_status, v_reviewed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) IS
  'PostgREST-safe authenticated facade for submitting private service provider applications without exposing service_marketplace.';
COMMENT ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) IS
  'PostgREST-safe admin facade for reviewing service provider applications. Verifies public.is_admin(auth.uid()) and writes the audit log.';

NOTIFY pgrst, 'reload schema';
