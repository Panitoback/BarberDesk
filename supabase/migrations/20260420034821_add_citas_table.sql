-- ============================================================
-- Citas (appointments) table
-- Missing from initial schema — was created manually in Supabase.
-- This migration makes the schema reproducible.
-- ============================================================

CREATE TYPE cita_estado AS ENUM ('pendiente', 'completada', 'noshow', 'cancelada');

CREATE TABLE citas (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id  uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fecha      date        NOT NULL,
  hora       time        NOT NULL,
  servicio   text        NOT NULL,
  estado     cita_estado NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_citas_tenant_id ON citas(tenant_id);
CREATE INDEX idx_citas_client_id ON citas(client_id);
CREATE INDEX idx_citas_fecha     ON citas(tenant_id, fecha DESC);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "citas_select" ON citas
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "citas_insert" ON citas
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "citas_update" ON citas
  FOR UPDATE USING (tenant_id = get_tenant_id());

CREATE POLICY "citas_delete" ON citas
  FOR DELETE USING (tenant_id = get_tenant_id());
