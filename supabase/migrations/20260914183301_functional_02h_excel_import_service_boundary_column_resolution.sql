BEGIN;

-- Preserve the applied function's signature, SECURITY DEFINER and search_path
-- while replacing its two exact external-ID lookup clauses with qualified SQL.
DO $$
DECLARE
  v_definition TEXT;
  v_old_clause TEXT := 'FROM marketplace.dealer_listing_external_ids WHERE dealer_id=v_dealer_id AND source=''excel'' AND external_listing_id=v_external FOR UPDATE';
  v_new_clause TEXT := 'FROM marketplace.dealer_listing_external_ids AS dlei WHERE dlei.dealer_id=v_dealer_id AND dlei.source=''excel'' AND dlei.external_listing_id=v_external FOR UPDATE';
BEGIN
  SELECT pg_get_functiondef('public.apply_own_verified_galeri_excel_import(text,jsonb)'::regprocedure) INTO v_definition;
  IF length(v_definition) - length(replace(v_definition, v_old_clause, '')) <> length(v_old_clause) * 2 THEN
    RAISE EXCEPTION 'expected exactly two unqualified dealer external-ID lookups';
  END IF;
  v_definition := replace(v_definition, v_old_clause, v_new_clause);
  EXECUTE v_definition;
END;
$$;

COMMENT ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT, JSONB) IS
  'FUNCTIONAL-02H verified-Galeri-only Excel boundary; dealer external-ID lookups are explicitly table-qualified.';

COMMIT;
