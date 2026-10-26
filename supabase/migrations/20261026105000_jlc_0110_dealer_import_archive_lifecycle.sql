BEGIN;

-- Align dealer import archival with the current listing lifecycle.  The import
-- remains seller-scoped; only its obsolete status literal is replaced.
DO $$
DECLARE
  v_definition TEXT;
BEGIN
  SELECT pg_get_functiondef('public.apply_own_verified_galeri_excel_import(text,jsonb)'::regprocedure)
    INTO v_definition;
  IF v_definition NOT LIKE '%SET status=''archived'',archived_at=now()%' THEN
    RAISE EXCEPTION 'unexpected dealer import archive lifecycle definition';
  END IF;
  v_definition := replace(
    v_definition,
    'SET status=''archived'',archived_at=now()',
    'SET status=''removed'',moderation_status=''archived'',archived_at=now()'
  );
  EXECUTE v_definition;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT,JSONB) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.apply_own_verified_galeri_excel_import(TEXT,JSONB) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
