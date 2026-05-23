-- Drop the obsolete get_tenant_id() function.
-- It was superseded by user_owns_tenant(uuid) in harden_rls_multi_tenant
-- (CLAUDE.md: "user_owns_tenant() replaces get_tenant_id()") and is no longer
-- referenced by any RLS policy or application code.
DROP FUNCTION IF EXISTS public.get_tenant_id();
