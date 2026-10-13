BEGIN;

-- JLC-0916: live notifications retain only an opaque stream reference.  Live
-- interest is an authenticated, idempotent action that creates one CRM lead
-- per viewer/stream without copying viewer identity or contact data into CRM.
ALTER TABLE marketplace.notifications
  ADD COLUMN live_stream_id UUID REFERENCES marketplace.dealer_live_streams(id) ON DELETE CASCADE;

ALTER TABLE marketplace.notifications
  ADD CONSTRAINT notifications_live_started_refs_chk
  CHECK (type <> 'dealer_live_started' OR live_stream_id IS NOT NULL);

CREATE UNIQUE INDEX notifications_dealer_live_started_dedup_idx
  ON marketplace.notifications (user_id, live_stream_id, type)
  WHERE type = 'dealer_live_started' AND live_stream_id IS NOT NULL;

CREATE TABLE marketplace.dealer_live_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES marketplace.dealer_live_streams(id) ON DELETE RESTRICT,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_live_interests_viewer_once_per_stream_key UNIQUE (stream_id, viewer_id)
);

CREATE INDEX dealer_live_interests_stream_created_idx
  ON marketplace.dealer_live_interests (stream_id, created_at DESC, id DESC);

ALTER TABLE marketplace.dealer_live_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_live_interests_service_role_all
  ON marketplace.dealer_live_interests FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE marketplace.dealer_live_interests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.dealer_live_interests TO service_role;

-- This is the latest owner of the CRM integrity guard. Preserve all earlier
-- source checks while admitting only interest records created by the trusted
-- live-interest facade below.
CREATE OR REPLACE FUNCTION marketplace.validate_dealer_lead_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, messaging, identity, vehicle, public, auth, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles dealer WHERE dealer.id = NEW.dealer_id AND dealer.seller_type = 'dealer') THEN
    RAISE EXCEPTION 'dealer profile required' USING ERRCODE = 'OT422';
  END IF;
  IF NEW.manager_id IS NOT NULL AND NEW.manager_id <> NEW.dealer_id AND NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_staff_memberships membership
    WHERE membership.dealer_id = NEW.dealer_id AND membership.user_id = NEW.manager_id
  ) THEN RAISE EXCEPTION 'lead manager must belong to dealer' USING ERRCODE = 'OT422'; END IF;
  IF NEW.listing_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM marketplace.listings listing WHERE listing.id = NEW.listing_id AND listing.seller_id = NEW.dealer_id
  ) THEN RAISE EXCEPTION 'listing must belong to dealer' USING ERRCODE = 'OT422'; END IF;
  IF NEW.vehicle_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vehicle.profile_ownership ownership WHERE ownership.vehicle_profile_id = NEW.vehicle_profile_id
      AND ownership.owner_id = NEW.dealer_id AND ownership.is_current
  ) THEN RAISE EXCEPTION 'vehicle must belong to dealer' USING ERRCODE = 'OT422'; END IF;
  IF NEW.listing_id IS NOT NULL AND NEW.vehicle_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM marketplace.listings listing WHERE listing.id = NEW.listing_id AND listing.vehicle_profile_id = NEW.vehicle_profile_id
  ) THEN RAISE EXCEPTION 'listing and vehicle must match' USING ERRCODE = 'OT422'; END IF;

  IF NEW.source = 'chat' AND NOT EXISTS (
    SELECT 1 FROM messaging.conversations conversation WHERE conversation.id = NEW.source_record_id AND conversation.seller_id = NEW.dealer_id
  ) THEN RAISE EXCEPTION 'chat source must belong to dealer' USING ERRCODE = 'OT422';
  ELSIF NEW.source = 'contact' AND NOT EXISTS (
    SELECT 1 FROM identity.listing_seller_contact_disclosures disclosure
    JOIN marketplace.listings listing ON listing.id = disclosure.listing_id
    WHERE disclosure.id = NEW.source_record_id AND listing.seller_id = NEW.dealer_id
      AND (NEW.listing_id IS NULL OR NEW.listing_id = disclosure.listing_id)
  ) THEN RAISE EXCEPTION 'contact source must belong to dealer' USING ERRCODE = 'OT422';
  ELSIF NEW.source = 'buyer_request' AND NOT EXISTS (
    SELECT 1 FROM marketplace.list_listing_match_targets_v1(NEW.listing_id) target
    WHERE target.target_kind = 'buyer_request' AND target.target_id = NEW.source_record_id
      AND target.target_id = NEW.buyer_request_id
  ) THEN RAISE EXCEPTION 'buyer request source is not a listing match' USING ERRCODE = 'OT422';
  ELSIF NEW.source = 'dealer_live' AND NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_live_interests interest
    JOIN marketplace.dealer_live_streams stream ON stream.id = interest.stream_id
    WHERE interest.id = NEW.source_record_id AND stream.dealer_id = NEW.dealer_id
      AND (NEW.listing_id IS NULL OR NEW.listing_id = interest.listing_id)
  ) THEN RAISE EXCEPTION 'live interest source is invalid' USING ERRCODE = 'OT422'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.start_own_dealer_live_stream(p_stream_id UUID)
