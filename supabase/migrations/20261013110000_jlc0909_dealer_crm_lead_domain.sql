BEGIN;

-- JLC-0909: a lightweight, private dealer CRM foundation. Source references
-- remain opaque IDs: buyer-request criteria and contact data are never copied
-- into CRM records.
CREATE TYPE marketplace.dealer_lead_source AS ENUM (
  'listing',
  'chat',
  'contact',
  'buyer_request',
  'dealer_post',
  'dealer_live'
);

CREATE TABLE marketplace.dealer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  vehicle_profile_id UUID REFERENCES vehicle.vehicle_profiles(id) ON DELETE RESTRICT,
  buyer_request_id UUID REFERENCES marketplace.buyer_requests(id) ON DELETE RESTRICT,
  source marketplace.dealer_lead_source NOT NULL,
  source_record_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_leads_source_reference_consistency_chk CHECK (
    (source = 'listing' AND listing_id IS NOT NULL AND source_record_id = listing_id)
    OR (source = 'buyer_request' AND buyer_request_id IS NOT NULL AND source_record_id = buyer_request_id)
    OR source IN ('chat', 'contact', 'dealer_post', 'dealer_live')
  )
);

-- One source event creates at most one lead for a dealer. Repeated webhooks,
-- retries, or refreshes deterministically return the original lead.
CREATE UNIQUE INDEX dealer_leads_source_dedup_idx
  ON marketplace.dealer_leads (dealer_id, source, source_record_id);
CREATE INDEX dealer_leads_dealer_created_idx
  ON marketplace.dealer_leads (dealer_id, created_at DESC, id DESC);
CREATE INDEX dealer_leads_manager_created_idx
  ON marketplace.dealer_leads (manager_id, created_at DESC, id DESC)
  WHERE manager_id IS NOT NULL;

CREATE OR REPLACE FUNCTION marketplace.validate_dealer_lead_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, messaging, identity, vehicle, public, auth, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles dealer
    WHERE dealer.id = NEW.dealer_id AND dealer.seller_type = 'dealer'
  ) THEN
    RAISE EXCEPTION 'dealer profile required' USING ERRCODE = 'OT422';
  END IF;

  IF NEW.manager_id IS NOT NULL
     AND NEW.manager_id <> NEW.dealer_id
     AND NOT EXISTS (
       SELECT 1 FROM marketplace.dealer_staff_memberships membership
       WHERE membership.dealer_id = NEW.dealer_id AND membership.user_id = NEW.manager_id
     ) THEN
    RAISE EXCEPTION 'lead manager must belong to dealer' USING ERRCODE = 'OT422';
  END IF;

  IF NEW.listing_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM marketplace.listings listing
    WHERE listing.id = NEW.listing_id AND listing.seller_id = NEW.dealer_id
  ) THEN
    RAISE EXCEPTION 'listing must belong to dealer' USING ERRCODE = 'OT422';
  END IF;

  IF NEW.vehicle_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vehicle.profile_ownership ownership
    WHERE ownership.vehicle_profile_id = NEW.vehicle_profile_id
      AND ownership.owner_id = NEW.dealer_id AND ownership.is_current
  ) THEN
    RAISE EXCEPTION 'vehicle must belong to dealer' USING ERRCODE = 'OT422';
  END IF;

  IF NEW.listing_id IS NOT NULL AND NEW.vehicle_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM marketplace.listings listing
    WHERE listing.id = NEW.listing_id AND listing.vehicle_profile_id = NEW.vehicle_profile_id
  ) THEN
    RAISE EXCEPTION 'listing and vehicle must match' USING ERRCODE = 'OT422';
  END IF;

  IF NEW.source = 'chat' AND NOT EXISTS (
    SELECT 1 FROM messaging.conversations conversation
    WHERE conversation.id = NEW.source_record_id AND conversation.seller_id = NEW.dealer_id
  ) THEN
    RAISE EXCEPTION 'chat source must belong to dealer' USING ERRCODE = 'OT422';
  ELSIF NEW.source = 'contact' AND NOT EXISTS (
    SELECT 1 FROM identity.listing_seller_contact_disclosures disclosure
    JOIN marketplace.listings listing ON listing.id = disclosure.listing_id
    WHERE disclosure.id = NEW.source_record_id AND listing.seller_id = NEW.dealer_id
      AND (NEW.listing_id IS NULL OR NEW.listing_id = disclosure.listing_id)
  ) THEN
    RAISE EXCEPTION 'contact source must belong to dealer' USING ERRCODE = 'OT422';
  ELSIF NEW.source = 'buyer_request' AND NOT EXISTS (
    SELECT 1 FROM marketplace.buyer_requests request
    WHERE request.id = NEW.source_record_id AND request.id = NEW.buyer_request_id
  ) THEN
    RAISE EXCEPTION 'buyer request source is invalid' USING ERRCODE = 'OT422';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER dealer_leads_validate_references
  BEFORE INSERT OR UPDATE ON marketplace.dealer_leads
  FOR EACH ROW EXECUTE FUNCTION marketplace.validate_dealer_lead_references();

