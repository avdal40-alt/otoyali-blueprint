BEGIN;

-- FUNCTIONAL-02B2: seller declarations are structured facts, not verification.
-- External reports, VIN decoders, and AI inference must remain separate sources.

CREATE TYPE vehicle.body_panel AS ENUM (
  'front_bumper', 'rear_bumper', 'hood', 'roof', 'trunk_lid',
  'front_left_fender', 'front_right_fender', 'rear_left_fender', 'rear_right_fender',
  'front_left_door', 'front_right_door', 'rear_left_door', 'rear_right_door'
);

CREATE TYPE vehicle.body_panel_condition AS ENUM ('original', 'painted', 'replaced');
CREATE TYPE vehicle.fact_provenance AS ENUM ('seller', 'catalog', 'vin', 'external_report', 'ai');
CREATE TYPE vehicle.seller_damage_declaration AS ENUM ('unknown', 'no_known_damage', 'damage_disclosed');
CREATE TYPE vehicle.seller_service_declaration AS ENUM (
  'unknown', 'regular_service_declared', 'partial_records_declared', 'no_records_declared'
);

ALTER TABLE vehicle.vehicle_profiles
  ADD COLUMN seller_damage_declaration vehicle.seller_damage_declaration,
  ADD COLUMN seller_damage_notes TEXT,
  ADD COLUMN seller_service_declaration vehicle.seller_service_declaration,
  ADD CONSTRAINT vehicle_profiles_seller_damage_notes_length_chk
    CHECK (seller_damage_notes IS NULL OR char_length(trim(seller_damage_notes)) BETWEEN 1 AND 4000) NOT VALID;

COMMENT ON COLUMN vehicle.vehicle_profiles.seller_damage_declaration IS
  'Seller damage/history declaration. no_known_damage is not an external Hasarsız verification.';
COMMENT ON COLUMN vehicle.vehicle_profiles.seller_damage_notes IS
  'Optional seller-provided public damage/history context; never an external report payload.';
COMMENT ON COLUMN vehicle.vehicle_profiles.seller_service_declaration IS
  'Seller service/history declaration; it does not verify maintenance records.';

CREATE TABLE vehicle.body_panel_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id UUID NOT NULL REFERENCES vehicle.vehicle_profiles(id) ON DELETE CASCADE,
  panel vehicle.body_panel NOT NULL,
  condition vehicle.body_panel_condition NOT NULL,
  provenance vehicle.fact_provenance NOT NULL DEFAULT 'seller',
  seller_evidence_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT body_panel_declarations_profile_panel_unique UNIQUE (vehicle_profile_id, panel),
  CONSTRAINT body_panel_declarations_seller_provenance_chk CHECK (provenance = 'seller'),
  CONSTRAINT body_panel_declarations_evidence_note_length_chk
    CHECK (seller_evidence_note IS NULL OR char_length(trim(seller_evidence_note)) BETWEEN 1 AND 2000)
);

COMMENT ON TABLE vehicle.body_panel_declarations IS
  'Per-panel seller declarations. original is never an external damage-free verification.';

CREATE TABLE vehicle.profile_fact_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id UUID NOT NULL REFERENCES vehicle.vehicle_profiles(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  provenance vehicle.fact_provenance NOT NULL,
  evidence_kind TEXT NOT NULL,
  evidence_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profile_fact_evidence_field_key_chk CHECK (field_key IN ('damage_declaration', 'service_declaration', 'body_panel')),
  CONSTRAINT profile_fact_evidence_kind_chk CHECK (evidence_kind IN ('seller_statement', 'document_reference', 'provider_reference', 'ai_inference')),
  CONSTRAINT profile_fact_evidence_reference_length_chk
    CHECK (evidence_reference IS NULL OR char_length(trim(evidence_reference)) BETWEEN 1 AND 512),
  CONSTRAINT profile_fact_evidence_seller_kind_chk CHECK (
    (provenance = 'seller' AND evidence_kind = 'seller_statement')
    OR provenance IN ('catalog', 'vin', 'external_report', 'ai')
  )
);

COMMENT ON TABLE vehicle.profile_fact_evidence IS
  'Private provenance/evidence metadata. It is not a public report payload and AI evidence never verifies a fact.';

CREATE INDEX body_panel_declarations_profile_idx
  ON vehicle.body_panel_declarations (vehicle_profile_id);
CREATE INDEX profile_fact_evidence_profile_field_idx
  ON vehicle.profile_fact_evidence (vehicle_profile_id, field_key, created_at DESC);

CREATE TRIGGER body_panel_declarations_set_updated_at
  BEFORE UPDATE ON vehicle.body_panel_declarations
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

ALTER TABLE vehicle.body_panel_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.profile_fact_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY body_panel_declarations_select_public_active_listing
  ON vehicle.body_panel_declarations FOR SELECT TO anon, authenticated
  USING (vehicle.has_active_listing(vehicle_profile_id));
CREATE POLICY body_panel_declarations_select_owner
  ON vehicle.body_panel_declarations FOR SELECT TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id));
CREATE POLICY body_panel_declarations_insert_owner
  ON vehicle.body_panel_declarations FOR INSERT TO authenticated
  WITH CHECK (vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller');
CREATE POLICY body_panel_declarations_update_owner
  ON vehicle.body_panel_declarations FOR UPDATE TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id))
  WITH CHECK (vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller');
CREATE POLICY body_panel_declarations_delete_owner
  ON vehicle.body_panel_declarations FOR DELETE TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id));
CREATE POLICY body_panel_declarations_service_role_all
  ON vehicle.body_panel_declarations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY profile_fact_evidence_select_owner
  ON vehicle.profile_fact_evidence FOR SELECT TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id));
CREATE POLICY profile_fact_evidence_insert_seller_owner
  ON vehicle.profile_fact_evidence FOR INSERT TO authenticated
  WITH CHECK (vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller' AND evidence_kind = 'seller_statement');
CREATE POLICY profile_fact_evidence_update_seller_owner
  ON vehicle.profile_fact_evidence FOR UPDATE TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller')
  WITH CHECK (vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller' AND evidence_kind = 'seller_statement');
CREATE POLICY profile_fact_evidence_delete_seller_owner
  ON vehicle.profile_fact_evidence FOR DELETE TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id) AND provenance = 'seller');
CREATE POLICY profile_fact_evidence_service_role_all
  ON vehicle.profile_fact_evidence FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON vehicle.body_panel_declarations, vehicle.profile_fact_evidence TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
