BEGIN;

-- create_own_listing_draft_v3 returns a column named created_at. PostgreSQL
-- resolves the unqualified RETURNING created_at reference against that output
-- variable, preventing every V2 draft from being made. Rebuild only the
-- existing protected function body with an explicitly qualified table column;
-- CREATE OR REPLACE preserves its owner and existing grants.
DO $$
DECLARE
  v_identity REGPROCEDURE := 'public.create_own_listing_draft_v3(marketplace.vehicle_category,marketplace.listing_purpose,uuid,uuid,uuid,smallint,integer,text,vehicle.fuel_type,vehicle.transmission_type,text,text,text,numeric,text,text,text,boolean,text,uuid,uuid,uuid,text,text,integer,text,boolean,text,text,text,text,integer,integer,smallint,smallint,integer)'::REGPROCEDURE;
  v_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(v_identity) INTO v_definition;
  IF position('RETURNING id,created_at' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'expected V2 draft RPC RETURNING clause is missing';
  END IF;
  EXECUTE replace(v_definition, 'RETURNING id,created_at', 'RETURNING id,marketplace.listings.created_at');
END;
$$;

COMMENT ON FUNCTION public.create_own_listing_draft_v3(
  marketplace.vehicle_category, marketplace.listing_purpose, UUID, UUID, UUID,
  SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT,
  TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID, UUID,
  TEXT, TEXT, INTEGER, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, INTEGER,
  INTEGER, SMALLINT, SMALLINT, INTEGER
) IS 'Protected Jolcar V2 seller draft creation; table-column precedence avoids output-column ambiguity.';

COMMIT;
