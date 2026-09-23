BEGIN;

-- Storage evaluates policy predicates as the requesting role. This grant exposes
-- only a boolean authorization result; the private intent table remains revoked.
GRANT EXECUTE ON FUNCTION marketplace.can_insert_own_listing_video_from_active_intent(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