RETURNS marketplace.dealer_live_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_status marketplace.dealer_live_status;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT public.is_verified_dealer(v_actor) THEN RAISE EXCEPTION 'verified dealer required' USING ERRCODE = 'OT403'; END IF;
  SELECT status INTO v_status FROM marketplace.dealer_live_streams
  WHERE id = p_stream_id AND dealer_id = v_actor FOR UPDATE;
  IF NOT FOUND OR v_status <> 'created' THEN RAISE EXCEPTION 'startable dealer live stream required' USING ERRCODE = 'OT409'; END IF;
  UPDATE marketplace.dealer_live_streams SET status = 'live', started_at = now() WHERE id = p_stream_id;
  INSERT INTO marketplace.dealer_live_state_transitions (stream_id, previous_status, next_status, actor_user_id)
  VALUES (p_stream_id, 'created', 'live', v_actor);
  INSERT INTO marketplace.notifications (user_id, type, live_stream_id)
  SELECT follow.follower_id, 'dealer_live_started', p_stream_id
  FROM marketplace.dealer_follows AS follow
  WHERE follow.dealer_id = v_actor
  ON CONFLICT (user_id, live_stream_id, type)
    WHERE type = 'dealer_live_started' AND live_stream_id IS NOT NULL
  DO NOTHING;
  RETURN 'live';
END;
$$;

CREATE FUNCTION marketplace.express_dealer_live_interest(
  p_stream_id UUID,
  p_listing_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, vehicle, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_dealer_id UUID;
  v_interest_id UUID;
  v_vehicle_profile_id UUID;
  v_lead_id UUID;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT dealer_id INTO v_dealer_id FROM marketplace.dealer_live_streams
  WHERE id = p_stream_id AND status = 'live';
  IF NOT FOUND OR v_dealer_id = v_actor THEN RAISE EXCEPTION 'active dealer live stream required' USING ERRCODE = 'OT404'; END IF;
  IF p_listing_id IS NOT NULL THEN
    SELECT listing.vehicle_profile_id INTO v_vehicle_profile_id
    FROM marketplace.dealer_live_listing_attachments attachment
    JOIN marketplace.listings listing ON listing.id = attachment.listing_id
    WHERE attachment.stream_id = p_stream_id AND attachment.listing_id = p_listing_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'live listing attachment required' USING ERRCODE = 'OT422'; END IF;
  END IF;
  INSERT INTO marketplace.dealer_live_interests (stream_id, viewer_id, listing_id)
  VALUES (p_stream_id, v_actor, p_listing_id)
  ON CONFLICT (stream_id, viewer_id) DO UPDATE SET stream_id = EXCLUDED.stream_id
  RETURNING id, listing_id INTO v_interest_id, p_listing_id;
  IF p_listing_id IS NOT NULL THEN
    SELECT vehicle_profile_id INTO v_vehicle_profile_id FROM marketplace.listings WHERE id = p_listing_id;
  END IF;
  INSERT INTO marketplace.dealer_leads (dealer_id, listing_id, vehicle_profile_id, source, source_record_id)
  VALUES (v_dealer_id, p_listing_id, v_vehicle_profile_id, 'dealer_live', v_interest_id)
  ON CONFLICT (dealer_id, source, source_record_id) DO UPDATE SET dealer_id = EXCLUDED.dealer_id
  RETURNING id INTO v_lead_id;
  RETURN v_lead_id;
END;
$$;

CREATE FUNCTION marketplace.list_own_notifications_v3(
  p_limit INTEGER DEFAULT 20,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  notification_id UUID, notification_type TEXT, saved_search_id UUID,
  listing_id UUID, conversation_id UUID, message_id UUID, live_stream_id UUID,
  created_at TIMESTAMPTZ, read_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  IF p_limit NOT BETWEEN 1 AND 50 OR (p_before_created_at IS NULL) <> (p_before_id IS NULL) THEN
    RAISE EXCEPTION 'notification cursor is invalid' USING ERRCODE = 'OT422';
  END IF;
  RETURN QUERY SELECT notification.id, notification.type, notification.saved_search_id,
    notification.listing_id, notification.conversation_id, notification.message_id, notification.live_stream_id,
    notification.created_at, notification.read_at
  FROM marketplace.notifications AS notification
  WHERE notification.user_id = v_user_id
    AND (p_before_id IS NULL OR (notification.created_at, notification.id) < (p_before_created_at, p_before_id))
  ORDER BY notification.created_at DESC, notification.id DESC LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.express_dealer_live_interest(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.list_own_notifications_v3(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.express_dealer_live_interest(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.list_own_notifications_v3(INTEGER, TIMESTAMPTZ, UUID) TO authenticated, service_role;

COMMENT ON TABLE marketplace.dealer_live_interests IS
  'Private deduplicated viewer interest events. Viewer identity stays outside dealer CRM; each event is represented there only by its opaque source ID.';
COMMENT ON FUNCTION marketplace.express_dealer_live_interest(UUID, UUID) IS
  'Authenticated, idempotent live-interest facade. It accepts only active streams and attached listings and creates one attributed dealer CRM lead without notifications.';
COMMENT ON FUNCTION marketplace.start_own_dealer_live_stream(UUID) IS
  'Verified-dealer state transition with one private in-app start notification per current follower; no delivery provider is called.';
COMMENT ON FUNCTION marketplace.list_own_notifications_v3(INTEGER, TIMESTAMPTZ, UUID) IS
  'Owner-derived bounded notification history facade with an opaque Dealer Live stream reference.';

NOTIFY pgrst, 'reload schema';
COMMIT;
