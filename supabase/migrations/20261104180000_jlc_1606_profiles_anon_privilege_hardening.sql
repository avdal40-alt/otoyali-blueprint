BEGIN;

-- Profiles contain private account and contact data. RLS is defense in depth,
-- but anonymous callers must have no table privilege at all; public seller
-- information is deliberately exposed only through dedicated projections.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
