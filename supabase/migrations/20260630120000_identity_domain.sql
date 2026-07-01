-- =============================================================================
-- OTOYALI — Identity Domain
-- Migration: 20260630120000_identity_domain.sql
-- Description: Production identity layer — profiles, RBAC, settings, audit
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS identity;

COMMENT ON SCHEMA identity IS
  'Identity domain: RBAC, user settings, notification preferences, audit trail.';

GRANT USAGE ON SCHEMA identity TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Shared trigger function: updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION identity.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION identity.set_updated_at() IS
  'Trigger function that sets updated_at to the current timestamp on row update.';

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION identity.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = identity, public, auth
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION identity.current_user_id() IS
  'Returns the authenticated user UUID from the JWT session.';

CREATE OR REPLACE FUNCTION identity.user_has_role(p_role_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = identity, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM identity.user_roles ur
    INNER JOIN identity.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.slug = p_role_slug
      AND r.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
$$;

COMMENT ON FUNCTION identity.user_has_role(TEXT) IS
  'Checks whether the current authenticated user holds an active role by slug.';

CREATE OR REPLACE FUNCTION identity.user_has_permission(p_permission_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = identity, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM identity.user_roles ur
    INNER JOIN identity.roles r ON r.id = ur.role_id
    INNER JOIN identity.role_permissions rp ON rp.role_id = r.id
    INNER JOIN identity.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.slug = p_permission_slug
      AND r.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  );
$$;

COMMENT ON FUNCTION identity.user_has_permission(TEXT) IS
  'Checks whether the current authenticated user has a permission via any active role.';

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       TEXT,
  email       TEXT,
  first_name  TEXT,
  last_name   TEXT,
  avatar_url  TEXT,
  language    TEXT        NOT NULL DEFAULT 'tr',
  country     TEXT        NOT NULL DEFAULT 'TR',
  city        TEXT,
  timezone    TEXT        NOT NULL DEFAULT 'Europe/Istanbul',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_phone_format_chk
    CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{6,14}$'),

  CONSTRAINT profiles_email_format_chk
    CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),

  CONSTRAINT profiles_language_format_chk
    CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),

  CONSTRAINT profiles_country_format_chk
    CHECK (country ~ '^[A-Z]{2}$'),

  CONSTRAINT profiles_timezone_not_empty_chk
    CHECK (char_length(trim(timezone)) > 0),

  CONSTRAINT profiles_first_name_length_chk
    CHECK (first_name IS NULL OR char_length(trim(first_name)) BETWEEN 1 AND 100),

  CONSTRAINT profiles_last_name_length_chk
    CHECK (last_name IS NULL OR char_length(trim(last_name)) BETWEEN 1 AND 100)
);

COMMENT ON TABLE public.profiles IS
  'Extended user identity profile linked 1:1 with auth.users. Source of truth for user-facing identity data.';

COMMENT ON COLUMN public.profiles.id IS 'Primary key; mirrors auth.users.id.';
COMMENT ON COLUMN public.profiles.phone IS 'E.164 phone number synced from auth or user input.';
COMMENT ON COLUMN public.profiles.email IS 'Optional email address for notifications and account recovery.';
COMMENT ON COLUMN public.profiles.first_name IS 'User given name.';
COMMENT ON COLUMN public.profiles.last_name IS 'User family name.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Public URL to the user profile image.';
COMMENT ON COLUMN public.profiles.language IS 'Preferred UI language code, e.g. tr or en-US.';
COMMENT ON COLUMN public.profiles.country IS 'ISO 3166-1 alpha-2 country code, e.g. TR.';
COMMENT ON COLUMN public.profiles.city IS 'Primary city associated with the user profile.';
COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone identifier, e.g. Europe/Istanbul.';
COMMENT ON COLUMN public.profiles.created_at IS 'Timestamp when the profile row was created.';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp when the profile row was last updated.';

CREATE UNIQUE INDEX profiles_phone_unique_idx
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX profiles_email_unique_idx
  ON public.profiles (email)
  WHERE email IS NOT NULL;

CREATE INDEX profiles_country_city_idx
  ON public.profiles (country, city);

CREATE INDEX profiles_language_idx
  ON public.profiles (language);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. roles
-- ---------------------------------------------------------------------------

CREATE TABLE identity.roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  description TEXT,
  is_system   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT roles_name_not_empty_chk
    CHECK (char_length(trim(name)) > 0),

  CONSTRAINT roles_slug_format_chk
    CHECK (slug ~ '^[a-z][a-z0-9_]*$')
);

