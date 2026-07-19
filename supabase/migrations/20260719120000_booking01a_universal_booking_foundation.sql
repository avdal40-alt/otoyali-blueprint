-- BOOKING-01A: universal booking domain foundation.
-- Backend/domain only: no customer booking UI, provider calendar UI,
-- notifications, payments, work orders, CRM, fake slots, or fake providers.

CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS booking;
GRANT USAGE ON SCHEMA booking TO anon, authenticated, service_role;

ALTER TABLE service_marketplace.branches
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_branches_timezone_not_empty_chk') THEN
    ALTER TABLE service_marketplace.branches
      ADD CONSTRAINT service_branches_timezone_not_empty_chk
      CHECK (char_length(btrim(timezone)) > 0 AND char_length(timezone) <= 80);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_branches_id_provider_unique') THEN
    ALTER TABLE service_marketplace.branches
      ADD CONSTRAINT service_branches_id_provider_unique UNIQUE (id, provider_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_offerings_id_branch_unique') THEN
    ALTER TABLE service_marketplace.offerings
      ADD CONSTRAINT service_offerings_id_branch_unique UNIQUE (id, branch_id);
  END IF;
END;
$$;

CREATE TABLE booking.bookable_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_marketplace.providers(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT booking_resources_branch_provider_fk
    FOREIGN KEY (branch_id, provider_id)
    REFERENCES service_marketplace.branches(id, provider_id)
    ON DELETE CASCADE,
  CONSTRAINT booking_resources_type_format_chk CHECK (resource_type ~ '^[a-z0-9_]{2,64}$'),
  CONSTRAINT booking_resources_name_length_chk CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT booking_resources_description_length_chk CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT booking_resources_capacity_positive_chk CHECK (capacity > 0),
  CONSTRAINT booking_resources_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE booking.offering_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES service_marketplace.offerings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES booking.bookable_resources(id) ON DELETE CASCADE,
  priority INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT booking_offering_resources_priority_chk CHECK (priority IS NULL OR priority >= 0)
);

CREATE TABLE booking.offering_booking_configurations (
  offering_id UUID PRIMARY KEY REFERENCES service_marketplace.offerings(id) ON DELETE CASCADE,
  booking_enabled BOOLEAN NOT NULL DEFAULT false,
  booking_mode TEXT NOT NULL DEFAULT 'request',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  preparation_minutes INTEGER NOT NULL DEFAULT 0,
  cleanup_minutes INTEGER NOT NULL DEFAULT 0,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
  minimum_notice_minutes INTEGER NOT NULL DEFAULT 120,
  maximum_advance_days INTEGER NOT NULL DEFAULT 30,
  cancellation_cutoff_minutes INTEGER,
  reschedule_cutoff_minutes INTEGER,
  requires_vehicle BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_config_mode_chk CHECK (booking_mode IN ('request', 'instant_confirmation', 'provider_created')),
  CONSTRAINT booking_config_duration_positive_chk CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  CONSTRAINT booking_config_buffers_non_negative_chk CHECK (preparation_minutes >= 0 AND cleanup_minutes >= 0),
  CONSTRAINT booking_config_slot_interval_positive_chk CHECK (slot_interval_minutes > 0 AND slot_interval_minutes <= 240),
  CONSTRAINT booking_config_min_notice_non_negative_chk CHECK (minimum_notice_minutes >= 0),
  CONSTRAINT booking_config_max_advance_bounded_chk CHECK (maximum_advance_days BETWEEN 1 AND 180),
  CONSTRAINT booking_config_cutoffs_non_negative_chk CHECK (
    (cancellation_cutoff_minutes IS NULL OR cancellation_cutoff_minutes >= 0)
    AND (reschedule_cutoff_minutes IS NULL OR reschedule_cutoff_minutes >= 0)
  )
);

CREATE TABLE booking.recurring_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES booking.bookable_resources(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  local_start_time TIME NOT NULL,
  local_end_time TIME NOT NULL,
  effective_from DATE,
  effective_until DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT booking_working_hours_day_chk CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT booking_working_hours_same_day_chk CHECK (local_end_time > local_start_time),
  CONSTRAINT booking_working_hours_effective_range_chk CHECK (
    effective_from IS NULL OR effective_until IS NULL OR effective_until >= effective_from
  )
);

CREATE TABLE booking.availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES booking.bookable_resources(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER,
  reason TEXT,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT booking_exceptions_type_chk CHECK (exception_type IN ('unavailable', 'available_override', 'capacity_override')),
  CONSTRAINT booking_exceptions_time_range_chk CHECK (end_at > start_at),
  CONSTRAINT booking_exceptions_capacity_chk CHECK (
    (exception_type = 'capacity_override' AND capacity IS NOT NULL AND capacity > 0)
    OR (exception_type <> 'capacity_override' AND capacity IS NULL)
  ),
  CONSTRAINT booking_exceptions_reason_length_chk CHECK (reason IS NULL OR char_length(reason) <= 500)
);

CREATE TABLE booking.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference TEXT NOT NULL UNIQUE,
  provider_id UUID NOT NULL REFERENCES service_marketplace.providers(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL,
  offering_id UUID NOT NULL,
  customer_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  vehicle_id UUID REFERENCES vehicle.vehicle_profiles(id) ON DELETE SET NULL,
  booking_mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_start_at TIMESTAMPTZ NOT NULL,
  requested_end_at TIMESTAMPTZ NOT NULL,
  confirmed_start_at TIMESTAMPTZ,
  confirmed_end_at TIMESTAMPTZ,
  timezone TEXT NOT NULL,
  created_by_type TEXT NOT NULL,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_notes TEXT,
  provider_notes TEXT,
  cancellation_reason TEXT,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT booking_bookings_branch_provider_fk
    FOREIGN KEY (branch_id, provider_id)
    REFERENCES service_marketplace.branches(id, provider_id)
    ON DELETE RESTRICT,
  CONSTRAINT booking_bookings_offering_branch_fk
    FOREIGN KEY (offering_id, branch_id)
    REFERENCES service_marketplace.offerings(id, branch_id)
    ON DELETE RESTRICT,
  CONSTRAINT booking_bookings_public_reference_format_chk CHECK (public_reference ~ '^BKG-[A-F0-9]{12}$'),
  CONSTRAINT booking_bookings_mode_chk CHECK (booking_mode IN ('request', 'instant_confirmation', 'provider_created')),
  CONSTRAINT booking_bookings_status_chk CHECK (status IN ('requested', 'pending_confirmation', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'rejected', 'no_show')),
  CONSTRAINT booking_bookings_requested_interval_chk CHECK (requested_end_at > requested_start_at),
  CONSTRAINT booking_bookings_confirmed_interval_chk CHECK (
    (confirmed_start_at IS NULL AND confirmed_end_at IS NULL)
    OR (confirmed_start_at IS NOT NULL AND confirmed_end_at IS NOT NULL AND confirmed_end_at > confirmed_start_at)
  ),
  CONSTRAINT booking_bookings_timezone_length_chk CHECK (char_length(btrim(timezone)) BETWEEN 1 AND 80),
  CONSTRAINT booking_bookings_created_by_type_chk CHECK (created_by_type IN ('customer', 'provider', 'admin', 'system')),
  CONSTRAINT booking_bookings_customer_name_length_chk CHECK (customer_name IS NULL OR char_length(btrim(customer_name)) BETWEEN 2 AND 160),
  CONSTRAINT booking_bookings_customer_phone_length_chk CHECK (customer_phone IS NULL OR char_length(btrim(customer_phone)) BETWEEN 8 AND 32),
  CONSTRAINT booking_bookings_customer_email_format_chk CHECK (customer_email IS NULL OR customer_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT booking_bookings_notes_length_chk CHECK (
    (customer_notes IS NULL OR char_length(customer_notes) <= 1600)
    AND (provider_notes IS NULL OR char_length(provider_notes) <= 1600)
    AND (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 800)
  ),
  CONSTRAINT booking_bookings_idempotency_key_chk CHECK (idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$')
);

CREATE TABLE booking.resource_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES booking.bookable_resources(id) ON DELETE RESTRICT,
  blocking_start_at TIMESTAMPTZ NOT NULL,
  blocking_end_at TIMESTAMPTZ NOT NULL,
  capacity_units INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  CONSTRAINT booking_reservations_interval_chk CHECK (blocking_end_at > blocking_start_at),
  CONSTRAINT booking_reservations_capacity_units_chk CHECK (capacity_units = 1),
  CONSTRAINT booking_reservations_release_reason_length_chk CHECK (release_reason IS NULL OR char_length(release_reason) <= 500)
);

CREATE TABLE booking.booking_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT booking_timeline_event_type_chk CHECK (event_type IN ('booking_created', 'status_changed', 'reservation_released')),
  CONSTRAINT booking_timeline_from_status_chk CHECK (from_status IS NULL OR from_status IN ('requested', 'pending_confirmation', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'rejected', 'no_show')),
  CONSTRAINT booking_timeline_to_status_chk CHECK (to_status IS NULL OR to_status IN ('requested', 'pending_confirmation', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'rejected', 'no_show')),
  CONSTRAINT booking_timeline_actor_type_chk CHECK (actor_type IN ('customer', 'provider', 'admin', 'system')),
  CONSTRAINT booking_timeline_reason_length_chk CHECK (reason IS NULL OR char_length(reason) <= 800),
  CONSTRAINT booking_timeline_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS booking_resources_provider_idx ON booking.bookable_resources (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS booking_resources_branch_idx ON booking.bookable_resources (branch_id, active);
CREATE INDEX IF NOT EXISTS booking_resources_active_idx ON booking.bookable_resources (branch_id, resource_type) WHERE active = true AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS booking_offering_resources_offering_idx ON booking.offering_resources (offering_id, active, priority);
CREATE INDEX IF NOT EXISTS booking_offering_resources_resource_idx ON booking.offering_resources (resource_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS booking_offering_resources_active_unique_idx
  ON booking.offering_resources (offering_id, resource_id)
  WHERE active = true AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS booking_config_enabled_idx ON booking.offering_booking_configurations (booking_enabled, booking_mode);
CREATE INDEX IF NOT EXISTS booking_working_hours_resource_day_idx ON booking.recurring_working_hours (resource_id, day_of_week, active);
CREATE INDEX IF NOT EXISTS booking_working_hours_effective_idx
  ON booking.recurring_working_hours (resource_id, effective_from, effective_until)
  WHERE active = true AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS booking_exceptions_resource_time_idx
  ON booking.availability_exceptions USING gist (resource_id, tstzrange(start_at, end_at, '[)'))
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS booking_exceptions_type_idx
  ON booking.availability_exceptions (resource_id, exception_type, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS booking_bookings_customer_idx ON booking.bookings (customer_user_id, requested_start_at DESC);
CREATE INDEX IF NOT EXISTS booking_bookings_provider_idx ON booking.bookings (provider_id, requested_start_at DESC);
CREATE INDEX IF NOT EXISTS booking_bookings_branch_idx ON booking.bookings (branch_id, requested_start_at DESC);
CREATE INDEX IF NOT EXISTS booking_bookings_status_idx ON booking.bookings (status, requested_start_at DESC);
CREATE INDEX IF NOT EXISTS booking_bookings_requested_time_idx ON booking.bookings (requested_start_at, requested_end_at);
CREATE INDEX IF NOT EXISTS booking_bookings_confirmed_time_idx
  ON booking.bookings (confirmed_start_at, confirmed_end_at)
  WHERE confirmed_start_at IS NOT NULL AND confirmed_end_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_bookings_public_reference_idx ON booking.bookings (public_reference);
CREATE UNIQUE INDEX IF NOT EXISTS booking_bookings_scoped_idempotency_idx
  ON booking.bookings (created_by_type, created_by_user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND created_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_reservations_booking_idx ON booking.resource_reservations (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS booking_reservations_resource_time_idx
  ON booking.resource_reservations USING gist (resource_id, tstzrange(blocking_start_at, blocking_end_at, '[)'))
  WHERE released_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_reservations_no_overlap_capacity1_excl') THEN
    ALTER TABLE booking.resource_reservations
      ADD CONSTRAINT booking_reservations_no_overlap_capacity1_excl
      EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(blocking_start_at, blocking_end_at, '[)') WITH &&
      )
      WHERE (released_at IS NULL AND capacity_units = 1);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS booking_timeline_booking_event_idx ON booking.booking_timeline (booking_id, event_at DESC);

CREATE OR REPLACE FUNCTION booking.is_known_timezone(p_timezone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_timezone_names timezone_name
    WHERE timezone_name.name = p_timezone
  );
$$;

CREATE OR REPLACE FUNCTION booking.is_provider_owner(p_provider_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM service_marketplace.providers provider
    WHERE provider.id = p_provider_id
      AND provider.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION booking.can_manage_provider(p_provider_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, auth
AS $$
  SELECT COALESCE(public.is_admin(p_user_id), false)
    OR booking.is_provider_owner(p_provider_id, p_user_id);
$$;

CREATE OR REPLACE FUNCTION booking.can_manage_resource(p_resource_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking.bookable_resources resource
    WHERE resource.id = p_resource_id
      AND booking.can_manage_provider(resource.provider_id, p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION booking.can_manage_offering(p_offering_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM service_marketplace.offerings offering
    JOIN service_marketplace.branches branch ON branch.id = offering.branch_id
    WHERE offering.id = p_offering_id
      AND booking.can_manage_provider(branch.provider_id, p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION booking.can_manage_booking(p_booking_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking.bookings booking_row
    WHERE booking_row.id = p_booking_id
      AND booking.can_manage_provider(booking_row.provider_id, p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION booking.generate_public_reference()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = extensions, pg_catalog
AS $$
  SELECT 'BKG-' || upper(substr(replace(extensions.gen_random_uuid()::TEXT, '-', ''), 1, 12));
$$;

CREATE OR REPLACE FUNCTION booking.validate_service_branch_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
BEGIN
  NEW.timezone := btrim(NEW.timezone);
  IF NOT booking.is_known_timezone(NEW.timezone) THEN
    RAISE EXCEPTION 'Unknown branch timezone: %', NEW.timezone USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.validate_bookable_resource()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
BEGIN
  NEW.resource_type := lower(btrim(NEW.resource_type));
  NEW.name := regexp_replace(btrim(NEW.name), '\s+', ' ', 'g');
  NEW.description := NULLIF(regexp_replace(btrim(COALESCE(NEW.description, '')), '\s+', ' ', 'g'), '');
  NEW.metadata := COALESCE(NEW.metadata, '{}'::JSONB);

  IF NOT EXISTS (
    SELECT 1
    FROM service_marketplace.branches branch
    WHERE branch.id = NEW.branch_id
      AND branch.provider_id = NEW.provider_id
  ) THEN
    RAISE EXCEPTION 'bookable resource branch must belong to provider' USING ERRCODE = '23503';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.validate_offering_resource_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
DECLARE
  offering_scope RECORD;
  resource_scope RECORD;
BEGIN
  SELECT branch.provider_id, branch.id AS branch_id
  INTO offering_scope
  FROM service_marketplace.offerings offering
  JOIN service_marketplace.branches branch ON branch.id = offering.branch_id
  WHERE offering.id = NEW.offering_id;

  SELECT resource.provider_id, resource.branch_id
  INTO resource_scope
  FROM booking.bookable_resources resource
  WHERE resource.id = NEW.resource_id;

  IF offering_scope.provider_id IS NULL OR resource_scope.provider_id IS NULL THEN
    RAISE EXCEPTION 'offering-resource scope could not be resolved' USING ERRCODE = '23503';
  END IF;

  IF offering_scope.provider_id <> resource_scope.provider_id OR offering_scope.branch_id <> resource_scope.branch_id THEN
    RAISE EXCEPTION 'offering and resource must belong to the same provider branch' USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.validate_offering_booking_configuration()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM service_marketplace.offerings offering WHERE offering.id = NEW.offering_id) THEN
    RAISE EXCEPTION 'booking configuration offering does not exist' USING ERRCODE = '23503';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.validate_recurring_working_hour()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
BEGIN
  IF NEW.active = true AND NEW.archived_at IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM booking.recurring_working_hours existing
      WHERE existing.resource_id = NEW.resource_id
        AND existing.day_of_week = NEW.day_of_week
        AND existing.active = true
        AND existing.archived_at IS NULL
        AND existing.id <> NEW.id
        AND existing.local_start_time < NEW.local_end_time
        AND NEW.local_start_time < existing.local_end_time
        AND COALESCE(existing.effective_from, '-infinity'::DATE) <= COALESCE(NEW.effective_until, 'infinity'::DATE)
        AND COALESCE(NEW.effective_from, '-infinity'::DATE) <= COALESCE(existing.effective_until, 'infinity'::DATE)
    ) THEN
      RAISE EXCEPTION 'overlapping active working-hour rules are not allowed for the same resource/day/effective range' USING ERRCODE = '23P01';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.validate_availability_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, auth, pg_catalog
AS $$
BEGIN
  NEW.reason := NULLIF(regexp_replace(btrim(COALESCE(NEW.reason, '')), '\s+', ' ', 'g'), '');
  IF TG_OP = 'INSERT' AND NEW.created_by_user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.prepare_booking_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, public, pg_catalog
AS $$
DECLARE
  candidate TEXT;
BEGIN
  IF NEW.public_reference IS NULL OR btrim(NEW.public_reference) = '' THEN
    LOOP
      candidate := booking.generate_public_reference();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM booking.bookings existing WHERE existing.public_reference = candidate);
    END LOOP;
    NEW.public_reference := candidate;
  ELSE
    NEW.public_reference := upper(btrim(NEW.public_reference));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.validate_booking_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.public_reference IS DISTINCT FROM NEW.public_reference THEN
      RAISE EXCEPTION 'booking public_reference is immutable' USING ERRCODE = '23514';
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status
      AND COALESCE(current_setting('booking.allow_status_update', true), '') <> 'on' THEN
      RAISE EXCEPTION 'booking status must be changed through booking.transition_booking_status' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.timezone := btrim(NEW.timezone);
  IF NOT booking.is_known_timezone(NEW.timezone) THEN
    RAISE EXCEPTION 'Unknown booking timezone: %', NEW.timezone USING ERRCODE = '23514';
  END IF;

  NEW.customer_name := NULLIF(regexp_replace(btrim(COALESCE(NEW.customer_name, '')), '\s+', ' ', 'g'), '');
  NEW.customer_phone := NULLIF(regexp_replace(btrim(COALESCE(NEW.customer_phone, '')), '\s+', ' ', 'g'), '');
  NEW.customer_email := NULLIF(lower(btrim(COALESCE(NEW.customer_email, ''))), '');
  NEW.customer_notes := NULLIF(regexp_replace(btrim(COALESCE(NEW.customer_notes, '')), '\s+', ' ', 'g'), '');
  NEW.provider_notes := NULLIF(regexp_replace(btrim(COALESCE(NEW.provider_notes, '')), '\s+', ' ', 'g'), '');
  NEW.cancellation_reason := NULLIF(regexp_replace(btrim(COALESCE(NEW.cancellation_reason, '')), '\s+', ' ', 'g'), '');
  NEW.idempotency_key := NULLIF(btrim(COALESCE(NEW.idempotency_key, '')), '');

  IF NOT EXISTS (
    SELECT 1
    FROM service_marketplace.offerings offering
    JOIN service_marketplace.branches branch ON branch.id = offering.branch_id
    WHERE offering.id = NEW.offering_id
      AND branch.id = NEW.branch_id
      AND branch.provider_id = NEW.provider_id
  ) THEN
    RAISE EXCEPTION 'booking provider, branch, and offering scope is inconsistent' USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.validate_resource_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
DECLARE
  booking_scope RECORD;
  resource_scope RECORD;
BEGIN
  SELECT booking_row.provider_id, booking_row.branch_id
  INTO booking_scope
  FROM booking.bookings booking_row
  WHERE booking_row.id = NEW.booking_id;

  SELECT resource.provider_id, resource.branch_id, resource.capacity
  INTO resource_scope
  FROM booking.bookable_resources resource
  WHERE resource.id = NEW.resource_id;

  IF booking_scope.provider_id IS NULL OR resource_scope.provider_id IS NULL THEN
    RAISE EXCEPTION 'reservation scope could not be resolved' USING ERRCODE = '23503';
  END IF;

  IF booking_scope.provider_id <> resource_scope.provider_id OR booking_scope.branch_id <> resource_scope.branch_id THEN
    RAISE EXCEPTION 'reservation resource must belong to the booking provider branch' USING ERRCODE = '23514';
  END IF;

  IF resource_scope.capacity <> 1 OR NEW.capacity_units <> 1 THEN
    RAISE EXCEPTION 'BOOKING-01A guarantees reservations only for capacity-1 resources' USING ERRCODE = '23514';
  END IF;

  NEW.release_reason := NULLIF(regexp_replace(btrim(COALESCE(NEW.release_reason, '')), '\s+', ' ', 'g'), '');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.block_timeline_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, public, pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'booking timeline is append-only' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION booking.append_booking_created_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = booking, public, pg_catalog
AS $$
BEGIN
  INSERT INTO booking.booking_timeline (
    booking_id, event_type, from_status, to_status, actor_type, actor_user_id, event_at, reason, metadata
  ) VALUES (
    NEW.id, 'booking_created', NULL, NEW.status, NEW.created_by_type, NEW.created_by_user_id, NEW.created_at, NULL, '{}'::JSONB
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION booking.is_valid_status_transition(p_from_status TEXT, p_to_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (VALUES
      ('requested', 'pending_confirmation'),
      ('requested', 'confirmed'),
      ('requested', 'rejected'),
      ('requested', 'cancelled'),
      ('pending_confirmation', 'confirmed'),
      ('pending_confirmation', 'rejected'),
      ('pending_confirmation', 'cancelled'),
      ('confirmed', 'checked_in'),
      ('confirmed', 'cancelled'),
      ('confirmed', 'no_show'),
      ('checked_in', 'in_progress'),
      ('in_progress', 'completed')
    ) AS allowed(from_status, to_status)
    WHERE allowed.from_status = p_from_status
      AND allowed.to_status = p_to_status
  );
$$;

CREATE OR REPLACE FUNCTION booking.get_public_availability(
  p_offering_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ,
  p_slot_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  offering_id UUID,
  branch_id UUID,
  slot_start_at TIMESTAMPTZ,
  slot_end_at TIMESTAMPTZ,
  timezone TEXT,
  booking_mode TEXT,
  available_resource_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
DECLARE
  v_config RECORD;
  v_limit INTEGER;
  v_duration INTERVAL;
  v_preparation INTERVAL;
  v_cleanup INTERVAL;
  v_slot_interval INTERVAL;
BEGIN
  IF p_offering_id IS NULL OR p_range_start IS NULL OR p_range_end IS NULL THEN
    RAISE EXCEPTION 'offering_id, range_start, and range_end are required' USING ERRCODE = '22023';
  END IF;
  IF p_range_end <= p_range_start THEN
    RAISE EXCEPTION 'availability range end must be after start' USING ERRCODE = '22023';
  END IF;
  IF p_range_end - p_range_start > INTERVAL '31 days' THEN
    RAISE EXCEPTION 'availability range cannot exceed 31 days' USING ERRCODE = '22023';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_slot_limit, 100), 1), 500);

  SELECT
    provider.id AS provider_id,
    branch.id AS branch_id,
    branch.timezone,
    config.booking_mode,
    config.duration_minutes,
    config.preparation_minutes,
    config.cleanup_minutes,
    config.slot_interval_minutes,
    config.minimum_notice_minutes,
    config.maximum_advance_days
  INTO v_config
  FROM service_marketplace.offerings offering
  JOIN service_marketplace.branches branch ON branch.id = offering.branch_id
  JOIN service_marketplace.providers provider ON provider.id = branch.provider_id
  JOIN booking.offering_booking_configurations config ON config.offering_id = offering.id
  WHERE offering.id = p_offering_id
    AND provider.status = 'active'
    AND branch.status = 'active'
    AND offering.status = 'active'
    AND offering.booking_mode <> 'unavailable'
    AND config.booking_enabled = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_duration := make_interval(mins => v_config.duration_minutes);
  v_preparation := make_interval(mins => v_config.preparation_minutes);
  v_cleanup := make_interval(mins => v_config.cleanup_minutes);
  v_slot_interval := make_interval(mins => v_config.slot_interval_minutes);

  RETURN QUERY
  WITH eligible_resources AS (
    SELECT resource.id AS resource_id, resource.capacity, COALESCE(eligibility.priority, 1000) AS priority
    FROM booking.offering_resources eligibility
    JOIN booking.bookable_resources resource ON resource.id = eligibility.resource_id
    WHERE eligibility.offering_id = p_offering_id
      AND eligibility.active = true
      AND eligibility.archived_at IS NULL
      AND resource.provider_id = v_config.provider_id
      AND resource.branch_id = v_config.branch_id
      AND resource.active = true
      AND resource.archived_at IS NULL
      AND resource.capacity = 1
  ),
  local_days AS (
    SELECT generate_series(
      (p_range_start AT TIME ZONE v_config.timezone)::DATE,
      (p_range_end AT TIME ZONE v_config.timezone)::DATE,
      INTERVAL '1 day'
    )::DATE AS local_date
  ),
  schedule_windows AS (
    SELECT
      resource.resource_id,
      ((day.local_date + hours.local_start_time) AT TIME ZONE v_config.timezone) AS window_start_at,
      ((day.local_date + hours.local_end_time) AT TIME ZONE v_config.timezone) AS window_end_at
    FROM eligible_resources resource
    JOIN booking.recurring_working_hours hours ON hours.resource_id = resource.resource_id
    JOIN local_days day ON EXTRACT(ISODOW FROM day.local_date)::INTEGER = hours.day_of_week
    WHERE hours.active = true
      AND hours.archived_at IS NULL
      AND (hours.effective_from IS NULL OR hours.effective_from <= day.local_date)
      AND (hours.effective_until IS NULL OR hours.effective_until >= day.local_date)
  ),
  override_windows AS (
    SELECT exception.resource_id, exception.start_at AS window_start_at, exception.end_at AS window_end_at
    FROM booking.availability_exceptions exception
    JOIN eligible_resources resource ON resource.resource_id = exception.resource_id
    WHERE exception.exception_type = 'available_override'
      AND exception.archived_at IS NULL
      AND tstzrange(exception.start_at, exception.end_at, '[)') && tstzrange(p_range_start, p_range_end, '[)')
  ),
  candidate_windows AS (
    SELECT resource_id, window_start_at, window_end_at FROM schedule_windows
    UNION ALL
    SELECT resource_id, window_start_at, window_end_at FROM override_windows
  ),
  slot_candidates AS (
    SELECT
      window.resource_id,
      generated.slot_start_at,
      generated.slot_start_at + v_duration AS slot_end_at,
      generated.slot_start_at - v_preparation AS blocking_start_at,
      generated.slot_start_at + v_duration + v_cleanup AS blocking_end_at
    FROM candidate_windows window
    CROSS JOIN LATERAL generate_series(
      window.window_start_at + v_preparation,
      window.window_end_at - v_duration - v_cleanup,
      v_slot_interval
    ) AS generated(slot_start_at)
    WHERE window.window_end_at >= window.window_start_at + v_duration + v_preparation + v_cleanup
  ),
  effective_slots AS (
    SELECT
      slot.*,
      COALESCE((
        SELECT exception.capacity
        FROM booking.availability_exceptions exception
        WHERE exception.resource_id = slot.resource_id
          AND exception.exception_type = 'capacity_override'
          AND exception.archived_at IS NULL
          AND tstzrange(exception.start_at, exception.end_at, '[)') && tstzrange(slot.blocking_start_at, slot.blocking_end_at, '[)')
        ORDER BY exception.created_at DESC
        LIMIT 1
      ), resource.capacity) AS effective_capacity
    FROM slot_candidates slot
    JOIN eligible_resources resource ON resource.resource_id = slot.resource_id
  )
  SELECT
    p_offering_id,
    v_config.branch_id,
    slot.slot_start_at,
    slot.slot_end_at,
    v_config.timezone,
    v_config.booking_mode,
    COUNT(DISTINCT slot.resource_id)::INTEGER
  FROM effective_slots slot
  WHERE slot.slot_start_at >= p_range_start
    AND slot.slot_end_at <= p_range_end
    AND slot.slot_start_at >= now() + make_interval(mins => v_config.minimum_notice_minutes)
    AND slot.slot_start_at <= now() + make_interval(days => v_config.maximum_advance_days)
    AND slot.effective_capacity = 1
    AND NOT EXISTS (
      SELECT 1
      FROM booking.availability_exceptions exception
      WHERE exception.resource_id = slot.resource_id
        AND exception.exception_type = 'unavailable'
        AND exception.archived_at IS NULL
        AND tstzrange(exception.start_at, exception.end_at, '[)') && tstzrange(slot.blocking_start_at, slot.blocking_end_at, '[)')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM booking.resource_reservations reservation
      WHERE reservation.resource_id = slot.resource_id
        AND reservation.released_at IS NULL
        AND tstzrange(reservation.blocking_start_at, reservation.blocking_end_at, '[)') && tstzrange(slot.blocking_start_at, slot.blocking_end_at, '[)')
    )
  GROUP BY slot.slot_start_at, slot.slot_end_at
  ORDER BY slot.slot_start_at
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION booking.find_available_capacity1_resource(
  p_offering_id UUID,
  p_requested_start_at TIMESTAMPTZ,
  p_requested_end_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, pg_catalog
AS $$
DECLARE
  v_config RECORD;
  v_preparation INTERVAL;
  v_cleanup INTERVAL;
  v_resource_id UUID;
BEGIN
  SELECT provider.id AS provider_id, branch.id AS branch_id, branch.timezone, config.preparation_minutes, config.cleanup_minutes
  INTO v_config
  FROM service_marketplace.offerings offering
  JOIN service_marketplace.branches branch ON branch.id = offering.branch_id
  JOIN service_marketplace.providers provider ON provider.id = branch.provider_id
  JOIN booking.offering_booking_configurations config ON config.offering_id = offering.id
  WHERE offering.id = p_offering_id
    AND provider.status = 'active'
    AND branch.status = 'active'
    AND offering.status = 'active'
    AND offering.booking_mode <> 'unavailable'
    AND config.booking_enabled = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_preparation := make_interval(mins => v_config.preparation_minutes);
  v_cleanup := make_interval(mins => v_config.cleanup_minutes);

  WITH eligible_resources AS (
    SELECT resource.id AS resource_id, resource.capacity, COALESCE(eligibility.priority, 1000) AS priority
    FROM booking.offering_resources eligibility
    JOIN booking.bookable_resources resource ON resource.id = eligibility.resource_id
    WHERE eligibility.offering_id = p_offering_id
      AND eligibility.active = true
      AND eligibility.archived_at IS NULL
      AND resource.provider_id = v_config.provider_id
      AND resource.branch_id = v_config.branch_id
      AND resource.active = true
      AND resource.archived_at IS NULL
      AND resource.capacity = 1
  ),
  local_day AS (
    SELECT (p_requested_start_at AT TIME ZONE v_config.timezone)::DATE AS local_date
  ),
  schedule_windows AS (
    SELECT
      resource.resource_id,
      ((day.local_date + hours.local_start_time) AT TIME ZONE v_config.timezone) AS window_start_at,
      ((day.local_date + hours.local_end_time) AT TIME ZONE v_config.timezone) AS window_end_at
    FROM eligible_resources resource
    JOIN booking.recurring_working_hours hours ON hours.resource_id = resource.resource_id
    JOIN local_day day ON EXTRACT(ISODOW FROM day.local_date)::INTEGER = hours.day_of_week
    WHERE hours.active = true
      AND hours.archived_at IS NULL
      AND (hours.effective_from IS NULL OR hours.effective_from <= day.local_date)
      AND (hours.effective_until IS NULL OR hours.effective_until >= day.local_date)
  ),
  override_windows AS (
    SELECT exception.resource_id, exception.start_at AS window_start_at, exception.end_at AS window_end_at
    FROM booking.availability_exceptions exception
    JOIN eligible_resources resource ON resource.resource_id = exception.resource_id
    WHERE exception.exception_type = 'available_override'
      AND exception.archived_at IS NULL
      AND tstzrange(exception.start_at, exception.end_at, '[)') && tstzrange(p_requested_start_at - v_preparation, p_requested_end_at + v_cleanup, '[)')
  ),
  candidate_windows AS (
    SELECT resource_id, window_start_at, window_end_at FROM schedule_windows
    UNION ALL
    SELECT resource_id, window_start_at, window_end_at FROM override_windows
  ),
  feasible_resources AS (
    SELECT DISTINCT resource.resource_id, resource.priority
    FROM eligible_resources resource
    JOIN candidate_windows window ON window.resource_id = resource.resource_id
    WHERE p_requested_start_at - v_preparation >= window.window_start_at
      AND p_requested_end_at + v_cleanup <= window.window_end_at
      AND COALESCE((
        SELECT exception.capacity
        FROM booking.availability_exceptions exception
        WHERE exception.resource_id = resource.resource_id
          AND exception.exception_type = 'capacity_override'
          AND exception.archived_at IS NULL
          AND tstzrange(exception.start_at, exception.end_at, '[)') && tstzrange(p_requested_start_at - v_preparation, p_requested_end_at + v_cleanup, '[)')
        ORDER BY exception.created_at DESC
        LIMIT 1
      ), resource.capacity) = 1
      AND NOT EXISTS (
        SELECT 1
        FROM booking.availability_exceptions exception
        WHERE exception.resource_id = resource.resource_id
          AND exception.exception_type = 'unavailable'
          AND exception.archived_at IS NULL
          AND tstzrange(exception.start_at, exception.end_at, '[)') && tstzrange(p_requested_start_at - v_preparation, p_requested_end_at + v_cleanup, '[)')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM booking.resource_reservations reservation
        WHERE reservation.resource_id = resource.resource_id
          AND reservation.released_at IS NULL
          AND tstzrange(reservation.blocking_start_at, reservation.blocking_end_at, '[)') && tstzrange(p_requested_start_at - v_preparation, p_requested_end_at + v_cleanup, '[)')
      )
  )
  SELECT feasible.resource_id
  INTO v_resource_id
  FROM feasible_resources feasible
  ORDER BY feasible.priority, feasible.resource_id
  LIMIT 1;

  RETURN v_resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION booking.create_booking(
  p_offering_id UUID,
  p_requested_start_at TIMESTAMPTZ,
  p_booking_mode TEXT DEFAULT 'request',
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  public_reference TEXT,
  booking_status TEXT,
  requested_start_at TIMESTAMPTZ,
  requested_end_at TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_config RECORD;
  v_booking_mode TEXT := lower(btrim(COALESCE(p_booking_mode, 'request')));
  v_actor_type TEXT;
  v_status TEXT;
  v_requested_end_at TIMESTAMPTZ;
  v_resource_id UUID;
  v_booking_id UUID;
  v_public_reference TEXT;
  v_idempotency_key TEXT := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
  v_is_admin BOOLEAN;
  v_is_provider_owner BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'booking creation requires an authenticated actor' USING ERRCODE = '42501';
  END IF;
  IF p_offering_id IS NULL OR p_requested_start_at IS NULL THEN
    RAISE EXCEPTION 'offering_id and requested_start_at are required' USING ERRCODE = '22023';
  END IF;

  SELECT
    provider.id AS provider_id,
    branch.id AS branch_id,
    branch.timezone,
    config.booking_mode AS config_booking_mode,
    config.duration_minutes,
    config.preparation_minutes,
    config.cleanup_minutes,
    config.minimum_notice_minutes,
    config.maximum_advance_days,
    config.requires_vehicle
  INTO v_config
  FROM service_marketplace.offerings offering
  JOIN service_marketplace.branches branch ON branch.id = offering.branch_id
  JOIN service_marketplace.providers provider ON provider.id = branch.provider_id
  JOIN booking.offering_booking_configurations config ON config.offering_id = offering.id
  WHERE offering.id = p_offering_id
    AND provider.status = 'active'
    AND branch.status = 'active'
    AND offering.status = 'active'
    AND offering.booking_mode <> 'unavailable'
    AND config.booking_enabled = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offering is not bookable' USING ERRCODE = '23514';
  END IF;

  v_is_admin := public.is_admin(v_user_id);
  v_is_provider_owner := booking.is_provider_owner(v_config.provider_id, v_user_id);

  IF v_booking_mode NOT IN ('request', 'instant_confirmation', 'provider_created') THEN
    RAISE EXCEPTION 'invalid booking mode: %', v_booking_mode USING ERRCODE = '23514';
  END IF;
  IF v_booking_mode = 'instant_confirmation' AND v_config.config_booking_mode <> 'instant_confirmation' THEN
    RAISE EXCEPTION 'instant confirmation is not enabled for this offering' USING ERRCODE = '23514';
  END IF;
  IF v_booking_mode = 'provider_created' AND NOT (v_is_provider_owner OR v_is_admin) THEN
    RAISE EXCEPTION 'provider-created bookings require provider owner or admin scope' USING ERRCODE = '42501';
  END IF;
  IF v_booking_mode = 'request' AND v_config.config_booking_mode NOT IN ('request', 'instant_confirmation') THEN
    RAISE EXCEPTION 'request bookings are not enabled for this offering' USING ERRCODE = '23514';
  END IF;
  IF v_config.requires_vehicle = true AND p_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'vehicle_id is required for this offering' USING ERRCODE = '23514';
  END IF;

  v_requested_end_at := p_requested_start_at + make_interval(mins => v_config.duration_minutes);

  IF p_requested_start_at < now() + make_interval(mins => v_config.minimum_notice_minutes) THEN
    RAISE EXCEPTION 'requested time does not satisfy minimum notice' USING ERRCODE = '23514';
  END IF;
  IF p_requested_start_at > now() + make_interval(days => v_config.maximum_advance_days) THEN
    RAISE EXCEPTION 'requested time exceeds maximum booking horizon' USING ERRCODE = '23514';
  END IF;

  IF v_idempotency_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_user_id::TEXT), hashtext(v_idempotency_key));

    SELECT existing.id, existing.public_reference, existing.status, existing.requested_start_at, existing.requested_end_at
    INTO v_booking_id, v_public_reference, v_status, requested_start_at, requested_end_at
    FROM booking.bookings existing
    WHERE existing.created_by_type IN ('customer', 'provider', 'admin')
      AND existing.created_by_user_id = v_user_id
      AND existing.idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_booking_id IS NOT NULL THEN
      booking_id := v_booking_id;
      public_reference := v_public_reference;
      booking_status := v_status;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  v_resource_id := booking.find_available_capacity1_resource(p_offering_id, p_requested_start_at, v_requested_end_at);
  IF v_resource_id IS NULL THEN
    RAISE EXCEPTION 'requested time is not available' USING ERRCODE = '23P01';
  END IF;

  PERFORM 1 FROM booking.bookable_resources resource WHERE resource.id = v_resource_id FOR UPDATE;

  IF v_booking_mode IN ('instant_confirmation', 'provider_created') THEN
    v_status := 'confirmed';
  ELSE
    v_status := 'requested';
  END IF;

  IF v_is_admin THEN
    v_actor_type := 'admin';
  ELSIF v_booking_mode = 'provider_created' THEN
    v_actor_type := 'provider';
  ELSE
    v_actor_type := 'customer';
  END IF;

  INSERT INTO booking.bookings (
    provider_id, branch_id, offering_id, customer_user_id, customer_name, customer_phone,
    customer_email, vehicle_id, booking_mode, status, requested_start_at, requested_end_at,
    confirmed_start_at, confirmed_end_at, timezone, created_by_type, created_by_user_id,
    customer_notes, confirmed_at, idempotency_key
  ) VALUES (
    v_config.provider_id, v_config.branch_id, p_offering_id,
    CASE WHEN v_booking_mode = 'provider_created' THEN NULL ELSE v_user_id END,
    p_customer_name, p_customer_phone, p_customer_email, p_vehicle_id, v_booking_mode,
    v_status, p_requested_start_at, v_requested_end_at,
    CASE WHEN v_status = 'confirmed' THEN p_requested_start_at ELSE NULL END,
    CASE WHEN v_status = 'confirmed' THEN v_requested_end_at ELSE NULL END,
    v_config.timezone, v_actor_type, v_user_id, p_customer_notes,
    CASE WHEN v_status = 'confirmed' THEN now() ELSE NULL END,
    v_idempotency_key
  )
  RETURNING id, public_reference INTO v_booking_id, v_public_reference;

  INSERT INTO booking.resource_reservations (
    booking_id, resource_id, blocking_start_at, blocking_end_at, capacity_units
  ) VALUES (
    v_booking_id,
    v_resource_id,
    p_requested_start_at - make_interval(mins => v_config.preparation_minutes),
    v_requested_end_at + make_interval(mins => v_config.cleanup_minutes),
    1
  );

  booking_id := v_booking_id;
  public_reference := v_public_reference;
  booking_status := v_status;
  requested_start_at := p_requested_start_at;
  requested_end_at := v_requested_end_at;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION booking.transition_booking_status(
  p_booking_id UUID,
  p_to_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  booking_id UUID,
  from_status TEXT,
  to_status TEXT,
  event_id UUID,
  transitioned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = booking, service_marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_booking RECORD;
  v_to_status TEXT := lower(btrim(COALESCE(p_to_status, '')));
  v_actor_type TEXT;
  v_event_id UUID;
  v_now TIMESTAMPTZ := now();
  v_reason TEXT := NULLIF(regexp_replace(btrim(COALESCE(p_reason, '')), '\s+', ' ', 'g'), '');
  v_metadata JSONB := COALESCE(p_metadata, '{}'::JSONB);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'status transition requires an authenticated actor' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(v_metadata) <> 'object' THEN
    RAISE EXCEPTION 'metadata must be a JSON object' USING ERRCODE = '22023';
  END IF;

  SELECT
    booking_row.id,
    booking_row.provider_id,
    booking_row.customer_user_id,
    booking_row.status
  INTO v_booking
  FROM booking.bookings booking_row
  WHERE booking_row.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = '02000';
  END IF;

  IF public.is_admin(v_user_id) THEN
    v_actor_type := 'admin';
  ELSIF booking.is_provider_owner(v_booking.provider_id, v_user_id) THEN
    v_actor_type := 'provider';
  ELSIF v_booking.customer_user_id = v_user_id THEN
    v_actor_type := 'customer';
  ELSE
    RAISE EXCEPTION 'actor cannot manage this booking' USING ERRCODE = '42501';
  END IF;

  IF v_actor_type = 'customer' AND v_to_status <> 'cancelled' THEN
    RAISE EXCEPTION 'customers may only cancel their own bookings in BOOKING-01A' USING ERRCODE = '42501';
  END IF;
  IF NOT booking.is_valid_status_transition(v_booking.status, v_to_status) THEN
    RAISE EXCEPTION 'invalid booking status transition: % -> %', v_booking.status, v_to_status USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('booking.allow_status_update', 'on', true);

  UPDATE booking.bookings
  SET
    status = v_to_status,
    confirmed_start_at = CASE WHEN v_to_status = 'confirmed' AND confirmed_start_at IS NULL THEN requested_start_at ELSE confirmed_start_at END,
    confirmed_end_at = CASE WHEN v_to_status = 'confirmed' AND confirmed_end_at IS NULL THEN requested_end_at ELSE confirmed_end_at END,
    confirmed_at = CASE WHEN v_to_status = 'confirmed' AND confirmed_at IS NULL THEN v_now ELSE confirmed_at END,
    cancelled_at = CASE WHEN v_to_status = 'cancelled' THEN v_now ELSE cancelled_at END,
    checked_in_at = CASE WHEN v_to_status = 'checked_in' AND checked_in_at IS NULL THEN v_now ELSE checked_in_at END,
    started_at = CASE WHEN v_to_status = 'in_progress' AND started_at IS NULL THEN v_now ELSE started_at END,
    completed_at = CASE WHEN v_to_status = 'completed' AND completed_at IS NULL THEN v_now ELSE completed_at END,
    cancellation_reason = CASE WHEN v_to_status IN ('cancelled', 'rejected', 'no_show') THEN v_reason ELSE cancellation_reason END,
    updated_at = v_now
  WHERE id = v_booking.id;

  IF v_to_status IN ('cancelled', 'rejected', 'no_show') THEN
    UPDATE booking.resource_reservations
    SET released_at = COALESCE(released_at, v_now),
        release_reason = COALESCE(release_reason, v_to_status)
    WHERE resource_reservations.booking_id = v_booking.id
      AND released_at IS NULL;
  END IF;

  INSERT INTO booking.booking_timeline (
    booking_id, event_type, from_status, to_status, actor_type, actor_user_id, event_at, reason, metadata
  ) VALUES (
    v_booking.id, 'status_changed', v_booking.status, v_to_status, v_actor_type, v_user_id, v_now, v_reason, v_metadata
  )
  RETURNING id INTO v_event_id;

  booking_id := v_booking.id;
  from_status := v_booking.status;
  to_status := v_to_status;
  event_id := v_event_id;
  transitioned_at := v_now;
  RETURN NEXT;
END;
$$;

DROP TRIGGER IF EXISTS service_branches_validate_timezone ON service_marketplace.branches;
CREATE TRIGGER service_branches_validate_timezone
  BEFORE INSERT OR UPDATE OF timezone ON service_marketplace.branches
  FOR EACH ROW EXECUTE FUNCTION booking.validate_service_branch_timezone();

DROP TRIGGER IF EXISTS booking_resources_validate ON booking.bookable_resources;
CREATE TRIGGER booking_resources_validate
  BEFORE INSERT OR UPDATE ON booking.bookable_resources
  FOR EACH ROW EXECUTE FUNCTION booking.validate_bookable_resource();

DROP TRIGGER IF EXISTS booking_resources_set_updated_at ON booking.bookable_resources;
CREATE TRIGGER booking_resources_set_updated_at
  BEFORE UPDATE ON booking.bookable_resources
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

DROP TRIGGER IF EXISTS booking_offering_resources_validate ON booking.offering_resources;
CREATE TRIGGER booking_offering_resources_validate
  BEFORE INSERT OR UPDATE ON booking.offering_resources
  FOR EACH ROW EXECUTE FUNCTION booking.validate_offering_resource_scope();

DROP TRIGGER IF EXISTS booking_offering_resources_set_updated_at ON booking.offering_resources;
CREATE TRIGGER booking_offering_resources_set_updated_at
  BEFORE UPDATE ON booking.offering_resources
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

DROP TRIGGER IF EXISTS booking_configurations_validate ON booking.offering_booking_configurations;
CREATE TRIGGER booking_configurations_validate
  BEFORE INSERT OR UPDATE ON booking.offering_booking_configurations
  FOR EACH ROW EXECUTE FUNCTION booking.validate_offering_booking_configuration();

DROP TRIGGER IF EXISTS booking_configurations_set_updated_at ON booking.offering_booking_configurations;
CREATE TRIGGER booking_configurations_set_updated_at
  BEFORE UPDATE ON booking.offering_booking_configurations
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

DROP TRIGGER IF EXISTS booking_working_hours_validate ON booking.recurring_working_hours;
CREATE TRIGGER booking_working_hours_validate
  BEFORE INSERT OR UPDATE ON booking.recurring_working_hours
  FOR EACH ROW EXECUTE FUNCTION booking.validate_recurring_working_hour();

DROP TRIGGER IF EXISTS booking_working_hours_set_updated_at ON booking.recurring_working_hours;
CREATE TRIGGER booking_working_hours_set_updated_at
  BEFORE UPDATE ON booking.recurring_working_hours
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

DROP TRIGGER IF EXISTS booking_exceptions_validate ON booking.availability_exceptions;
CREATE TRIGGER booking_exceptions_validate
  BEFORE INSERT OR UPDATE ON booking.availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION booking.validate_availability_exception();

DROP TRIGGER IF EXISTS booking_exceptions_set_updated_at ON booking.availability_exceptions;
CREATE TRIGGER booking_exceptions_set_updated_at
  BEFORE UPDATE ON booking.availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

DROP TRIGGER IF EXISTS booking_bookings_prepare_reference ON booking.bookings;
CREATE TRIGGER booking_bookings_prepare_reference
  BEFORE INSERT ON booking.bookings
  FOR EACH ROW EXECUTE FUNCTION booking.prepare_booking_reference();

DROP TRIGGER IF EXISTS booking_bookings_validate ON booking.bookings;
CREATE TRIGGER booking_bookings_validate
  BEFORE INSERT OR UPDATE ON booking.bookings
  FOR EACH ROW EXECUTE FUNCTION booking.validate_booking_row();

DROP TRIGGER IF EXISTS booking_bookings_set_updated_at ON booking.bookings;
CREATE TRIGGER booking_bookings_set_updated_at
  BEFORE UPDATE ON booking.bookings
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

DROP TRIGGER IF EXISTS booking_bookings_created_timeline ON booking.bookings;
CREATE TRIGGER booking_bookings_created_timeline
  AFTER INSERT ON booking.bookings
  FOR EACH ROW EXECUTE FUNCTION booking.append_booking_created_event();

DROP TRIGGER IF EXISTS booking_reservations_validate ON booking.resource_reservations;
CREATE TRIGGER booking_reservations_validate
  BEFORE INSERT OR UPDATE ON booking.resource_reservations
  FOR EACH ROW EXECUTE FUNCTION booking.validate_resource_reservation();

DROP TRIGGER IF EXISTS booking_timeline_block_update ON booking.booking_timeline;
CREATE TRIGGER booking_timeline_block_update
  BEFORE UPDATE ON booking.booking_timeline
  FOR EACH ROW EXECUTE FUNCTION booking.block_timeline_mutation();

DROP TRIGGER IF EXISTS booking_timeline_block_delete ON booking.booking_timeline;
CREATE TRIGGER booking_timeline_block_delete
  BEFORE DELETE ON booking.booking_timeline
  FOR EACH ROW EXECUTE FUNCTION booking.block_timeline_mutation();

ALTER TABLE booking.bookable_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.offering_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.offering_booking_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.recurring_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.resource_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking.booking_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_resources_provider_manage
  ON booking.bookable_resources
  FOR ALL TO authenticated
  USING (booking.can_manage_provider(provider_id, auth.uid()))
  WITH CHECK (booking.can_manage_provider(provider_id, auth.uid()));

CREATE POLICY booking_resources_service_role_all
  ON booking.bookable_resources
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY booking_offering_resources_provider_manage
  ON booking.offering_resources
  FOR ALL TO authenticated
  USING (booking.can_manage_resource(resource_id, auth.uid()) AND booking.can_manage_offering(offering_id, auth.uid()))
  WITH CHECK (booking.can_manage_resource(resource_id, auth.uid()) AND booking.can_manage_offering(offering_id, auth.uid()));

CREATE POLICY booking_offering_resources_service_role_all
  ON booking.offering_resources
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY booking_configurations_provider_manage
  ON booking.offering_booking_configurations
  FOR ALL TO authenticated
  USING (booking.can_manage_offering(offering_id, auth.uid()))
  WITH CHECK (booking.can_manage_offering(offering_id, auth.uid()));

CREATE POLICY booking_configurations_service_role_all
  ON booking.offering_booking_configurations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY booking_working_hours_provider_manage
  ON booking.recurring_working_hours
  FOR ALL TO authenticated
  USING (booking.can_manage_resource(resource_id, auth.uid()))
  WITH CHECK (booking.can_manage_resource(resource_id, auth.uid()));

CREATE POLICY booking_working_hours_service_role_all
  ON booking.recurring_working_hours
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY booking_exceptions_provider_manage
  ON booking.availability_exceptions
  FOR ALL TO authenticated
  USING (booking.can_manage_resource(resource_id, auth.uid()))
  WITH CHECK (booking.can_manage_resource(resource_id, auth.uid()));

CREATE POLICY booking_exceptions_service_role_all
  ON booking.availability_exceptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY booking_bookings_select_customer_or_provider
  ON booking.bookings
  FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid() OR booking.can_manage_provider(provider_id, auth.uid()));

CREATE POLICY booking_bookings_service_role_all
  ON booking.bookings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY booking_reservations_select_provider
  ON booking.resource_reservations
  FOR SELECT TO authenticated
  USING (booking.can_manage_booking(booking_id, auth.uid()));

CREATE POLICY booking_reservations_service_role_all
  ON booking.resource_reservations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY booking_timeline_select_provider
  ON booking.booking_timeline
  FOR SELECT TO authenticated
  USING (booking.can_manage_booking(booking_id, auth.uid()));

CREATE POLICY booking_timeline_service_role_all
  ON booking.booking_timeline
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON booking.bookable_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON booking.offering_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON booking.offering_booking_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON booking.recurring_working_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE ON booking.availability_exceptions TO authenticated;
GRANT SELECT ON booking.bookings TO authenticated;
GRANT SELECT ON booking.resource_reservations TO authenticated;
GRANT SELECT ON booking.booking_timeline TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA booking TO service_role;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Revoke every
-- BOOKING-01A function explicitly, then grant only the direct-call surfaces that
-- the architecture needs. Trigger and validator functions are executed by
-- PostgreSQL internally and receive no direct client grants.
REVOKE ALL ON FUNCTION booking.is_known_timezone(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.is_provider_owner(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.can_manage_provider(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.can_manage_resource(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.can_manage_offering(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.can_manage_booking(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.generate_public_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_service_branch_timezone() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_bookable_resource() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_offering_resource_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_offering_booking_configuration() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_recurring_working_hour() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_availability_exception() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.prepare_booking_reference() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_booking_row() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.validate_resource_reservation() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.block_timeline_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.append_booking_created_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.is_valid_status_transition(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.get_public_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.find_available_capacity1_resource(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.create_booking(UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION booking.transition_booking_status(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION booking.get_public_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION booking.create_booking(UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION booking.transition_booking_status(UUID, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- These scope helpers are callable by authenticated only because the RLS
-- policies on provider-managed booking tables evaluate them for row access.
GRANT EXECUTE ON FUNCTION booking.can_manage_provider(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION booking.can_manage_resource(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION booking.can_manage_offering(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION booking.can_manage_booking(UUID, UUID) TO authenticated;

COMMENT ON SCHEMA booking IS 'Universal booking foundation for service resources, dynamic availability, reservations, bookings, and immutable lifecycle history.';
COMMENT ON TABLE booking.bookable_resources IS 'Private provider-owned capacity units such as bays, staff roles, equipment, demo vehicles, charging stations, or tow trucks. Not publicly exposed.';
COMMENT ON TABLE booking.offering_resources IS 'Eligibility links between canonical SERVICE-01 offerings and bookable resources in the same provider branch.';
COMMENT ON TABLE booking.offering_booking_configurations IS 'Typed booking configuration for canonical SERVICE-01 offerings. No pricing, payment, notification, or UI state.';
COMMENT ON TABLE booking.recurring_working_hours IS 'Weekly same-day local wall-clock working hours interpreted in the canonical branch timezone.';
COMMENT ON TABLE booking.availability_exceptions IS 'Private date-specific availability overrides. Reasons are not publicly exposed.';
COMMENT ON TABLE booking.bookings IS 'Canonical booking record with public reference, private contact snapshots, current status, and requested/confirmed intervals.';
COMMENT ON TABLE booking.resource_reservations IS 'Half-open resource blocking intervals. BOOKING-01A enforces overlap prevention for active capacity-1 reservations.';
COMMENT ON TABLE booking.booking_timeline IS 'Append-only booking lifecycle event history controlled by database triggers and transition functions.';
COMMENT ON FUNCTION booking.get_public_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) IS 'Safe public availability projection for active public SERVICE-01 offerings. Exposes only slot times and aggregate capacity, never raw resources.';
COMMENT ON FUNCTION booking.create_booking(UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) IS 'Atomic authenticated booking creation primitive with scoped idempotency and capacity-1 resource reservation.';
COMMENT ON FUNCTION booking.transition_booking_status(UUID, TEXT, TEXT, JSONB) IS 'Controlled status transition primitive that enforces the lifecycle matrix, appends timeline history, and releases reservations for terminal cancellations/rejections/no-shows.';

NOTIFY pgrst, 'reload schema';
