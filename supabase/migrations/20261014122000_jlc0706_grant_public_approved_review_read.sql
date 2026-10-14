-- JLC-0706: align table privilege with the pre-existing approved-only public RLS policy.
BEGIN;

GRANT SELECT ON TABLE vehicle.owner_reviews TO anon;

COMMENT ON TABLE vehicle.owner_reviews IS 'Owner-authored vehicle experience reviews. Anonymous users may read only approved rows through RLS; author, report, and moderation metadata remain private.';
NOTIFY pgrst, 'reload schema';
COMMIT;