COMMENT ON TABLE identity.roles IS
  'Role catalog for RBAC. System roles are immutable and seeded at migration time.';

COMMENT ON COLUMN identity.roles.id IS 'Primary key for the role.';
COMMENT ON COLUMN identity.roles.name IS 'Human-readable role name.';
COMMENT ON COLUMN identity.roles.slug IS 'Stable machine-readable role identifier.';
COMMENT ON COLUMN identity.roles.description IS 'Optional description of role purpose and scope.';
COMMENT ON COLUMN identity.roles.is_system IS 'When true, role cannot be deleted or renamed by admins.';
COMMENT ON COLUMN identity.roles.is_active IS 'Inactive roles are ignored during authorization checks.';
COMMENT ON COLUMN identity.roles.created_at IS 'Timestamp when the role was created.';
COMMENT ON COLUMN identity.roles.updated_at IS 'Timestamp when the role was last updated.';

CREATE UNIQUE INDEX roles_name_unique_idx
  ON identity.roles (lower(name));

CREATE UNIQUE INDEX roles_slug_unique_idx
  ON identity.roles (slug);

CREATE INDEX roles_active_idx
  ON identity.roles (is_active)
  WHERE is_active = TRUE;

CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON identity.roles
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. permissions
-- ---------------------------------------------------------------------------

CREATE TABLE identity.permissions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  resource    TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT permissions_name_not_empty_chk
    CHECK (char_length(trim(name)) > 0),

  CONSTRAINT permissions_slug_format_chk
    CHECK (slug ~ '^[a-z][a-z0-9_.-]*$'),

  CONSTRAINT permissions_resource_format_chk
    CHECK (resource ~ '^[a-z][a-z0-9_]*$'),

  CONSTRAINT permissions_action_format_chk
    CHECK (action ~ '^[a-z][a-z0-9_]*$')
);

COMMENT ON TABLE identity.permissions IS
  'Atomic permission catalog. Permissions are granted to roles, never directly to users.';

COMMENT ON COLUMN identity.permissions.id IS 'Primary key for the permission.';
COMMENT ON COLUMN identity.permissions.name IS 'Human-readable permission name.';
COMMENT ON COLUMN identity.permissions.slug IS 'Stable permission identifier, e.g. listings.create.';
COMMENT ON COLUMN identity.permissions.resource IS 'Protected resource namespace, e.g. listings.';
COMMENT ON COLUMN identity.permissions.action IS 'Allowed action on the resource, e.g. create.';
COMMENT ON COLUMN identity.permissions.description IS 'Optional description of permission behavior.';
COMMENT ON COLUMN identity.permissions.created_at IS 'Timestamp when the permission was created.';
COMMENT ON COLUMN identity.permissions.updated_at IS 'Timestamp when the permission was last updated.';

CREATE UNIQUE INDEX permissions_slug_unique_idx
  ON identity.permissions (slug);

CREATE UNIQUE INDEX permissions_resource_action_unique_idx
  ON identity.permissions (resource, action);

CREATE INDEX permissions_resource_idx
  ON identity.permissions (resource);

CREATE TRIGGER permissions_set_updated_at
  BEFORE UPDATE ON identity.permissions
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. role_permissions
-- ---------------------------------------------------------------------------

CREATE TABLE identity.role_permissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id         UUID        NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  permission_id   UUID        NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT role_permissions_unique_pair UNIQUE (role_id, permission_id)
);

COMMENT ON TABLE identity.role_permissions IS
  'Many-to-many mapping between roles and permissions.';

COMMENT ON COLUMN identity.role_permissions.id IS 'Primary key for the role-permission assignment.';
COMMENT ON COLUMN identity.role_permissions.role_id IS 'Foreign key to identity.roles.';
COMMENT ON COLUMN identity.role_permissions.permission_id IS 'Foreign key to identity.permissions.';
COMMENT ON COLUMN identity.role_permissions.created_at IS 'Timestamp when the permission was granted to the role.';

CREATE INDEX role_permissions_role_id_idx
  ON identity.role_permissions (role_id);

CREATE INDEX role_permissions_permission_id_idx
  ON identity.role_permissions (permission_id);

-- ---------------------------------------------------------------------------
-- 5. user_roles
-- ---------------------------------------------------------------------------

