-- Remove the legacy 'tenant_isolation' RLS policy on appointments.
-- It uses the deprecated get_tenant_id() (replaced by user_owns_tenant in
-- harden_rls_multi_tenant), creates duplicate permissive policies on every
-- action, and is dead code from before the multi-tenant hardening.
-- The appointments_select/insert/update/delete policies fully cover access.
DROP POLICY IF EXISTS tenant_isolation ON appointments;
