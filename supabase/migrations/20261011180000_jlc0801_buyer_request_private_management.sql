BEGIN;

-- Buyer requests intentionally keep their criteria in the same canonical
-- Search v1 shape used by saved searches. This lets matching reuse the search
-- domain without introducing a country-specific duplicate vehicle schema.
CREATE TABLE marketplace.buyer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  criteria_version TEXT NOT NULL DEFAULT 'v1' CHECK (criteria_version = 'v1'),
  search_request JSONB NOT NULL CHECK (jsonb_typeof(search_request) = 'object'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT buyer_requests_title_not_empty_chk CHECK (title IS NULL OR char_length(btrim(title)) > 0)
);

CREATE INDEX buyer_requests_owner_status_updated_idx
  ON marketplace.buyer_requests (user_id, status, updated_at DESC, id DESC);

CREATE TRIGGER buyer_requests_set_updated_at
  BEFORE UPDATE ON marketplace.buyer_requests
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

ALTER TABLE marketplace.buyer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY buyer_requests_owner_only ON marketplace.buyer_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Private requests have no public projection. Direct table access is denied;
-- owner-derived RPCs below are the only application boundary.
REVOKE ALL ON TABLE marketplace.buyer_requests FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE marketplace.buyer_requests TO service_role;

CREATE FUNCTION marketplace.create_own_buyer_request(p_request JSONB, p_title TEXT DEFAULT NULL)
RETURNS TABLE (buyer_request_id UUID, title TEXT, criteria_version TEXT, search_request JSONB, status TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_request JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  IF jsonb_typeof(p_request) IS DISTINCT FROM 'object'
     OR (p_request ? 'cursor' AND p_request -> 'cursor' <> 'null'::JSONB) THEN
    RAISE EXCEPTION 'buyer request criteria is invalid' USING ERRCODE = 'OT422';
  END IF;
  v_request := p_request - 'cursor';
  BEGIN PERFORM marketplace.search_listings_v1(v_request);
  EXCEPTION WHEN SQLSTATE '22023' THEN RAISE EXCEPTION 'buyer request criteria is invalid' USING ERRCODE = 'OT422';
  END;
  RETURN QUERY INSERT INTO marketplace.buyer_requests AS request (user_id, title, search_request)
    VALUES (v_user_id, NULLIF(btrim(p_title), ''), v_request)
    RETURNING request.id, request.title, request.criteria_version, request.search_request, request.status, request.created_at, request.updated_at;
END; $$;

CREATE FUNCTION marketplace.list_own_buyer_requests(p_include_archived BOOLEAN DEFAULT FALSE)
RETURNS TABLE (buyer_request_id UUID, title TEXT, criteria_version TEXT, search_request JSONB, status TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  RETURN QUERY SELECT request.id, request.title, request.criteria_version, request.search_request, request.status, request.created_at, request.updated_at
  FROM marketplace.buyer_requests AS request
  WHERE request.user_id = v_user_id AND (p_include_archived OR request.status = 'active')
  ORDER BY request.updated_at DESC, request.id DESC;
END; $$;

CREATE FUNCTION marketplace.update_own_buyer_request(p_buyer_request_id UUID, p_request JSONB, p_title TEXT DEFAULT NULL)
RETURNS TABLE (buyer_request_id UUID, title TEXT, criteria_version TEXT, search_request JSONB, status TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_request JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  IF jsonb_typeof(p_request) IS DISTINCT FROM 'object'
     OR (p_request ? 'cursor' AND p_request -> 'cursor' <> 'null'::JSONB) THEN
    RAISE EXCEPTION 'buyer request criteria is invalid' USING ERRCODE = 'OT422';
  END IF;
  v_request := p_request - 'cursor';
  BEGIN PERFORM marketplace.search_listings_v1(v_request);
  EXCEPTION WHEN SQLSTATE '22023' THEN RAISE EXCEPTION 'buyer request criteria is invalid' USING ERRCODE = 'OT422';
  END;
  UPDATE marketplace.buyer_requests AS request
  SET title = NULLIF(btrim(p_title), ''), search_request = v_request
  WHERE request.id = p_buyer_request_id AND request.user_id = v_user_id
  RETURNING request.id, request.title, request.criteria_version, request.search_request, request.status, request.created_at, request.updated_at
  INTO buyer_request_id, title, criteria_version, search_request, status, created_at, updated_at;
  IF NOT FOUND THEN RAISE EXCEPTION 'buyer request not found' USING ERRCODE = 'OT404'; END IF;
  RETURN NEXT;
END; $$;

CREATE FUNCTION marketplace.archive_own_buyer_request(p_buyer_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  UPDATE marketplace.buyer_requests AS request SET status = 'archived'
  WHERE request.id = p_buyer_request_id AND request.user_id = v_user_id AND request.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'buyer request not found' USING ERRCODE = 'OT404'; END IF;
END; $$;

REVOKE ALL ON FUNCTION marketplace.create_own_buyer_request(JSONB, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.list_own_buyer_requests(BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.update_own_buyer_request(UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.archive_own_buyer_request(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.create_own_buyer_request(JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.list_own_buyer_requests(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.update_own_buyer_request(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.archive_own_buyer_request(UUID) TO authenticated;

COMMENT ON TABLE marketplace.buyer_requests IS 'Owner-private buyer criteria in canonical Search v1 form; no public identity or criteria projection.';
NOTIFY pgrst, 'reload schema';
COMMIT;
