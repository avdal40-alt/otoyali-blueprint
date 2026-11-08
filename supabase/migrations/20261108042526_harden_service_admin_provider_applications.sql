-- The admin application queue contains applicant contact and moderation data.
-- Keep the legacy view non-privileged and unavailable to client roles; use the
-- narrowly authorized RPC below for the browser admin surface instead.
ALTER VIEW public.service_admin_provider_applications
  SET (security_invoker = true);

REVOKE SELECT ON TABLE public.service_admin_provider_applications
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_service_admin_provider_applications(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  application_id uuid,
  submitter_id uuid,
  status text,
  business_name text,
  contact_person_name text,
  contact_phone text,
  city text,
  district text,
  category_keys text[],
  supported_verticals text[],
  website_url text,
  notes text,
  consent_accuracy boolean,
  moderation_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, service_marketplace, pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    application.id,
    application.submitter_id,
    application.status,
    application.business_name,
    application.contact_person_name,
    application.contact_phone,
    application.city,
    application.district,
    application.category_keys,
    application.supported_verticals,
    application.website_url,
    application.notes,
    application.consent_accuracy,
    application.moderation_note,
    application.reviewed_by,
    application.reviewed_at,
    application.created_at,
    application.updated_at
  FROM service_marketplace.provider_applications AS application
  WHERE p_status IS NULL OR application.status = p_status
  ORDER BY application.created_at DESC
  LIMIT greatest(least(coalesce(p_limit, 50), 50), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.list_service_admin_provider_applications(text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_service_admin_provider_applications(text, integer)
  TO authenticated;