CREATE TABLE identity.user_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id     UUID        NOT NULL REFERENCES identity.roles(id) ON DELETE RESTRICT,
  assigned_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_roles_unique_pair UNIQUE (user_id, role_id),

  CONSTRAINT user_roles_expires_after_assign_chk
    CHECK (expires_at IS NULL OR expires_at > assigned_at)
);

COMMENT ON TABLE identity.user_roles IS
  'Role assignments for users. Supports optional temporal role grants via expires_at.';

COMMENT ON COLUMN identity.user_roles.id IS 'Primary key for the user-role assignment.';
COMMENT ON COLUMN identity.user_roles.user_id IS 'Foreign key to public.profiles.';
COMMENT ON COLUMN identity.user_roles.role_id IS 'Foreign key to identity.roles.';
COMMENT ON COLUMN identity.user_roles.assigned_by IS 'User who performed the role assignment.';
COMMENT ON COLUMN identity.user_roles.assigned_at IS 'Timestamp when the role was assigned.';
COMMENT ON COLUMN identity.user_roles.expires_at IS 'Optional expiration timestamp for temporary role grants.';
COMMENT ON COLUMN identity.user_roles.created_at IS 'Timestamp when the assignment row was created.';
COMMENT ON COLUMN identity.user_roles.updated_at IS 'Timestamp when the assignment row was last updated.';

CREATE INDEX user_roles_user_id_idx
  ON identity.user_roles (user_id);

CREATE INDEX user_roles_role_id_idx
  ON identity.user_roles (role_id);

CREATE INDEX user_roles_user_active_idx
  ON identity.user_roles (user_id, role_id)
  WHERE expires_at IS NULL;

