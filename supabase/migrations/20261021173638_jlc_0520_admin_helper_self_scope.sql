BEGIN;

-- RLS policies invoke these helpers for anon as well as authenticated roles,
-- so EXECUTE must remain available. Scope their results to the caller's own
-- identity; only the trusted service role may inspect another identity.
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (uid = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.user_id = uid
        AND au.is_active = TRUE
    ), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.admin_role(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM public.admin_users au
  WHERE au.user_id = uid
    AND (uid = auth.uid() OR auth.role() = 'service_role')
    AND au.is_active = TRUE
  LIMIT 1;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
