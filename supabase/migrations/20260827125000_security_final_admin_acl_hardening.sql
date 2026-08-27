-- SECURITY-FINAL-R2: remove non-DML table privileges from ordinary API roles.
-- RLS remains the authorization boundary for intentionally granted row-level DML.

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON ALL TABLES IN SCHEMA public, vehicle, marketplace, identity, booking, service_marketplace
  FROM anon, authenticated;

-- Application migrations create public objects as postgres. The local Supabase
-- baseline left these non-DML privileges in that owner's public default ACL, so
-- every future public table would otherwise inherit the same defect.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon, authenticated;

-- These tables are administered through trusted maintenance and admin-only RLS.
-- The original migration documents service_role as a supported bootstrap path.
GRANT ALL PRIVILEGES
  ON TABLE public.admin_users, public.admin_audit_logs
  TO service_role;

NOTIFY pgrst, 'reload schema';
