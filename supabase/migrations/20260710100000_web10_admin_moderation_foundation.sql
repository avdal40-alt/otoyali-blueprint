-- WEB-10: Admin and moderation foundation.
-- Additive only. Public read view column order is intentionally untouched.

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'moderator',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT admin_users_role_chk
    CHECK (role IN ('owner', 'admin', 'moderator', 'support'))
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT admin_audit_logs_action_not_empty_chk
    CHECK (char_length(trim(action)) > 0),
  CONSTRAINT admin_audit_logs_entity_type_not_empty_chk
    CHECK (char_length(trim(entity_type)) > 0)
);

CREATE TABLE IF NOT EXISTS marketplace.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES marketplace.listings(id) ON DELETE SET NULL,
  video_id UUID REFERENCES marketplace.listing_videos(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reports_reason_chk
    CHECK (reason IN ('fraud', 'wrong_information', 'duplicate', 'inappropriate_content', 'suspicious_seller', 'other')),
  CONSTRAINT reports_status_chk
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  CONSTRAINT reports_description_not_empty_chk
    CHECK (description IS NULL OR char_length(trim(description)) > 0),
  CONSTRAINT reports_resolution_note_not_empty_chk
    CHECK (resolution_note IS NULL OR char_length(trim(resolution_note)) > 0),
  CONSTRAINT reports_has_target_chk
    CHECK (listing_id IS NOT NULL OR video_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

ALTER TABLE marketplace.listings
  ADD COLUMN IF NOT EXISTS moderation_note TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE marketplace.listing_videos
  ADD COLUMN IF NOT EXISTS moderation_note TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

DO $$
BEGIN
  ALTER TABLE marketplace.listings
    DROP CONSTRAINT IF EXISTS listings_moderation_status_chk;

  ALTER TABLE marketplace.listings
    ADD CONSTRAINT listings_moderation_status_chk
    CHECK (moderation_status IN ('active', 'pending_review', 'rejected', 'archived'));

  ALTER TABLE marketplace.listing_videos
    DROP CONSTRAINT IF EXISTS listing_videos_moderation_status_chk;

  ALTER TABLE marketplace.listing_videos
    ADD CONSTRAINT listing_videos_moderation_status_chk
    CHECK (moderation_status IN ('pending_review', 'approved', 'rejected', 'manual_required', 'archived'));

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_moderation_note_not_empty_chk'
  ) THEN
    ALTER TABLE marketplace.listings
      ADD CONSTRAINT listings_moderation_note_not_empty_chk
      CHECK (moderation_note IS NULL OR char_length(trim(moderation_note)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_rejection_reason_not_empty_chk'
  ) THEN
    ALTER TABLE marketplace.listings
      ADD CONSTRAINT listings_rejection_reason_not_empty_chk
      CHECK (rejection_reason IS NULL OR char_length(trim(rejection_reason)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listing_videos_moderation_note_not_empty_chk'
  ) THEN
    ALTER TABLE marketplace.listing_videos
      ADD CONSTRAINT listing_videos_moderation_note_not_empty_chk
      CHECK (moderation_note IS NULL OR char_length(trim(moderation_note)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listing_videos_rejection_reason_not_empty_chk'
  ) THEN
    ALTER TABLE marketplace.listing_videos
      ADD CONSTRAINT listing_videos_rejection_reason_not_empty_chk
      CHECK (rejection_reason IS NULL OR char_length(trim(rejection_reason)) > 0);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = uid
      AND au.is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_role(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM public.admin_users au
  WHERE au.user_id = uid
    AND au.is_active = TRUE
  LIMIT 1;
$$;

COMMENT ON TABLE public.admin_users IS
  'Active admin allow-list for OTOYALI admin routes. Bootstrap manually with service role or Supabase SQL editor.';
COMMENT ON TABLE public.admin_audit_logs IS
  'Append-only style audit trail for admin moderation actions.';
COMMENT ON TABLE marketplace.reports IS
  'Private user reports for listings, videos, and users. Not publicly readable.';
COMMENT ON FUNCTION public.is_admin(UUID) IS
  'Security definer helper used by RLS and admin UI checks.';
COMMENT ON FUNCTION public.admin_role(UUID) IS
  'Security definer helper returning active admin role for the given user.';

DROP TRIGGER IF EXISTS admin_users_set_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_set_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

DROP TRIGGER IF EXISTS reports_set_updated_at ON marketplace.reports;
CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON marketplace.reports
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

CREATE INDEX IF NOT EXISTS admin_users_user_id_idx
  ON public.admin_users (user_id);
CREATE INDEX IF NOT EXISTS admin_users_active_role_idx
  ON public.admin_users (is_active, role);
CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_created_idx
  ON public.admin_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx
  ON public.admin_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS reports_status_created_idx
  ON marketplace.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_listing_id_idx
  ON marketplace.reports (listing_id);
CREATE INDEX IF NOT EXISTS reports_video_id_idx
  ON marketplace.reports (video_id);
CREATE INDEX IF NOT EXISTS reports_reported_user_id_idx
  ON marketplace.reports (reported_user_id);
CREATE INDEX IF NOT EXISTS listings_moderation_queue_idx
  ON marketplace.listings (moderation_status, published_at DESC);
CREATE INDEX IF NOT EXISTS listing_videos_moderation_queue_idx
  ON marketplace.listing_videos (moderation_status, created_at DESC);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_users_select_admins ON public.admin_users;
CREATE POLICY admin_users_select_admins
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_users_manage_owner_admin ON public.admin_users;
CREATE POLICY admin_users_manage_owner_admin
  ON public.admin_users
  FOR ALL
  TO authenticated
  USING (public.admin_role(auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (public.admin_role(auth.uid()) IN ('owner', 'admin'));

DROP POLICY IF EXISTS admin_audit_logs_select_admins ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_select_admins
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS admin_audit_logs_insert_admins ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_insert_admins
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND actor_user_id = auth.uid());

DROP POLICY IF EXISTS reports_insert_authenticated ON marketplace.reports;
CREATE POLICY reports_insert_authenticated
  ON marketplace.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS reports_select_own ON marketplace.reports;
CREATE POLICY reports_select_own
  ON marketplace.reports
  FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS reports_select_admins ON marketplace.reports;
CREATE POLICY reports_select_admins
  ON marketplace.reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS reports_update_admins ON marketplace.reports;
CREATE POLICY reports_update_admins
  ON marketplace.reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS listings_select_admins ON marketplace.listings;
CREATE POLICY listings_select_admins
  ON marketplace.listings
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS listings_update_admins ON marketplace.listings;
CREATE POLICY listings_update_admins
  ON marketplace.listings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS vehicle_profiles_select_admins ON vehicle.vehicle_profiles;
CREATE POLICY vehicle_profiles_select_admins
  ON vehicle.vehicle_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS listing_videos_select_admins ON marketplace.listing_videos;
CREATE POLICY listing_videos_select_admins
  ON marketplace.listing_videos
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS listing_videos_update_admins ON marketplace.listing_videos;
CREATE POLICY listing_videos_update_admins
  ON marketplace.listing_videos
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_role(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON marketplace.reports TO authenticated;

NOTIFY pgrst, 'reload schema';
