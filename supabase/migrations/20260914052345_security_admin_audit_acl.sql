-- SECURITY-ADMIN-AUDIT-ACL-01: make the audit trail immutable through the
-- public Data API.  Trusted SECURITY DEFINER workflow functions and
-- service_role maintenance continue to write as their database owners.
BEGIN;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Earlier broad defaults granted DML to browser-facing roles.  Revoke from
-- PUBLIC as well as the login roles so inherited privileges cannot bypass the
-- table's append-only contract.  The existing SELECT policy remains the sole
-- authenticated Data API path and continues to apply public.is_admin(...).
REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.admin_audit_logs
  FROM PUBLIC, anon, authenticated;

GRANT SELECT
  ON TABLE public.admin_audit_logs
  TO authenticated;

-- service_role is the deliberate internal maintenance path.  SECURITY
-- DEFINER workflow functions do not depend on browser-role table grants.
GRANT ALL PRIVILEGES
  ON TABLE public.admin_audit_logs
  TO service_role;

COMMENT ON TABLE public.admin_audit_logs IS
  'Immutable admin audit trail. Public Data API roles may read only through RLS; trusted SECURITY DEFINER workflows and service_role write audit records.';

NOTIFY pgrst, 'reload schema';

COMMIT;
