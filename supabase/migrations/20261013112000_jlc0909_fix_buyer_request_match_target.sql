BEGIN;

-- Keep the JLC-0803 canonical matcher as the source of truth for private
-- buyer-request attribution. This corrects the function identifier in the
-- initial guard migration without changing any existing lead data.
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
  ) THEN RAISE EXCEPTION 'buyer request source is not a listing match' USING ERRCODE = 'OT422'; END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
