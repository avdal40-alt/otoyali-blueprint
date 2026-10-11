$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$migrationPath = Join-Path $root 'supabase\migrations\20261011170000_jlc0908_harden_dealer_staff_authorization.sql'
$migration = Get-Content -Raw $migrationPath
$migrationBody = $migration -replace '(?m)^BEGIN;\s*\r?\n', '' -replace '(?m)^COMMIT;\s*\r?\n?$', ''

$sql = @"
BEGIN;
$migrationBody

INSERT INTO auth.users (id, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000090801', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000090802', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000090803', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000090804', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000090805', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000090806', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET seller_type = 'dealer'
WHERE id IN ('00000000-0000-0000-0000-000000090801', '00000000-0000-0000-0000-000000090802');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000090801', true);
SELECT marketplace.manage_dealer_staff_member('00000000-0000-0000-0000-000000090801', '00000000-0000-0000-0000-000000090803', 'manager');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000090803', true);
SELECT marketplace.manage_dealer_staff_member('00000000-0000-0000-0000-000000090801', '00000000-0000-0000-0000-000000090804', 'staff');
DO `$`$
BEGIN
  PERFORM marketplace.manage_dealer_staff_member('00000000-0000-0000-0000-000000090801', '00000000-0000-0000-0000-000000090805', 'manager');
  RAISE EXCEPTION 'manager escalation unexpectedly succeeded';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END
`$`$;
DO `$`$
BEGIN
  PERFORM marketplace.remove_dealer_staff_member('00000000-0000-0000-0000-000000090801', '00000000-0000-0000-0000-000000090803');
  RAISE EXCEPTION 'manager removal unexpectedly succeeded';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END
`$`$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000090804', true);
DO `$`$
BEGIN
  PERFORM marketplace.manage_dealer_staff_member('00000000-0000-0000-0000-000000090801', '00000000-0000-0000-0000-000000090805', 'staff');
  RAISE EXCEPTION 'staff management unexpectedly succeeded';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END
`$`$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000090806', true);
DO `$`$
BEGIN
  PERFORM marketplace.manage_dealer_staff_member('00000000-0000-0000-0000-000000090802', '00000000-0000-0000-0000-000000090805', 'staff');
  RAISE EXCEPTION 'cross-dealer management unexpectedly succeeded';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END
`$`$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000090804', true);
DO `$`$
BEGIN
  IF EXISTS (SELECT 1 FROM marketplace.dealer_staff_memberships WHERE dealer_id = '00000000-0000-0000-0000-000000090801' AND user_id = '00000000-0000-0000-0000-000000090803') THEN
    RAISE EXCEPTION 'staff can read another membership';
  END IF;
END
`$`$;

ROLLBACK;
"@

$sql | docker exec -i supabase_db_Otoyali-blueprint psql -v ON_ERROR_STOP=1 -U postgres -d postgres
if ($LASTEXITCODE -ne 0) { throw "JLC-0908 runtime authorization matrix failed" }

Write-Output 'JLC-0908 dealer staff runtime authorization matrix passed'
