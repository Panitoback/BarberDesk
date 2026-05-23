-- ============================================================
-- English schema migration
-- Renames all Spanish columns, the citas table, and the
-- cita_estado enum to English equivalents.
-- ============================================================

-- ─── tenants ────────────────────────────────────────────────
ALTER TABLE tenants RENAME COLUMN nombre     TO name;
ALTER TABLE tenants RENAME COLUMN subdominio TO subdomain;

-- ─── clients ────────────────────────────────────────────────
ALTER TABLE clients RENAME COLUMN nombre        TO name;
ALTER TABLE clients RENAME COLUMN telefono      TO phone;
ALTER TABLE clients RENAME COLUMN ultima_visita TO last_visit;

-- ─── visits ─────────────────────────────────────────────────
ALTER TABLE visits RENAME COLUMN fecha          TO date;
ALTER TABLE visits RENAME COLUMN servicio       TO service;
ALTER TABLE visits RENAME COLUMN precio         TO price;
ALTER TABLE visits RENAME COLUMN puntos_ganados TO points_earned;
ALTER TABLE visits RENAME COLUMN notas          TO notes;

-- ─── loyalty_points ─────────────────────────────────────────
ALTER TABLE loyalty_points RENAME COLUMN puntos TO points;
ALTER TABLE loyalty_points RENAME COLUMN nivel  TO level;

-- ─── messages ───────────────────────────────────────────────
ALTER TABLE messages RENAME COLUMN direccion TO direction;
ALTER TABLE messages RENAME COLUMN contenido TO body;
ALTER TABLE messages RENAME COLUMN estado    TO status;

-- ─── automations_config ─────────────────────────────────────
ALTER TABLE automations_config RENAME COLUMN noshow_mensaje    TO noshow_message;
ALTER TABLE automations_config RENAME COLUMN reactivation_dias TO reactivation_days;

-- ─── actions_log ────────────────────────────────────────────
ALTER TABLE actions_log RENAME COLUMN tipo TO type;

-- ─── citas → appointments ───────────────────────────────────
ALTER TABLE citas RENAME COLUMN fecha    TO date;
ALTER TABLE citas RENAME COLUMN hora     TO time;
ALTER TABLE citas RENAME COLUMN servicio TO service;

-- Migrate appointment status enum to English values
-- Must drop default first — it references the old enum type
ALTER TABLE citas ALTER COLUMN estado DROP DEFAULT;

CREATE TYPE appointment_status AS ENUM ('pending', 'completed', 'no_show', 'cancelled');

ALTER TABLE citas
  ALTER COLUMN estado TYPE appointment_status
  USING (CASE estado::text
    WHEN 'pendiente'  THEN 'pending'::appointment_status
    WHEN 'completada' THEN 'completed'::appointment_status
    WHEN 'noshow'     THEN 'no_show'::appointment_status
    WHEN 'cancelada'  THEN 'cancelled'::appointment_status
  END);

ALTER TABLE citas ALTER COLUMN estado SET DEFAULT 'pending'::appointment_status;

ALTER TABLE citas RENAME COLUMN estado TO status;

ALTER TABLE citas RENAME TO appointments;

DROP TYPE cita_estado;

-- ─── Rename indexes ──────────────────────────────────────────
ALTER INDEX IF EXISTS idx_citas_tenant_id        RENAME TO idx_appointments_tenant_id;
ALTER INDEX IF EXISTS idx_citas_client_id        RENAME TO idx_appointments_client_id;
ALTER INDEX IF EXISTS idx_citas_fecha            RENAME TO idx_appointments_date;
ALTER INDEX IF EXISTS idx_clients_ultima_visita  RENAME TO idx_clients_last_visit;
ALTER INDEX IF EXISTS idx_visits_fecha           RENAME TO idx_visits_date;
ALTER INDEX IF EXISTS idx_tenants_subdominio     RENAME TO idx_tenants_subdomain;

-- ─── RLS policies for appointments ──────────────────────────
DROP POLICY IF EXISTS "citas_select" ON appointments;
DROP POLICY IF EXISTS "citas_insert" ON appointments;
DROP POLICY IF EXISTS "citas_update" ON appointments;
DROP POLICY IF EXISTS "citas_delete" ON appointments;

CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (user_owns_tenant(tenant_id));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (user_owns_tenant(tenant_id));

-- ─── update_last_visit trigger ────────────────────────────────
DROP TRIGGER IF EXISTS trg_visits_update_ultima_visita ON visits;
DROP FUNCTION IF EXISTS update_ultima_visita();

CREATE OR REPLACE FUNCTION update_last_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clients
  SET last_visit = NEW.date
  WHERE id = NEW.client_id
    AND (last_visit IS NULL OR last_visit < NEW.date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_visits_update_last_visit
  AFTER INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION update_last_visit();

-- ─── complete_appointment — updated column/enum references ───
CREATE OR REPLACE FUNCTION complete_appointment(
  p_appointment_id uuid,
  p_tenant_id      uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_client_id uuid;
  v_service   text;
  v_date      date;
  v_curr_pts  int;
  v_new_pts   int;
  v_new_level loyalty_level;
BEGIN
  SELECT client_id, service, date
  INTO   v_client_id, v_service, v_date
  FROM   appointments
  WHERE  id        = p_appointment_id
    AND  tenant_id = p_tenant_id
    AND  status    = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_available' USING ERRCODE = 'P0001';
  END IF;

  UPDATE appointments
  SET    status = 'completed'
  WHERE  id = p_appointment_id;

  -- 10 pts per visit — matches POINTS_PER_VISIT in lib/loyalty.ts
  INSERT INTO visits (tenant_id, client_id, service, date, points_earned)
  VALUES (p_tenant_id, v_client_id, v_service, v_date, 10);

  SELECT points INTO v_curr_pts
  FROM   loyalty_points
  WHERE  client_id = v_client_id AND tenant_id = p_tenant_id;

  v_new_pts := COALESCE(v_curr_pts, 0) + 10;

  v_new_level := CASE
    WHEN v_new_pts >= 500 THEN 'platinum'::loyalty_level
    WHEN v_new_pts >= 250 THEN 'gold'::loyalty_level
    WHEN v_new_pts >= 100 THEN 'silver'::loyalty_level
    ELSE                       'bronze'::loyalty_level
  END;

  UPDATE loyalty_points
  SET    points = v_new_pts, level = v_new_level, updated_at = now()
  WHERE  client_id = v_client_id AND tenant_id = p_tenant_id;

  INSERT INTO actions_log (tenant_id, client_id, type, metadata)
  VALUES (
    p_tenant_id, v_client_id, 'loyalty_add',
    jsonb_build_object(
      'points',         10,
      'new_level',      v_new_level::text,
      'appointment_id', p_appointment_id::text
    )
  );

  RETURN json_build_object('ok', true, 'points', v_new_pts, 'level', v_new_level::text);
END;
$$;
