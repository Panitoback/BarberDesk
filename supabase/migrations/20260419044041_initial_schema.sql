-- ============================================================
-- BarberDesk — Schema inicial completo
-- Multi-tenant: cada tabla (excepto tenants) tiene tenant_id
-- RLS activo en todas las tablas
-- ============================================================

-- gen_random_uuid() está disponible nativamente en PostgreSQL 13+

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE plan_type AS ENUM ('trial', 'active', 'suspended');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'failed');
CREATE TYPE loyalty_level AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE action_type AS ENUM (
  'noshow',
  'loyalty_add',
  'reactivation_sms',
  'review_request',
  'sms_auto_reply'
);

-- ============================================================
-- TENANTS — tabla raíz, es el tenant
-- ============================================================

CREATE TABLE tenants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre        text        NOT NULL,
  subdominio    text        NOT NULL UNIQUE,
  twilio_number text,
  config        jsonb       NOT NULL DEFAULT '{}',
  plan          plan_type   NOT NULL DEFAULT 'trial',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_owner_id   ON tenants(owner_id);
CREATE INDEX idx_tenants_subdominio ON tenants(subdominio);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "tenants_insert_own" ON tenants
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "tenants_update_own" ON tenants
  FOR UPDATE USING (owner_id = auth.uid());

-- Helper: devuelve el tenant_id del usuario autenticado
-- Usado en todas las políticas RLS de las tablas hijas
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM tenants WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre        text        NOT NULL,
  telefono      text        NOT NULL,
  email         text,
  no_show_count integer     NOT NULL DEFAULT 0,
  ultima_visita date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, telefono)
);

CREATE INDEX idx_clients_tenant_id     ON clients(tenant_id);
CREATE INDEX idx_clients_ultima_visita ON clients(tenant_id, ultima_visita);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (tenant_id = get_tenant_id());

CREATE POLICY "clients_delete" ON clients
  FOR DELETE USING (tenant_id = get_tenant_id());

-- ============================================================
-- VISITS
-- ============================================================

CREATE TABLE visits (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id      uuid         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fecha          date         NOT NULL DEFAULT CURRENT_DATE,
  servicio       text         NOT NULL,
  precio         numeric(8,2),
  puntos_ganados integer      NOT NULL DEFAULT 0,
  notas          text,
  created_at     timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_tenant_id ON visits(tenant_id);
CREATE INDEX idx_visits_client_id ON visits(client_id);
CREATE INDEX idx_visits_fecha     ON visits(tenant_id, fecha DESC);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits_select" ON visits
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "visits_insert" ON visits
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "visits_update" ON visits
  FOR UPDATE USING (tenant_id = get_tenant_id());

CREATE POLICY "visits_delete" ON visits
  FOR DELETE USING (tenant_id = get_tenant_id());

-- Actualiza ultima_visita del cliente automáticamente
CREATE OR REPLACE FUNCTION update_ultima_visita()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clients
  SET ultima_visita = NEW.fecha
  WHERE id = NEW.client_id
    AND (ultima_visita IS NULL OR ultima_visita < NEW.fecha);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_visits_update_ultima_visita
  AFTER INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION update_ultima_visita();

-- ============================================================
-- LOYALTY_POINTS
-- ============================================================

CREATE TABLE loyalty_points (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id  uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  puntos     integer       NOT NULL DEFAULT 0,
  nivel      loyalty_level NOT NULL DEFAULT 'bronze',
  updated_at timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id)
);

CREATE INDEX idx_loyalty_tenant_id ON loyalty_points(tenant_id);
CREATE INDEX idx_loyalty_client_id ON loyalty_points(client_id);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_select" ON loyalty_points
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "loyalty_insert" ON loyalty_points
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "loyalty_update" ON loyalty_points
  FOR UPDATE USING (tenant_id = get_tenant_id());

CREATE POLICY "loyalty_delete" ON loyalty_points
  FOR DELETE USING (tenant_id = get_tenant_id());

-- ============================================================
-- MESSAGES — historial de SMS (Twilio)
-- ============================================================

CREATE TABLE messages (
  id         uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id  uuid              REFERENCES clients(id) ON DELETE SET NULL,
  direccion  message_direction NOT NULL,
  contenido  text              NOT NULL,
  estado     message_status    NOT NULL DEFAULT 'queued',
  twilio_sid text,
  created_at timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_tenant_id  ON messages(tenant_id);
CREATE INDEX idx_messages_client_id  ON messages(client_id);
CREATE INDEX idx_messages_created_at ON messages(tenant_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (tenant_id = get_tenant_id());

-- ============================================================
-- AUTOMATIONS_CONFIG — una fila por tenant
-- ============================================================

CREATE TABLE automations_config (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  noshow_active       boolean     NOT NULL DEFAULT true,
  noshow_mensaje      text,
  loyalty_active      boolean     NOT NULL DEFAULT true,
  review_active       boolean     NOT NULL DEFAULT true,
  review_link         text,
  reactivation_active boolean     NOT NULL DEFAULT true,
  reactivation_dias   integer     NOT NULL DEFAULT 30,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automations_tenant_id ON automations_config(tenant_id);

ALTER TABLE automations_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_select" ON automations_config
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "automations_insert" ON automations_config
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "automations_update" ON automations_config
  FOR UPDATE USING (tenant_id = get_tenant_id());

-- ============================================================
-- ACTIONS_LOG — log inmutable de todas las acciones
-- ============================================================

CREATE TABLE actions_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id  uuid        REFERENCES clients(id) ON DELETE SET NULL,
  tipo       action_type NOT NULL,
  metadata   jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_actions_tenant_id  ON actions_log(tenant_id);
CREATE INDEX idx_actions_client_id  ON actions_log(client_id);
CREATE INDEX idx_actions_tipo       ON actions_log(tenant_id, tipo);
CREATE INDEX idx_actions_created_at ON actions_log(tenant_id, created_at DESC);

ALTER TABLE actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actions_select" ON actions_log
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "actions_insert" ON actions_log
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- ============================================================
-- TRIGGERS DE INICIALIZACIÓN AUTOMÁTICA
-- ============================================================

-- Al crear un tenant → crea su fila en automations_config
CREATE OR REPLACE FUNCTION init_tenant_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO automations_config (tenant_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_init_defaults
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION init_tenant_defaults();

-- Al crear un cliente → crea su fila en loyalty_points
CREATE OR REPLACE FUNCTION init_client_loyalty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO loyalty_points (tenant_id, client_id)
  VALUES (NEW.tenant_id, NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_client_init_loyalty
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION init_client_loyalty();
