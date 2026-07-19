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
  v_facade_oid OID;
  v_internal_oid OID;
  v_facade_arguments TEXT;
  v_facade_result TEXT;
  v_slot_count INTEGER;
  v_disallowed_column TEXT;
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

  v_internal_oid := to_regprocedure('booking.get_public_availability(uuid,timestamp with time zone,timestamp with time zone,integer)');
  IF v_internal_oid IS NULL THEN
    RAISE EXCEPTION 'booking.get_public_availability exact signature missing';
  END IF;

  v_facade_oid := to_regprocedure('public.get_booking_availability(uuid,timestamp with time zone,timestamp with time zone,integer)');
  IF v_facade_oid IS NULL THEN
    RAISE EXCEPTION 'public.get_booking_availability exact signature missing';
  END IF;

  SELECT
    pg_get_function_arguments(v_facade_oid),
    pg_get_function_result(v_facade_oid)
  INTO v_facade_arguments, v_facade_result;

  IF v_facade_arguments <> 'p_offering_id uuid, p_range_start timestamp with time zone, p_range_end timestamp with time zone, p_slot_limit integer DEFAULT 100' THEN
    RAISE EXCEPTION 'public.get_booking_availability arguments changed: %', v_facade_arguments;
  END IF;

  IF v_facade_result <> 'TABLE(offering_id uuid, branch_id uuid, slot_start_at timestamp with time zone, slot_end_at timestamp with time zone, timezone text, booking_mode text, available_resource_count integer)' THEN
    RAISE EXCEPTION 'public.get_booking_availability return type changed: %', v_facade_result;
  END IF;

  FOREACH v_disallowed_column IN ARRAY ARRAY[
    'resource_id',
    'customer_name',
    'customer_phone',
    'customer_email',
    'customer_notes',
    'provider_notes',
    'internal_notes',
    'exception_reason',
    'reservation_id',
    'timeline'
  ] LOOP
    IF v_facade_result ILIKE '%' || v_disallowed_column || '%' THEN
      RAISE EXCEPTION 'public.get_booking_availability exposes private column %', v_disallowed_column;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_proc proc
    WHERE proc.oid = v_facade_oid
      AND proc.prosecdef = true
  ) THEN
    RAISE EXCEPTION 'public.get_booking_availability must remain SECURITY INVOKER';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc proc
    WHERE proc.oid = v_facade_oid
      AND 'search_path=public, pg_catalog' = ANY(COALESCE(proc.proconfig, ARRAY[]::TEXT[]))
  ) THEN
    RAISE EXCEPTION 'public.get_booking_availability missing explicit safe search_path';
  END IF;

  IF pg_get_functiondef(v_facade_oid) NOT ILIKE '%booking.get_public_availability%' THEN
    RAISE EXCEPTION 'public.get_booking_availability does not delegate to booking.get_public_availability';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'get_booking_availability'
      AND grantee = 'PUBLIC'
      AND privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'PUBLIC can execute public.get_booking_availability';
  END IF;

  IF NOT has_function_privilege('anon', v_facade_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon cannot execute public.get_booking_availability';
  END IF;

  IF NOT has_function_privilege('authenticated', v_facade_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute public.get_booking_availability';
  END IF;

  IF NOT has_function_privilege('service_role', v_facade_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute public.get_booking_availability';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema = 'booking'
      AND grantee IN ('PUBLIC', 'anon')
  ) THEN
    RAISE EXCEPTION 'booking table access granted to PUBLIC or anon';
  END IF;

  SELECT COUNT(*)
  INTO v_slot_count
  FROM public.get_booking_availability(
    '00000000-0000-0000-0000-000000000000'::UUID,
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '2 days',
    5
  );

  IF v_slot_count <> 0 THEN
    RAISE EXCEPTION 'nonexistent offering returned % availability rows', v_slot_count;
  END IF;
END;
$$;

-- Manual integration checks after local migration application:
-- 1. The Data API exposes public.get_booking_availability, not the booking schema.
-- 2. Anon cannot SELECT from booking.bookable_resources.
-- 3. Anon cannot SELECT from booking.bookings.
-- 4. Anon cannot SELECT from booking.resource_reservations.
-- 5. Anon cannot SELECT from booking.booking_timeline.
-- 6. Anon can execute public.get_booking_availability and receives only safe columns.
-- 7. Provider A cannot insert/update Provider B resources.
-- 8. Cross-provider offering/resource links are rejected.
-- 9. Overlapping capacity-1 reservations for the same resource are rejected.
-- 10. Adjacent half-open reservations for the same resource are accepted.
-- 11. Direct booking status update is rejected.
-- 12. Direct timeline update/delete is rejected.
-- 13. Valid transition appends exactly one timeline event.
-- 14. Cancellation and rejection release active reservations.
-- 15. Minimum notice, maximum advance, inactive provider, inactive branch,
--     inactive offering, disabled config, inactive resource, unavailable
--     exceptions, and existing reservations all remove availability.
