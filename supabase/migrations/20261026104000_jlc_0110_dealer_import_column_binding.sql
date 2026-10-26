BEGIN;

-- The function returns a column named external_listing_id.  Make references
-- inside its SQL predicates deterministically bind to table columns rather
-- than the similarly named OUT parameter.
DO $$
DECLARE
  v_definition TEXT;
BEGIN
  SELECT pg_get_functiondef('public.apply_own_verified_galeri_excel_import(text,jsonb)'::regprocedure)
    INTO v_definition;
  IF v_definition NOT LIKE '%LANGUAGE plpgsql%' OR v_definition NOT LIKE '%AS $function$%' THEN
    RAISE EXCEPTION 'unexpected dealer import function definition';
  END IF;
  v_definition := replace(v_definition, 'AS $function$', 'AS $function$' || E'\n#variable_conflict use_column');
  EXECUTE v_definition;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT,JSONB) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT,JSONB) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
