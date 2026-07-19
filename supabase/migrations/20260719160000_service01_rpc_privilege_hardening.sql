-- Remove direct Supabase/PostgreSQL role ACLs from SERVICE RPCs.
-- Both public SERVICE facades are authenticated-only application entry points.

REVOKE ALL ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) FROM service_role;
REVOKE ALL ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_service_provider_application(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) FROM service_role;
REVOKE ALL ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.review_service_provider_application(UUID, TEXT, TEXT) TO authenticated;
