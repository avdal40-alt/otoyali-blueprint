BEGIN;

-- JLC-0906: the canonical function's output column external_listing_id is
-- also a PL/pgSQL variable. Qualify both reconciliation updates so repeated
-- upserts and archives cannot fail with an ambiguous-column error.
DO $$
DECLARE
  v_definition TEXT;
  v_old_clause TEXT := 'UPDATE marketplace.dealer_listing_external_ids SET last_seen_batch_id=v_batch_id WHERE dealer_id=v_dealer_id AND source=''excel'' AND external_listing_id=v_external';
  v_new_clause TEXT := 'UPDATE marketplace.dealer_listing_external_ids AS dlei SET last_seen_batch_id=v_batch_id WHERE dlei.dealer_id=v_dealer_id AND dlei.source=''excel'' AND dlei.external_listing_id=v_external';
BEGIN
  SELECT pg_get_functiondef('public.apply_own_verified_galeri_excel_import(text,jsonb)'::regprocedure)
    INTO v_definition;

  IF length(v_definition) - length(replace(v_definition, v_old_clause, ''))
       <> length(v_old_clause) * 2 THEN
    RAISE EXCEPTION 'expected exactly two unqualified dealer external-ID reconciliation updates';
  END IF;

  EXECUTE replace(v_definition, v_old_clause, v_new_clause);
END;
$$;

COMMENT ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT, JSONB) IS
  'Verified-dealer Excel import boundary with dealer-scoped canonical external-ID reconciliation.';

NOTIFY pgrst, 'reload schema';

COMMIT;
