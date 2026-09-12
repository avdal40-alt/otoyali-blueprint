BEGIN;

CREATE TYPE vehicle.vin_checksum_state AS ENUM ('valid', 'invalid', 'not_applicable', 'unknown');
CREATE TYPE vehicle.vin_review_state AS ENUM ('bound', 'review_required');

CREATE TABLE vehicle.private_vins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id UUID NOT NULL UNIQUE REFERENCES vehicle.vehicle_profiles(id) ON DELETE CASCADE,
  normalized_vin CHAR(17) NOT NULL,
  vin_fingerprint BYTEA NOT NULL UNIQUE,
  vin_last4 CHAR(4) NOT NULL,
  checksum_state vehicle.vin_checksum_state NOT NULL DEFAULT 'unknown',
  review_state vehicle.vin_review_state NOT NULL DEFAULT 'bound',
  provenance vehicle.fact_provenance NOT NULL DEFAULT 'seller',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT private_vins_normalized_format_chk CHECK (normalized_vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  CONSTRAINT private_vins_last4_chk CHECK (vin_last4 ~ '^[A-HJ-NPR-Z0-9]{4}$'),
  CONSTRAINT private_vins_seller_provenance_chk CHECK (provenance = 'seller')
);
COMMENT ON TABLE vehicle.private_vins IS 'Private raw VIN storage. RLS and grants prevent direct browser reads; this is access control, not column encryption.';
COMMENT ON COLUMN vehicle.private_vins.vin_fingerprint IS 'Internal SHA-256 duplicate-detection value; never public, searchable, or sent to AI.';

CREATE TRIGGER private_vins_set_updated_at BEFORE UPDATE ON vehicle.private_vins
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();
ALTER TABLE vehicle.private_vins ENABLE ROW LEVEL SECURITY;
CREATE POLICY private_vins_service_role_all ON vehicle.private_vins FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
GRANT ALL ON vehicle.private_vins TO service_role;

CREATE FUNCTION vehicle.submit_own_vin(p_vehicle_profile_id UUID, p_vin TEXT)
RETURNS TABLE(result_code TEXT, masked_vin TEXT, checksum_state vehicle.vin_checksum_state)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = vehicle, extensions, pg_catalog AS $$
DECLARE v_normalized TEXT; v_fingerprint BYTEA; v_existing UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT vehicle.is_current_profile_owner(p_vehicle_profile_id, auth.uid()) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  v_normalized := upper(regexp_replace(trim(coalesce(p_vin, '')), '[\\s-]+', '', 'g'));
  IF v_normalized !~ '^[A-HJ-NPR-Z0-9]{17}$' THEN
    RETURN QUERY SELECT 'invalid_format'::TEXT, NULL::TEXT, 'unknown'::vehicle.vin_checksum_state; RETURN;
  END IF;
  v_fingerprint := extensions.digest(v_normalized, 'sha256');
  SELECT vehicle_profile_id INTO v_existing FROM vehicle.private_vins WHERE vin_fingerprint = v_fingerprint;
  IF v_existing IS NOT NULL AND v_existing <> p_vehicle_profile_id THEN
    RETURN QUERY SELECT 'review_required'::TEXT, NULL::TEXT, 'unknown'::vehicle.vin_checksum_state; RETURN;
  END IF;
  BEGIN
    INSERT INTO vehicle.private_vins (vehicle_profile_id, normalized_vin, vin_fingerprint, vin_last4, checksum_state)
    VALUES (p_vehicle_profile_id, v_normalized, v_fingerprint, right(v_normalized, 4), 'unknown')
    ON CONFLICT (vehicle_profile_id) DO UPDATE SET normalized_vin = EXCLUDED.normalized_vin, vin_fingerprint = EXCLUDED.vin_fingerprint, vin_last4 = EXCLUDED.vin_last4, checksum_state = EXCLUDED.checksum_state;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 'review_required'::TEXT, NULL::TEXT, 'unknown'::vehicle.vin_checksum_state; RETURN;
  END;
  RETURN QUERY SELECT 'bound'::TEXT, ('*************' || right(v_normalized, 4))::TEXT, 'unknown'::vehicle.vin_checksum_state;
END;
$$;
REVOKE ALL ON FUNCTION vehicle.submit_own_vin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vehicle.submit_own_vin(UUID, TEXT) TO authenticated;
COMMENT ON FUNCTION vehicle.submit_own_vin(UUID, TEXT) IS 'Owner-only VIN submission. Conflicts are generic and disclose no existing identity; publication remains optional.';
NOTIFY pgrst, 'reload schema';
COMMIT;
