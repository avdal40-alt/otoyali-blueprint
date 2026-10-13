BEGIN;

-- JLC-0907: credentials are dealer scoped and only their SHA-256 digest is
-- retained.  The raw value is returned once from the issuing RPC.
ALTER TYPE marketplace.dealer_import_source ADD VALUE IF NOT EXISTS 'csv';
ALTER TYPE marketplace.dealer_import_source ADD VALUE IF NOT EXISTS 'https_json';

CREATE TABLE marketplace.dealer_feed_api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  token_hash CHAR(64) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['inventory:write']::TEXT[],
  label TEXT NOT NULL DEFAULT 'Inventory API token',
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  window_started_at TIMESTAMPTZ,
  window_request_count INTEGER NOT NULL DEFAULT 0 CHECK (window_request_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_feed_api_tokens_label_chk CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  CONSTRAINT dealer_feed_api_tokens_scopes_chk CHECK (scopes <@ ARRAY['inventory:write']::TEXT[] AND cardinality(scopes) > 0)
);
CREATE INDEX dealer_feed_api_tokens_active_dealer_idx ON marketplace.dealer_feed_api_tokens(dealer_id) WHERE revoked_at IS NULL;
ALTER TABLE marketplace.dealer_feed_api_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE marketplace.dealer_feed_api_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.dealer_feed_api_tokens TO service_role;

CREATE OR REPLACE FUNCTION marketplace.create_own_dealer_feed_api_token(p_label TEXT DEFAULT 'Inventory API token')
RETURNS TABLE (token_id UUID, token TEXT, label TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, extensions, pg_catalog AS $$
DECLARE v_dealer_id UUID := auth.uid(); v_token TEXT := encode(gen_random_bytes(32), 'hex');
BEGIN
  IF v_dealer_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  IF NOT public.is_verified_dealer(v_dealer_id) THEN RAISE EXCEPTION 'verified dealer required' USING ERRCODE='OT403'; END IF;
  INSERT INTO marketplace.dealer_feed_api_tokens(dealer_id,token_hash,label)
  VALUES (v_dealer_id,encode(digest(v_token,'sha256'),'hex'),btrim(COALESCE(p_label,'')))
  RETURNING id, dealer_feed_api_tokens.label INTO token_id, label;
  token := v_token;
  RETURN NEXT;
END; $$;

CREATE OR REPLACE FUNCTION marketplace.revoke_own_dealer_feed_api_token(p_token_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  UPDATE marketplace.dealer_feed_api_tokens SET revoked_at=now()
  WHERE id=p_token_id AND dealer_id=auth.uid() AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'active token not found' USING ERRCODE='OT404'; END IF;
END; $$;

-- This public RPC intentionally accepts a credential instead of a Supabase JWT:
-- it is only invoked by the HTTPS dealer-feed route. It grants no table access,
-- checks verification on every request, is rate limited (60/min/token), and
-- delegates listing writes to the existing dealer-scoped canonical importer.
CREATE OR REPLACE FUNCTION public.apply_dealer_feed_api_import(p_token TEXT, p_source marketplace.dealer_import_source, p_source_sha256 TEXT, p_rows JSONB)
RETURNS TABLE (row_number INTEGER, status marketplace.dealer_import_row_status, external_listing_id TEXT, error_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, extensions, pg_catalog AS $$
DECLARE v_token marketplace.dealer_feed_api_tokens%ROWTYPE;
BEGIN
  IF p_source <> 'https_json' OR p_token !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid dealer feed request' USING ERRCODE='OT422'; END IF;
  SELECT * INTO v_token FROM marketplace.dealer_feed_api_tokens
  WHERE token_hash=encode(digest(p_token,'sha256'),'hex') AND revoked_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.is_verified_dealer(v_token.dealer_id) OR NOT ('inventory:write'=ANY(v_token.scopes)) THEN RAISE EXCEPTION 'invalid dealer API token' USING ERRCODE='OT401'; END IF;
  IF v_token.window_started_at IS NOT NULL AND v_token.window_started_at > now()-interval '1 minute' AND v_token.window_request_count >= 60 THEN RAISE EXCEPTION 'dealer API rate limit exceeded' USING ERRCODE='OT429'; END IF;
  UPDATE marketplace.dealer_feed_api_tokens SET last_used_at=now(), window_started_at=CASE WHEN window_started_at IS NULL OR window_started_at <= now()-interval '1 minute' THEN now() ELSE window_started_at END, window_request_count=CASE WHEN window_started_at IS NULL OR window_started_at <= now()-interval '1 minute' THEN 1 ELSE window_request_count+1 END WHERE id=v_token.id;
  PERFORM set_config('request.jwt.claim.sub', v_token.dealer_id::text, true);
  RETURN QUERY SELECT * FROM public.apply_own_verified_galeri_excel_import(p_source_sha256,p_rows);
END; $$;

REVOKE ALL ON FUNCTION marketplace.create_own_dealer_feed_api_token(TEXT), marketplace.revoke_own_dealer_feed_api_token(UUID), public.apply_dealer_feed_api_import(TEXT,marketplace.dealer_import_source,TEXT,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.create_own_dealer_feed_api_token(TEXT), marketplace.revoke_own_dealer_feed_api_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_dealer_feed_api_import(TEXT,marketplace.dealer_import_source,TEXT,JSONB) TO anon;
NOTIFY pgrst, 'reload schema';
COMMIT;
