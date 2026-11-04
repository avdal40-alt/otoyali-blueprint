BEGIN;

-- JLC-1604 is intentionally an interest-only boundary.  It does not model an
-- insurer, a quote, a policy, payment, or a customer-funds workflow.  The
-- only persisted value is an authenticated account's consented topic choice.
CREATE SCHEMA IF NOT EXISTS insurance_marketplace;
GRANT USAGE ON SCHEMA insurance_marketplace TO authenticated, service_role;

CREATE TABLE insurance_marketplace.interest_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_type TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT insurance_interest_requests_type_check CHECK (
    interest_type IN ('mandatory', 'comprehensive', 'renewal', 'claims_information', 'general')
  ),
  CONSTRAINT insurance_interest_requests_requester_type_unique UNIQUE (requester_id, interest_type)
);

ALTER TABLE insurance_marketplace.interest_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE insurance_marketplace.interest_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE insurance_marketplace.interest_requests TO service_role;

-- A SECURITY DEFINER facade is the sole browser-facing write path.  The
-- identity comes only from auth.uid(); the caller cannot select another
-- account or submit an unconsented request.  The unique key makes retries
-- idempotent instead of producing an unbounded stream of duplicate leads.
CREATE OR REPLACE FUNCTION public.submit_own_insurance_interest(
  p_interest_type TEXT,
  p_consent BOOLEAN
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, insurance_marketplace, pg_catalog
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_interest_type TEXT := lower(btrim(COALESCE(p_interest_type, '')));
  v_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF p_consent IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'consent is required' USING ERRCODE = 'OT422';
  END IF;

  IF v_interest_type NOT IN ('mandatory', 'comprehensive', 'renewal', 'claims_information', 'general') THEN
    RAISE EXCEPTION 'invalid insurance interest type' USING ERRCODE = 'OT422';
  END IF;

  INSERT INTO insurance_marketplace.interest_requests (requester_id, interest_type)
  VALUES (v_user, v_interest_type)
  ON CONFLICT (requester_id, interest_type) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM insurance_marketplace.interest_requests
    WHERE requester_id = v_user AND interest_type = v_interest_type;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_own_insurance_interest(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_own_insurance_interest(TEXT, BOOLEAN) TO authenticated;

COMMENT ON TABLE insurance_marketplace.interest_requests IS
  'Authenticated, consented insurance-interest requests only; no insurer, quote, policy, payment, or customer-funds data.';

NOTIFY pgrst, 'reload schema';
COMMIT;
