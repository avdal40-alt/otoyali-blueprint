BEGIN;

-- Dealer status is a trust assertion, not an editable profile preference.
UPDATE public.profiles
SET seller_type = 'private'
WHERE seller_type IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN seller_type SET DEFAULT 'private',
  ALTER COLUMN seller_type SET NOT NULL;

REVOKE UPDATE (seller_type) ON public.profiles FROM authenticated;

-- Remove any client-supplied listing snapshot drift and make all future
-- listing inserts derive their seller classification from the trusted profile.
UPDATE marketplace.listings AS listing
SET seller_type = profile.seller_type
FROM public.profiles AS profile
WHERE profile.id = listing.seller_id
  AND listing.seller_type IS DISTINCT FROM profile.seller_type;

ALTER TABLE marketplace.listings
  ALTER COLUMN seller_type SET DEFAULT 'private',
  ALTER COLUMN seller_type SET NOT NULL;

REVOKE UPDATE (seller_type) ON marketplace.listings FROM authenticated;

DROP POLICY IF EXISTS listings_insert_own ON marketplace.listings;
CREATE POLICY listings_insert_own
  ON marketplace.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND vehicle.is_current_profile_owner(vehicle_profile_id)
    AND status = 'draft'
    AND moderation_status = 'pending_review'
    AND published_at IS NULL
    AND moderated_by IS NULL
    AND moderated_at IS NULL
    AND archived_at IS NULL
    AND rejection_reason IS NULL
    AND moderation_note IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS seller_profile
      WHERE seller_profile.id = auth.uid()
        AND seller_profile.seller_type = listings.seller_type
    )
  );

COMMENT ON COLUMN public.profiles.seller_type IS
  'Trusted seller classification. Ordinary authenticated clients cannot change it; dealer assignment requires an administrative or service path.';

NOTIFY pgrst, 'reload schema';

COMMIT;
