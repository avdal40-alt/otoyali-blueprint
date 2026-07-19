-- BOOKING-01A focused SQL verification script.
-- Intended for a local or staging database after applying the migration.
-- Do not run this against production without an explicit migration-test plan.

DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'bookable_resources',
    'offering_resources',
    'offering_booking_configurations',
    'recurring_working_hours',
    'availability_exceptions',
    'bookings',
    'resource_reservations',
    'booking_timeline'
  ];
  v_table_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'booking') THEN
    RAISE EXCEPTION 'booking schema missing';
  END IF;

  FOREACH v_table_name IN ARRAY expected_tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'booking'
        AND table_name = v_table_name
    ) THEN
      RAISE EXCEPTION 'booking.% table missing', v_table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class class
      JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
      WHERE namespace.nspname = 'booking'
        AND class.relname = v_table_name
        AND class.relrowsecurity = true
    ) THEN
      RAISE EXCEPTION 'booking.% RLS is not enabled', v_table_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
    RAISE EXCEPTION 'btree_gist extension missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'service_marketplace'
      AND table_name = 'branches'
      AND column_name = 'timezone'
  ) THEN
    RAISE EXCEPTION 'service_marketplace.branches.timezone missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_reservations_no_overlap_capacity1_excl'
  ) THEN
    RAISE EXCEPTION 'capacity-1 reservation exclusion constraint missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc proc
    JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'booking'
      AND proc.proname = 'get_public_availability'
  ) THEN
    RAISE EXCEPTION 'booking.get_public_availability missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc proc
    JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'booking'
      AND proc.proname = 'create_booking'
  ) THEN
    RAISE EXCEPTION 'booking.create_booking missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc proc
    JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'booking'
      AND proc.proname = 'transition_booking_status'
  ) THEN
    RAISE EXCEPTION 'booking.transition_booking_status missing';
  END IF;

  IF NOT booking.is_valid_status_transition('requested', 'confirmed') THEN
    RAISE EXCEPTION 'valid requested -> confirmed transition rejected';
  END IF;

  IF booking.is_valid_status_transition('completed', 'confirmed') THEN
    RAISE EXCEPTION 'terminal completed -> confirmed transition incorrectly allowed';
  END IF;
END;
$$;

-- Manual integration checks after local migration application:
-- 1. Anon cannot SELECT from booking.bookable_resources.
-- 2. Anon cannot SELECT from booking.bookings.
-- 3. Anon cannot SELECT from booking.resource_reservations.
-- 4. Anon cannot SELECT from booking.booking_timeline.
-- 5. Anon can execute booking.get_public_availability and receives only safe columns.
-- 6. Provider A cannot insert/update Provider B resources.
-- 7. Cross-provider offering/resource links are rejected.
-- 8. Overlapping capacity-1 reservations for the same resource are rejected.
-- 9. Adjacent half-open reservations for the same resource are accepted.
-- 10. Direct booking status update is rejected.
-- 11. Direct timeline update/delete is rejected.
-- 12. Valid transition appends exactly one timeline event.
-- 13. Cancellation and rejection release active reservations.
-- 14. Minimum notice, maximum advance, inactive provider, inactive branch,
--     inactive offering, disabled config, inactive resource, unavailable
--     exceptions, and existing reservations all remove availability.
