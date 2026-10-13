BEGIN;

-- JLC-0912: Live metadata remains application-owned. Streaming transport is
-- deliberately external to Supabase/Vercel and represented only by an opaque,
-- private provider reference that a future approved adapter may provision.
CREATE TYPE marketplace.dealer_live_status AS ENUM ('created', 'live', 'ended', 'stopped');

CREATE TABLE marketplace.dealer_live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  status marketplace.dealer_live_status NOT NULL DEFAULT 'created',
  provider_key TEXT NOT NULL DEFAULT 'local_fake',
  provider_stream_ref TEXT NOT NULL UNIQUE DEFAULT ('local:' || gen_random_uuid()::text),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  stopped_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stop_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_live_streams_title_chk CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  CONSTRAINT dealer_live_streams_provider_key_chk CHECK (provider_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  CONSTRAINT dealer_live_streams_provider_ref_chk CHECK (char_length(provider_stream_ref) BETWEEN 1 AND 300),
  CONSTRAINT dealer_live_streams_stop_reason_chk CHECK (stop_reason IS NULL OR char_length(btrim(stop_reason)) BETWEEN 1 AND 500),
  CONSTRAINT dealer_live_streams_state_fields_chk CHECK (
    (status = 'created' AND started_at IS NULL AND ended_at IS NULL AND stopped_at IS NULL AND stopped_by IS NULL AND stop_reason IS NULL)
    OR (status = 'live' AND started_at IS NOT NULL AND ended_at IS NULL AND stopped_at IS NULL AND stopped_by IS NULL AND stop_reason IS NULL)
    OR (status = 'ended' AND started_at IS NOT NULL AND ended_at IS NOT NULL AND stopped_at IS NULL AND stopped_by IS NULL AND stop_reason IS NULL)
    OR (status = 'stopped' AND stopped_at IS NOT NULL AND stopped_by IS NOT NULL AND stop_reason IS NOT NULL)
  )
);

CREATE TABLE marketplace.dealer_live_listing_attachments (
  stream_id UUID NOT NULL REFERENCES marketplace.dealer_live_streams(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  sort_order SMALLINT NOT NULL,
  PRIMARY KEY (stream_id, listing_id),
  CONSTRAINT dealer_live_listing_attachments_sort_chk CHECK (sort_order BETWEEN 0 AND 7)
);

CREATE TABLE marketplace.dealer_live_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES marketplace.dealer_live_streams(id) ON DELETE RESTRICT,
  previous_status marketplace.dealer_live_status,
  next_status marketplace.dealer_live_status NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_live_state_transitions_changed_chk CHECK (
    (previous_status IS NULL AND next_status = 'created')
    OR (previous_status = 'created' AND next_status IN ('live', 'stopped'))
    OR (previous_status = 'live' AND next_status IN ('ended', 'stopped'))
  ),
  CONSTRAINT dealer_live_state_transitions_reason_chk CHECK (reason IS NULL OR char_length(btrim(reason)) BETWEEN 1 AND 500)
);

CREATE INDEX dealer_live_streams_dealer_status_created_idx
  ON marketplace.dealer_live_streams (dealer_id, status, created_at DESC, id DESC);
CREATE INDEX dealer_live_listing_attachments_listing_idx
  ON marketplace.dealer_live_listing_attachments (listing_id, stream_id);
CREATE INDEX dealer_live_state_transitions_stream_created_idx
  ON marketplace.dealer_live_state_transitions (stream_id, created_at ASC, id ASC);

CREATE TRIGGER dealer_live_streams_set_updated_at
  BEFORE UPDATE ON marketplace.dealer_live_streams
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.create_own_dealer_live_stream(p_title TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_stream_id UUID;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF char_length(COALESCE(btrim(p_title), '')) NOT BETWEEN 1 AND 140 THEN
    RAISE EXCEPTION 'invalid live stream title' USING ERRCODE = 'OT422';
  END IF;
  IF NOT public.is_verified_dealer(v_actor) THEN
    RAISE EXCEPTION 'verified dealer required' USING ERRCODE = 'OT403';
  END IF;

  INSERT INTO marketplace.dealer_live_streams (dealer_id, title)
  VALUES (v_actor, btrim(p_title))
  RETURNING id INTO v_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id)
  VALUES (v_stream_id, NULL, 'created', v_actor);
  RETURN v_stream_id;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.attach_own_dealer_live_listings(
  p_stream_id UUID,
  p_listing_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, vehicle, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_listing_id UUID;
  v_position SMALLINT;
  v_listing_ids UUID[] := COALESCE(p_listing_ids, ARRAY[]::UUID[]);
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF cardinality(v_listing_ids) > 8
     OR cardinality(v_listing_ids) <> cardinality(ARRAY(SELECT DISTINCT item FROM unnest(v_listing_ids) AS item)) THEN
    RAISE EXCEPTION 'invalid live listing attachments' USING ERRCODE = 'OT422';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_live_streams stream
    WHERE stream.id = p_stream_id AND stream.dealer_id = v_actor AND stream.status = 'created'
  ) THEN RAISE EXCEPTION 'manageable created dealer live stream required' USING ERRCODE = 'OT403'; END IF;

  SELECT COALESCE(max(sort_order) + 1, 0) INTO v_position
  FROM marketplace.dealer_live_listing_attachments WHERE stream_id = p_stream_id;
  IF v_position + cardinality(v_listing_ids) > 8 THEN
    RAISE EXCEPTION 'too many live listing attachments' USING ERRCODE = 'OT422';
  END IF;

  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    IF NOT EXISTS (
      SELECT 1 FROM marketplace.listings listing
      WHERE listing.id = v_listing_id AND listing.seller_id = v_actor
        AND listing.seller_type = 'dealer' AND listing.status = 'active'
        AND listing.moderation_status = 'active' AND listing.archived_at IS NULL
        AND marketplace.is_listing_search_eligible(listing.id)
    ) THEN RAISE EXCEPTION 'dealer-owned eligible listing required' USING ERRCODE = 'OT422'; END IF;
  END LOOP;

  FOREACH v_listing_id IN ARRAY v_listing_ids LOOP
    INSERT INTO marketplace.dealer_live_listing_attachments (stream_id, listing_id, sort_order)
    VALUES (p_stream_id, v_listing_id, v_position);
    v_position := v_position + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.start_own_dealer_live_stream(p_stream_id UUID)
