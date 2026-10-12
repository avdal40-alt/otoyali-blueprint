BEGIN;

-- JLC-0906: imports archive listings through the shared listing lifecycle.
-- `archived` is an import-row status, not a marketplace.listing_status enum.
DO $$
DECLARE
  v_definition TEXT;
  v_old_clause TEXT := 'SET status=''archived'',archived_at=now() WHERE id=v_listing_id AND seller_id=v_dealer_id';
  v_new_clause TEXT := 'SET status=''removed'',moderation_status=''archived'',archived_at=now() WHERE id=v_listing_id AND seller_id=v_dealer_id';
BEGIN
  SELECT pg_get_functiondef('public.apply_own_verified_galeri_excel_import(text,jsonb)'::regprocedure)
    INTO v_definition;

  IF length(v_definition) - length(replace(v_definition, v_old_clause, ''))
       <> length(v_old_clause) THEN
    RAISE EXCEPTION 'expected exactly one invalid dealer import archive lifecycle update';
  END IF;

  EXECUTE replace(v_definition, v_old_clause, v_new_clause);
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
