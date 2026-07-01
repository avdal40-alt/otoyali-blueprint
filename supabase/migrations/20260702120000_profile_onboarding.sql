-- =============================================================================
-- OTOYALI — Profile onboarding flag (S1-T01 Phone Auth)
-- Migration: 20260702120000_profile_onboarding.sql
-- Description: Track first-time profile setup for post-login routing
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'Set when user completes first-time profile setup. NULL => redirect to ProfileCreatePage.';

CREATE INDEX IF NOT EXISTS profiles_onboarding_pending_idx
  ON public.profiles (id)
  WHERE onboarding_completed_at IS NULL;

COMMIT;
