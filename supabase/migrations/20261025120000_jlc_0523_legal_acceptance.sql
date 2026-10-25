-- Auditable Jolmod Kazakhstan registration acceptance. Additive; no existing user data is changed.
CREATE TABLE public.legal_document_acceptances (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL CHECK (document_key IN ('terms', 'privacy', 'personal_data_consent')),
  document_version TEXT NOT NULL CHECK (char_length(trim(document_version)) BETWEEN 1 AND 40),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, document_key, document_version)
);

COMMENT ON TABLE public.legal_document_acceptances IS
  'Append-only, user-owned evidence of required Jolmod legal document acceptance.';

ALTER TABLE public.legal_document_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_document_acceptances_select_own
  ON public.legal_document_acceptances FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY legal_document_acceptances_insert_own
  ON public.legal_document_acceptances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY legal_document_acceptances_service_role_all
  ON public.legal_document_acceptances FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE UPDATE, DELETE ON public.legal_document_acceptances FROM authenticated;
