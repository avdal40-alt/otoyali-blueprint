BEGIN;

-- View aggregation is invoked only by the trusted Next.js route. Browser and
-- PostgREST roles must not be able to select their own viewer keys or invoke
-- the counter directly.
REVOKE ALL ON FUNCTION public.record_listing_view(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_listing_view(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.record_listing_view(UUID, UUID) IS
  'Trusted-server listing view increment, limited to one httpOnly browser key per active listing per hour.';

COMMIT;
