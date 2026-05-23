-- ============================================================
-- Harden RLS — allow multiple tenants per owner
--
-- Until now, every child-table policy used get_tenant_id(), which
-- returns LIMIT 1 from tenants WHERE owner_id = auth.uid(). That
-- silently filters to a single tenant. The session layer, on the
-- other hand, scopes by subdomain. The two only coincide while each
-- owner has exactly one tenant — the day someone owns two, queries
-- start returning empty without any error.
--
-- This migration replaces get_tenant_id() with user_owns_tenant(uuid),
-- which checks ownership of the row's tenant_id directly.
-- ============================================================

CREATE OR REPLACE FUNCTION user_owns_tenant(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenants
    WHERE id = target_tenant_id AND owner_id = auth.uid()
  );
$$;

-- ─── clients ────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (user_owns_tenant(tenant_id));
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (user_owns_tenant(tenant_id));

-- ─── visits ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "visits_select" ON visits;
DROP POLICY IF EXISTS "visits_insert" ON visits;
DROP POLICY IF EXISTS "visits_update" ON visits;
DROP POLICY IF EXISTS "visits_delete" ON visits;

CREATE POLICY "visits_select" ON visits FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "visits_insert" ON visits FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY "visits_update" ON visits FOR UPDATE USING (user_owns_tenant(tenant_id));
CREATE POLICY "visits_delete" ON visits FOR DELETE USING (user_owns_tenant(tenant_id));

-- ─── loyalty_points ─────────────────────────────────────────
DROP POLICY IF EXISTS "loyalty_select" ON loyalty_points;
DROP POLICY IF EXISTS "loyalty_insert" ON loyalty_points;
DROP POLICY IF EXISTS "loyalty_update" ON loyalty_points;
DROP POLICY IF EXISTS "loyalty_delete" ON loyalty_points;

CREATE POLICY "loyalty_select" ON loyalty_points FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "loyalty_insert" ON loyalty_points FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY "loyalty_update" ON loyalty_points FOR UPDATE USING (user_owns_tenant(tenant_id));
CREATE POLICY "loyalty_delete" ON loyalty_points FOR DELETE USING (user_owns_tenant(tenant_id));

-- ─── messages ───────────────────────────────────────────────
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "messages_select" ON messages FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (user_owns_tenant(tenant_id));

-- ─── automations_config ─────────────────────────────────────
DROP POLICY IF EXISTS "automations_select" ON automations_config;
DROP POLICY IF EXISTS "automations_insert" ON automations_config;
DROP POLICY IF EXISTS "automations_update" ON automations_config;

CREATE POLICY "automations_select" ON automations_config FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "automations_insert" ON automations_config FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY "automations_update" ON automations_config FOR UPDATE USING (user_owns_tenant(tenant_id));

-- ─── actions_log ────────────────────────────────────────────
DROP POLICY IF EXISTS "actions_select" ON actions_log;
DROP POLICY IF EXISTS "actions_insert" ON actions_log;

CREATE POLICY "actions_select" ON actions_log FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "actions_insert" ON actions_log FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));

-- ─── citas ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "citas_select" ON citas;
DROP POLICY IF EXISTS "citas_insert" ON citas;
DROP POLICY IF EXISTS "citas_update" ON citas;
DROP POLICY IF EXISTS "citas_delete" ON citas;

CREATE POLICY "citas_select" ON citas FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "citas_insert" ON citas FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY "citas_update" ON citas FOR UPDATE USING (user_owns_tenant(tenant_id));
CREATE POLICY "citas_delete" ON citas FOR DELETE USING (user_owns_tenant(tenant_id));

-- get_tenant_id() is left in place (no callers depend on it now,
-- but other code may reference it). It is no longer used by RLS.