CREATE INDEX user_roles_expires_at_idx
  ON identity.user_roles (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TRIGGER user_roles_set_updated_at
  BEFORE UPDATE ON identity.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. user_settings
-- ---------------------------------------------------------------------------

CREATE TABLE identity.user_settings (
  user_id                 UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme                   TEXT        NOT NULL DEFAULT 'system',
  currency                TEXT        NOT NULL DEFAULT 'TRY',
  date_format             TEXT        NOT NULL DEFAULT 'DD/MM/YYYY',
  measurement_unit        TEXT        NOT NULL DEFAULT 'metric',
  privacy_show_phone      BOOLEAN     NOT NULL DEFAULT FALSE,
  privacy_show_email      BOOLEAN     NOT NULL DEFAULT FALSE,
  privacy_show_location   BOOLEAN     NOT NULL DEFAULT TRUE,
  ai_assistant_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  marketing_consent       BOOLEAN     NOT NULL DEFAULT FALSE,
  analytics_consent       BOOLEAN     NOT NULL DEFAULT TRUE,
  kvkk_consent_at         TIMESTAMPTZ,
  metadata                JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_settings_theme_chk
    CHECK (theme IN ('light', 'dark', 'system')),

  CONSTRAINT user_settings_currency_chk
    CHECK (currency ~ '^[A-Z]{3}$'),

  CONSTRAINT user_settings_measurement_unit_chk
    CHECK (measurement_unit IN ('metric', 'imperial')),

  CONSTRAINT user_settings_metadata_object_chk
    CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE identity.user_settings IS
  'Per-user application settings, privacy controls, and consent timestamps.';

COMMENT ON COLUMN identity.user_settings.user_id IS 'Primary key and foreign key to public.profiles.';
COMMENT ON COLUMN identity.user_settings.theme IS 'UI theme preference: light, dark, or system.';
COMMENT ON COLUMN identity.user_settings.currency IS 'Preferred currency ISO 4217 code.';
COMMENT ON COLUMN identity.user_settings.date_format IS 'Preferred date display format.';
COMMENT ON COLUMN identity.user_settings.measurement_unit IS 'Preferred measurement system.';
COMMENT ON COLUMN identity.user_settings.privacy_show_phone IS 'Whether phone number is visible to other users.';
COMMENT ON COLUMN identity.user_settings.privacy_show_email IS 'Whether email is visible to other users.';
COMMENT ON COLUMN identity.user_settings.privacy_show_location IS 'Whether city/location is visible to other users.';
COMMENT ON COLUMN identity.user_settings.ai_assistant_enabled IS 'Whether AI assistant features are enabled.';
COMMENT ON COLUMN identity.user_settings.marketing_consent IS 'Whether marketing communications are allowed.';
COMMENT ON COLUMN identity.user_settings.analytics_consent IS 'Whether product analytics collection is allowed.';
COMMENT ON COLUMN identity.user_settings.kvkk_consent_at IS 'Timestamp when KVKK consent was recorded.';
COMMENT ON COLUMN identity.user_settings.metadata IS 'Extensible JSON settings payload.';
COMMENT ON COLUMN identity.user_settings.created_at IS 'Timestamp when settings were created.';
COMMENT ON COLUMN identity.user_settings.updated_at IS 'Timestamp when settings were last updated.';

CREATE INDEX user_settings_marketing_consent_idx
  ON identity.user_settings (marketing_consent)
  WHERE marketing_consent = TRUE;

CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON identity.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. notification_preferences
-- ---------------------------------------------------------------------------

CREATE TABLE identity.notification_preferences (
  user_id                   UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled              BOOLEAN     NOT NULL DEFAULT TRUE,
  sms_enabled               BOOLEAN     NOT NULL DEFAULT TRUE,
  email_enabled             BOOLEAN     NOT NULL DEFAULT FALSE,
  in_app_enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_messages           BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_price_alerts       BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_listing_matches    BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_listing_updates    BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_reviews            BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_promotions         BOOLEAN     NOT NULL DEFAULT FALSE,
  notify_system             BOOLEAN     NOT NULL DEFAULT TRUE,
  quiet_hours_enabled       BOOLEAN     NOT NULL DEFAULT FALSE,
  quiet_hours_start         TIME,
  quiet_hours_end           TIME,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notification_preferences_quiet_hours_chk
    CHECK (
      quiet_hours_enabled = FALSE
      OR (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
    )
);

COMMENT ON TABLE identity.notification_preferences IS
  'Per-user notification channel and event-type preferences.';

COMMENT ON COLUMN identity.notification_preferences.user_id IS 'Primary key and foreign key to public.profiles.';
COMMENT ON COLUMN identity.notification_preferences.push_enabled IS 'Master toggle for push notifications.';
COMMENT ON COLUMN identity.notification_preferences.sms_enabled IS 'Master toggle for SMS notifications.';
COMMENT ON COLUMN identity.notification_preferences.email_enabled IS 'Master toggle for email notifications.';
COMMENT ON COLUMN identity.notification_preferences.in_app_enabled IS 'Master toggle for in-app notifications.';
COMMENT ON COLUMN identity.notification_preferences.notify_messages IS 'Notify on new chat messages.';
COMMENT ON COLUMN identity.notification_preferences.notify_price_alerts IS 'Notify on saved-search price alerts.';
COMMENT ON COLUMN identity.notification_preferences.notify_listing_matches IS 'Notify on new listing matches.';
COMMENT ON COLUMN identity.notification_preferences.notify_listing_updates IS 'Notify on listing status changes.';
COMMENT ON COLUMN identity.notification_preferences.notify_reviews IS 'Notify on new reviews and replies.';
COMMENT ON COLUMN identity.notification_preferences.notify_promotions IS 'Notify on promotional campaigns.';
COMMENT ON COLUMN identity.notification_preferences.notify_system IS 'Notify on system and security events.';
COMMENT ON COLUMN identity.notification_preferences.quiet_hours_enabled IS 'Whether quiet hours suppression is active.';
COMMENT ON COLUMN identity.notification_preferences.quiet_hours_start IS 'Local quiet hours start time.';
COMMENT ON COLUMN identity.notification_preferences.quiet_hours_end IS 'Local quiet hours end time.';
COMMENT ON COLUMN identity.notification_preferences.created_at IS 'Timestamp when preferences were created.';
COMMENT ON COLUMN identity.notification_preferences.updated_at IS 'Timestamp when preferences were last updated.';

CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON identity.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. audit_logs
-- ---------------------------------------------------------------------------

CREATE TABLE identity.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,
  resource_type   TEXT        NOT NULL,
  resource_id     UUID,
  old_values      JSONB,
  new_values      JSONB,
  metadata        JSONB       NOT NULL DEFAULT '{}'::JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT audit_logs_action_not_empty_chk
    CHECK (char_length(trim(action)) > 0),

  CONSTRAINT audit_logs_resource_type_not_empty_chk
    CHECK (char_length(trim(resource_type)) > 0),

  CONSTRAINT audit_logs_metadata_object_chk
    CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE identity.audit_logs IS
  'Append-only security and compliance audit trail for identity-domain mutations.';

COMMENT ON COLUMN identity.audit_logs.id IS 'Primary key for the audit event.';
COMMENT ON COLUMN identity.audit_logs.user_id IS 'Actor who performed the action; NULL for system events.';
COMMENT ON COLUMN identity.audit_logs.action IS 'Action identifier, e.g. profile.update or role.assign.';
COMMENT ON COLUMN identity.audit_logs.resource_type IS 'Affected resource type, e.g. profile or role.';
COMMENT ON COLUMN identity.audit_logs.resource_id IS 'UUID of the affected resource, when applicable.';
COMMENT ON COLUMN identity.audit_logs.old_values IS 'Previous state snapshot for update/delete actions.';
COMMENT ON COLUMN identity.audit_logs.new_values IS 'New state snapshot for create/update actions.';
COMMENT ON COLUMN identity.audit_logs.metadata IS 'Additional context such as request_id or source.';
COMMENT ON COLUMN identity.audit_logs.ip_address IS 'Origin IP address of the request.';
COMMENT ON COLUMN identity.audit_logs.user_agent IS 'User agent string of the client.';
COMMENT ON COLUMN identity.audit_logs.created_at IS 'Timestamp when the audit event was recorded.';

CREATE INDEX audit_logs_user_id_created_at_idx
  ON identity.audit_logs (user_id, created_at DESC);

CREATE INDEX audit_logs_resource_idx
  ON identity.audit_logs (resource_type, resource_id);

CREATE INDEX audit_logs_action_created_at_idx
  ON identity.audit_logs (action, created_at DESC);

CREATE INDEX audit_logs_created_at_idx
  ON identity.audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Audit writer
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION identity.write_audit_log(
  p_action        TEXT,
  p_resource_type TEXT,
  p_resource_id   UUID DEFAULT NULL,
  p_old_values    JSONB DEFAULT NULL,
  p_new_values    JSONB DEFAULT NULL,
  p_metadata      JSONB DEFAULT '{}'::JSONB,
  p_ip_address    INET DEFAULT NULL,
  p_user_agent    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, public, auth
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO identity.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    COALESCE(p_metadata, '{}'::JSONB),
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

COMMENT ON FUNCTION identity.write_audit_log IS
  'Inserts an audit log row on behalf of the current authenticated user.';

-- ---------------------------------------------------------------------------
-- Auth bootstrap: profile + defaults on signup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION identity.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, public, auth
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  INSERT INTO public.profiles (
    id,
    phone,
    email,
    language,
    country,
    timezone
  )
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'language', 'tr'),
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'TR'),
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'Europe/Istanbul')
  );

  INSERT INTO identity.user_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO identity.notification_preferences (user_id)
  VALUES (NEW.id);

  SELECT id
  INTO v_role_id
  FROM identity.roles
  WHERE slug = 'individual'
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO identity.user_roles (user_id, role_id)
    VALUES (NEW.id, v_role_id);
  END IF;

  PERFORM identity.write_audit_log(
    p_action        => 'profile.create',
    p_resource_type => 'profile',
    p_resource_id   => NEW.id,
    p_new_values    => jsonb_build_object(
      'phone', NEW.phone,
      'email', NEW.email
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION identity.handle_new_user() IS
  'Creates profile, default settings, notification preferences, and base role when auth.users row is inserted.';

CREATE TRIGGER on_auth_user_created_identity_bootstrap
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION identity.handle_new_user();

-- ---------------------------------------------------------------------------
-- Profile audit trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION identity.audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, public, auth
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM identity.write_audit_log(
      p_action        => 'profile.update',
      p_resource_type => 'profile',
      p_resource_id   => NEW.id,
      p_old_values    => to_jsonb(OLD),
      p_new_values    => to_jsonb(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_audit_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION identity.audit_profile_changes();

-- ---------------------------------------------------------------------------
-- Seed: system roles
-- ---------------------------------------------------------------------------

INSERT INTO identity.roles (name, slug, description, is_system)
VALUES
  ('Individual', 'individual', 'Standard consumer account.', TRUE),
  ('Dealer', 'dealer', 'Verified automotive dealer account.', TRUE),
  ('Fleet Manager', 'fleet_manager', 'Corporate fleet operator account.', TRUE),
  ('Moderator', 'moderator', 'Content and listing moderation staff.', TRUE),
  ('Admin', 'admin', 'Platform administrator with elevated access.', TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: permissions
-- ---------------------------------------------------------------------------

INSERT INTO identity.permissions (name, slug, resource, action, description)
VALUES
  ('Read Own Profile', 'profile.read_own', 'profile', 'read_own', 'Read own profile data.'),
  ('Update Own Profile', 'profile.update_own', 'profile', 'update_own', 'Update own profile data.'),
  ('Read Public Profiles', 'profile.read_public', 'profile', 'read_public', 'Read public profile fields of other users.'),
  ('Manage User Roles', 'roles.manage', 'roles', 'manage', 'Assign and revoke user roles.'),
  ('Read Audit Logs', 'audit.read', 'audit', 'read', 'Read audit log entries.'),
  ('Manage Listings Own', 'listings.manage_own', 'listings', 'manage_own', 'Create and manage own listings.'),
  ('Manage Listings All', 'listings.manage_all', 'listings', 'manage_all', 'Manage all platform listings.'),
  ('Moderate Content', 'content.moderate', 'content', 'moderate', 'Moderate user-generated content.')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed: role_permissions
-- ---------------------------------------------------------------------------

INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
CROSS JOIN identity.permissions p
WHERE r.slug = 'individual'
  AND p.slug IN ('profile.read_own', 'profile.update_own', 'profile.read_public', 'listings.manage_own')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
CROSS JOIN identity.permissions p
WHERE r.slug = 'dealer'
  AND p.slug IN ('profile.read_own', 'profile.update_own', 'profile.read_public', 'listings.manage_own')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
CROSS JOIN identity.permissions p
WHERE r.slug = 'fleet_manager'
  AND p.slug IN ('profile.read_own', 'profile.update_own', 'profile.read_public', 'listings.manage_own')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON TRUE
WHERE r.slug = 'moderator'
  AND p.slug IN ('profile.read_public', 'content.moderate', 'listings.manage_all', 'audit.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM identity.roles r
JOIN identity.permissions p ON TRUE
WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_select_public
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id <> auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_service_role_all
  ON public.profiles
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- roles
CREATE POLICY roles_select_authenticated
  ON identity.roles
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY roles_manage_admin
  ON identity.roles
  FOR ALL
  TO authenticated
  USING (identity.user_has_role('admin'))
  WITH CHECK (identity.user_has_role('admin'));

CREATE POLICY roles_service_role_all
  ON identity.roles
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- permissions
CREATE POLICY permissions_select_authenticated
  ON identity.permissions
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY permissions_manage_admin
  ON identity.permissions
  FOR ALL
  TO authenticated
  USING (identity.user_has_role('admin'))
  WITH CHECK (identity.user_has_role('admin'));

CREATE POLICY permissions_service_role_all
  ON identity.permissions
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- role_permissions
CREATE POLICY role_permissions_select_authenticated
  ON identity.role_permissions
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY role_permissions_manage_admin
  ON identity.role_permissions
  FOR ALL
  TO authenticated
  USING (identity.user_has_role('admin'))
  WITH CHECK (identity.user_has_role('admin'));

CREATE POLICY role_permissions_service_role_all
  ON identity.role_permissions
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- user_roles
CREATE POLICY user_roles_select_own
  ON identity.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_roles_select_admin
  ON identity.user_roles
  FOR SELECT
  TO authenticated
  USING (identity.user_has_role('admin'));

CREATE POLICY user_roles_manage_admin
  ON identity.user_roles
  FOR ALL
  TO authenticated
  USING (identity.user_has_role('admin'))
  WITH CHECK (identity.user_has_role('admin'));

CREATE POLICY user_roles_service_role_all
  ON identity.user_roles
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- user_settings
CREATE POLICY user_settings_select_own
  ON identity.user_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_settings_insert_own
  ON identity.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_settings_update_own
  ON identity.user_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_settings_service_role_all
  ON identity.user_settings
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- notification_preferences
CREATE POLICY notification_preferences_select_own
  ON identity.notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notification_preferences_insert_own
  ON identity.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_update_own
  ON identity.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_service_role_all
  ON identity.notification_preferences
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- audit_logs
CREATE POLICY audit_logs_select_own
  ON identity.audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY audit_logs_select_admin
  ON identity.audit_logs
  FOR SELECT
  TO authenticated
  USING (identity.user_has_permission('audit.read'));

CREATE POLICY audit_logs_insert_authenticated
  ON identity.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY audit_logs_service_role_all
  ON identity.audit_logs
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON identity.roles TO authenticated;
GRANT SELECT ON identity.permissions TO authenticated;
GRANT SELECT ON identity.role_permissions TO authenticated;
GRANT SELECT ON identity.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON identity.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON identity.notification_preferences TO authenticated;
GRANT SELECT, INSERT ON identity.audit_logs TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA identity TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity TO service_role;

COMMIT;
