BEGIN;

REVOKE ALL ON FUNCTION public.create_own_listing_draft(
  UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type,
  vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT,
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_own_listing_draft(
  UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type,
  vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT,
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID
) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
