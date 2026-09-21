BEGIN;

-- FUNCTIONAL-03B-A1 keeps the original URL-query payload for legacy rows, but
-- makes every new saved search an explicit, versioned Search v1 request. The
-- nullable canonical columns are intentional: existing saved searches remain
-- readable without a destructive data rewrite.
ALTER TABLE marketplace.saved_searches
  ADD COLUMN criteria_version TEXT,
  ADD COLUMN search_request JSONB,
  ADD COLUMN alert_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD CONSTRAINT saved_searches_criteria_version_chk
    CHECK (criteria_version IS NULL OR criteria_version = 'v1'),
  ADD CONSTRAINT saved_searches_search_request_object_chk
    CHECK (search_request IS NULL OR jsonb_typeof(search_request) = 'object'),
  ADD CONSTRAINT saved_searches_canonical_criteria_pair_chk
    CHECK (
      (criteria_version IS NULL AND search_request IS NULL)
      OR (criteria_version = 'v1' AND search_request IS NOT NULL)
    );

-- Direct table access was the temporary WEB-05 browser contract. Revoke it
-- before exposing the owner-derived RPC boundary; RLS remains defence in depth
-- for service maintenance and any future privileged access.
REVOKE ALL ON TABLE marketplace.saved_searches FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE marketplace.saved_searches TO service_role;

CREATE FUNCTION marketplace.create_saved_search(
  p_request JSONB,
  p_title TEXT DEFAULT NULL,
  p_alert_enabled BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  saved_search_id UUID,
  title TEXT,
  criteria_version TEXT,
  search_request JSONB,
  alert_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401';
  END IF;

  -- A saved search captures criteria, not a transient page cursor. Accept an
  -- explicit JSON null for clients that serialize optional cursor fields, then
  -- remove it from the durable representation.
  IF jsonb_typeof(p_request) IS DISTINCT FROM 'object'
     OR (p_request ? 'cursor' AND p_request -> 'cursor' <> 'null'::JSONB) THEN
    RAISE EXCEPTION 'saved search request is invalid' USING ERRCODE = 'OT422';
  END IF;
  v_request := p_request - 'cursor';

  -- Search v1 is the canonical validator. This avoids a second allow-list of
  -- filters that could silently diverge from FUNCTIONAL-02C2.
  BEGIN
    PERFORM marketplace.search_listings_v1(v_request);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    RAISE EXCEPTION 'saved search request is invalid' USING ERRCODE = 'OT422';
  END;

  -- Serialize a user's create attempts so the five-search cap cannot be
  -- exceeded by concurrent RPC calls. Hash collisions only serialize users;
  -- they cannot grant access or weaken the cap.
  PERFORM pg_catalog.pg_advisory_xact_lock(80301, pg_catalog.hashtext(v_user_id::TEXT));
  IF (SELECT count(*) FROM marketplace.saved_searches AS saved WHERE saved.user_id = v_user_id) >= 5 THEN
    RAISE EXCEPTION 'saved search limit reached' USING ERRCODE = 'OT429';
  END IF;

  RETURN QUERY
  INSERT INTO marketplace.saved_searches AS saved (
    user_id, title, query_params, criteria_version, search_request, alert_enabled
  ) VALUES (
    v_user_id,
    NULLIF(btrim(p_title), ''),
    COALESCE(v_request -> 'filters', '{}'::JSONB),
    'v1',
    v_request,
    COALESCE(p_alert_enabled, FALSE)
  )
  RETURNING saved.id, saved.title, saved.criteria_version, saved.search_request,
    saved.alert_enabled, saved.created_at, saved.updated_at;
END;
$$;

CREATE FUNCTION marketplace.list_own_saved_searches()
RETURNS TABLE (
  saved_search_id UUID,
  title TEXT,
  criteria_version TEXT,
  search_request JSONB,
  legacy_query_params JSONB,
  alert_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401';
  END IF;

  RETURN QUERY
  SELECT saved.id, saved.title, saved.criteria_version, saved.search_request,
    saved.query_params, saved.alert_enabled, saved.created_at, saved.updated_at
  FROM marketplace.saved_searches AS saved
  WHERE saved.user_id = v_user_id
  ORDER BY saved.created_at DESC, saved.id DESC;
END;
$$;

CREATE FUNCTION marketplace.update_own_saved_search_metadata(
  p_saved_search_id UUID,
  p_title TEXT,
  p_alert_enabled BOOLEAN
)
RETURNS TABLE (
  saved_search_id UUID,
  title TEXT,
  criteria_version TEXT,
  search_request JSONB,
  alert_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_saved marketplace.saved_searches%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401';
  END IF;

  UPDATE marketplace.saved_searches AS saved
  SET title = NULLIF(btrim(p_title), ''),
      alert_enabled = COALESCE(p_alert_enabled, FALSE)
  WHERE saved.id = p_saved_search_id
    AND saved.user_id = v_user_id
  RETURNING saved.* INTO v_saved;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'saved search not found' USING ERRCODE = 'OT404';
  END IF;

  RETURN QUERY SELECT v_saved.id, v_saved.title, v_saved.criteria_version,
    v_saved.search_request, v_saved.alert_enabled, v_saved.created_at, v_saved.updated_at;
END;
$$;

CREATE FUNCTION marketplace.delete_own_saved_search(p_saved_search_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401';
  END IF;

  DELETE FROM marketplace.saved_searches AS saved
  WHERE saved.id = p_saved_search_id
    AND saved.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'saved search not found' USING ERRCODE = 'OT404';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.create_saved_search(JSONB, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.list_own_saved_searches() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.update_own_saved_search_metadata(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.delete_own_saved_search(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.create_saved_search(JSONB, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.list_own_saved_searches() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.update_own_saved_search_metadata(UUID, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.delete_own_saved_search(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION marketplace.create_saved_search(JSONB, TEXT, BOOLEAN) IS
  'FUNCTIONAL-03B-A1 owner-derived saved Search v1 creation, with a transaction-safe maximum of five searches.';
COMMENT ON FUNCTION marketplace.list_own_saved_searches() IS
  'FUNCTIONAL-03B-A1 owner-only saved-search read boundary. Legacy WEB-05 rows remain readable through legacy_query_params.';

NOTIFY pgrst, 'reload schema';

COMMIT;