ALTER TABLE marketplace.dealer_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_leads_select_dealer_team ON marketplace.dealer_leads
  FOR SELECT TO authenticated
  USING (
    dealer_id = auth.uid()
    OR marketplace.is_dealer_staff_member(dealer_id)
  );
CREATE POLICY dealer_leads_service_role_all ON marketplace.dealer_leads
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE FUNCTION marketplace.create_dealer_lead(
  p_dealer_id UUID,
  p_source marketplace.dealer_lead_source,
  p_source_record_id UUID,
  p_listing_id UUID DEFAULT NULL,
  p_vehicle_profile_id UUID DEFAULT NULL,
  p_buyer_request_id UUID DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL
)
RETURNS marketplace.dealer_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, messaging, identity, vehicle, public, auth, pg_catalog
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_result marketplace.dealer_leads;
BEGIN
  IF v_actor_id IS NULL OR p_dealer_id IS NULL OR p_source_record_id IS NULL THEN
    RAISE EXCEPTION 'authentication and lead source are required' USING ERRCODE = 'OT401';
  END IF;
  IF v_actor_id <> p_dealer_id AND NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_staff_memberships membership
    WHERE membership.dealer_id = p_dealer_id AND membership.user_id = v_actor_id
  ) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  IF p_source IN ('dealer_post', 'dealer_live') THEN
    RAISE EXCEPTION 'lead source is not yet ingestible' USING ERRCODE = 'OT422';
  END IF;
  IF v_actor_id <> p_dealer_id AND p_manager_id IS NOT NULL AND p_manager_id <> v_actor_id THEN
    RAISE EXCEPTION 'staff may only assign themselves' USING ERRCODE = 'OT403';
  END IF;

  INSERT INTO marketplace.dealer_leads (
    dealer_id, manager_id, listing_id, vehicle_profile_id, buyer_request_id,
    source, source_record_id
  ) VALUES (
    p_dealer_id, p_manager_id, p_listing_id, p_vehicle_profile_id, p_buyer_request_id,
    p_source, p_source_record_id
  )
  ON CONFLICT (dealer_id, source, source_record_id) DO UPDATE
    SET dealer_id = EXCLUDED.dealer_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON TABLE marketplace.dealer_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE marketplace.dealer_leads TO authenticated;
GRANT ALL ON TABLE marketplace.dealer_leads TO service_role;
REVOKE ALL ON FUNCTION marketplace.validate_dealer_lead_references() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.create_dealer_lead(UUID, marketplace.dealer_lead_source, UUID, UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.create_dealer_lead(UUID, marketplace.dealer_lead_source, UUID, UUID, UUID, UUID, UUID) TO authenticated;

COMMENT ON TABLE marketplace.dealer_leads IS
  'Private lightweight dealer CRM lead records. Source references are opaque and never copy buyer-request criteria, contact data, message bodies, or seller-contact metadata.';
COMMENT ON FUNCTION marketplace.create_dealer_lead(UUID, marketplace.dealer_lead_source, UUID, UUID, UUID, UUID, UUID) IS
  'Dealer owner/staff lead intake with deterministic source-event deduplication. Post/live sources are reserved for later trusted domain producers.';

NOTIFY pgrst, 'reload schema';
COMMIT;