RETURNS marketplace.dealer_live_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_status marketplace.dealer_live_status;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT public.is_verified_dealer(v_actor) THEN
    RAISE EXCEPTION 'verified dealer required' USING ERRCODE = 'OT403';
  END IF;
  SELECT status INTO v_status FROM marketplace.dealer_live_streams
  WHERE id = p_stream_id AND dealer_id = v_actor FOR UPDATE;
  IF NOT FOUND OR v_status <> 'created' THEN
    RAISE EXCEPTION 'startable dealer live stream required' USING ERRCODE = 'OT409';
  END IF;
  UPDATE marketplace.dealer_live_streams SET status = 'live', started_at = now() WHERE id = p_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id)
  VALUES (p_stream_id, 'created', 'live', v_actor);
  RETURN 'live';
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.end_own_dealer_live_stream(p_stream_id UUID)
RETURNS marketplace.dealer_live_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_status marketplace.dealer_live_status;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT status INTO v_status FROM marketplace.dealer_live_streams
  WHERE id = p_stream_id AND dealer_id = v_actor FOR UPDATE;
  IF NOT FOUND OR v_status <> 'live' THEN
    RAISE EXCEPTION 'endable dealer live stream required' USING ERRCODE = 'OT409';
  END IF;
  UPDATE marketplace.dealer_live_streams SET status = 'ended', ended_at = now() WHERE id = p_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id)
  VALUES (p_stream_id, 'live', 'ended', v_actor);
  RETURN 'ended';
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.stop_dealer_live_stream(p_stream_id UUID, p_reason TEXT)
RETURNS marketplace.dealer_live_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_status marketplace.dealer_live_status;
  v_reason TEXT := NULLIF(btrim(p_reason), '');
BEGIN
  IF v_actor IS NULL OR COALESCE(public.admin_role(v_actor), '') NOT IN ('owner', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'authorized live moderator required' USING ERRCODE = 'OT403';
  END IF;
  IF char_length(COALESCE(v_reason, '')) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'live stop reason required' USING ERRCODE = 'OT422';
  END IF;
  SELECT status INTO v_status FROM marketplace.dealer_live_streams WHERE id = p_stream_id FOR UPDATE;
  IF NOT FOUND OR v_status NOT IN ('created', 'live') THEN
    RAISE EXCEPTION 'stoppable dealer live stream required' USING ERRCODE = 'OT409';
  END IF;
  UPDATE marketplace.dealer_live_streams
  SET status = 'stopped', stopped_at = now(), stopped_by = v_actor, stop_reason = v_reason
  WHERE id = p_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id, reason)
  VALUES (p_stream_id, v_status, 'stopped', v_actor, v_reason);
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor, 'dealer_live.stop', 'dealer_live', p_stream_id, jsonb_build_object('previous_status', v_status));
  RETURN 'stopped';
END;
$$;

ALTER TABLE marketplace.dealer_live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_live_listing_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_live_state_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_live_streams_service_role_all ON marketplace.dealer_live_streams FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY dealer_live_listing_attachments_service_role_all ON marketplace.dealer_live_listing_attachments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY dealer_live_state_transitions_service_role_all ON marketplace.dealer_live_state_transitions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON TABLE marketplace.dealer_live_streams, marketplace.dealer_live_listing_attachments, marketplace.dealer_live_state_transitions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.dealer_live_streams, marketplace.dealer_live_listing_attachments, marketplace.dealer_live_state_transitions TO service_role;
REVOKE ALL ON FUNCTION marketplace.create_own_dealer_live_stream(TEXT), marketplace.attach_own_dealer_live_listings(UUID, UUID[]), marketplace.start_own_dealer_live_stream(UUID), marketplace.end_own_dealer_live_stream(UUID), marketplace.stop_dealer_live_stream(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.create_own_dealer_live_stream(TEXT), marketplace.attach_own_dealer_live_listings(UUID, UUID[]), marketplace.start_own_dealer_live_stream(UUID), marketplace.end_own_dealer_live_stream(UUID), marketplace.stop_dealer_live_stream(UUID, TEXT) TO authenticated;

COMMENT ON TABLE marketplace.dealer_live_streams IS 'Private Dealer Live metadata. Opaque provider references are never a public playback contract.';
COMMENT ON FUNCTION marketplace.stop_dealer_live_stream(UUID, TEXT) IS 'Admin/moderator-only live stop with an immutable transition and admin audit event.';

NOTIFY pgrst, 'reload schema';
COMMIT;
