-- BOOKING-01A PostgREST compatibility facade.
-- The booking schema remains private; this public RPC exposes only safe availability
-- slots so production Data API clients do not need the booking schema in api.schemas.

CREATE OR REPLACE FUNCTION public.get_booking_availability(
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
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT
    availability.offering_id,
    availability.branch_id,
    availability.slot_start_at,
    availability.slot_end_at,
    availability.timezone,
    availability.booking_mode,
    availability.available_resource_count
  FROM booking.get_public_availability(
    p_offering_id,
    p_range_start,
    p_range_end,
    p_slot_limit
  ) AS availability;
$$;

REVOKE ALL ON FUNCTION public.get_booking_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_booking_availability(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) IS
  'PostgREST-safe public facade for the private booking domain. Returns only safe availability slots and never exposes resources, schedules, reservations, customer data, notes, or timeline rows.';

NOTIFY pgrst, 'reload schema';
