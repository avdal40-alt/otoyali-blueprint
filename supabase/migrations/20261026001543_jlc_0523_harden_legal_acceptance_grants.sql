-- The registration-evidence table is append-only for application roles.  Some
-- environments have broad table default privileges, so make the intended
-- privilege boundary explicit in addition to the RLS policies created by the
-- original migration.
REVOKE ALL ON TABLE public.legal_document_acceptances FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.legal_document_acceptances TO authenticated;
GRANT ALL ON TABLE public.legal_document_acceptances TO service_role;

NOTIFY pgrst, 'reload schema';
