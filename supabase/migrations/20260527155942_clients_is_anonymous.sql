-- Anonymous walk-ins (no phone, no name) used to spawn a fresh client row
-- each time, polluting the clients list. This migration introduces a single
-- reusable "Walk-in" bucket per tenant marked with is_anonymous, backfills
-- existing duplicates into it, and teaches the RPC to skip loyalty on
-- anonymous clients.

-- 1. Backup the tables we are about to mutate. Restore by:
--    BEGIN; TRUNCATE clients RESTART IDENTITY CASCADE;
--    INSERT INTO clients SELECT * FROM backup.backup_20260527_clients; ... COMMIT;
-- The backup schema is not exposed by PostgREST and revoked from anon/authenticated.
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated, public;

CREATE TABLE backup.backup_20260527_clients        AS SELECT * FROM clients;
CREATE TABLE backup.backup_20260527_visits         AS SELECT * FROM visits;
CREATE TABLE backup.backup_20260527_appointments   AS SELECT * FROM appointments;
CREATE TABLE backup.backup_20260527_messages       AS SELECT * FROM messages;
CREATE TABLE backup.backup_20260527_actions_log    AS SELECT * FROM actions_log;
CREATE TABLE backup.backup_20260527_loyalty_points AS SELECT * FROM loyalty_points;

-- 2. New flag + unique index (one anon bucket per tenant)
ALTER TABLE clients
  ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX clients_one_anon_per_tenant
  ON clients(tenant_id)
  WHERE is_anonymous = true;

-- 3. Backfill: merge existing duplicate "Walk-in"+phone NULL rows per tenant.
DO $$
DECLARE
  t_id        uuid;
  canonical   uuid;
  extra_pts   int;
BEGIN
  FOR t_id IN
    SELECT DISTINCT tenant_id
    FROM   clients
    WHERE  name = 'Walk-in' AND phone IS NULL
  LOOP
    SELECT id INTO canonical
    FROM   clients
    WHERE  tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL
    ORDER  BY created_at
    LIMIT  1;

    -- Re-point all FKs from duplicate anon rows onto the canonical one.
    UPDATE visits       SET client_id = canonical
      WHERE tenant_id = t_id AND client_id IN (
        SELECT id FROM clients
        WHERE tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL AND id <> canonical
      );

    UPDATE appointments SET client_id = canonical
      WHERE tenant_id = t_id AND client_id IN (
        SELECT id FROM clients
        WHERE tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL AND id <> canonical
      );

    UPDATE messages     SET client_id = canonical
      WHERE tenant_id = t_id AND client_id IN (
        SELECT id FROM clients
        WHERE tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL AND id <> canonical
      );

    UPDATE actions_log  SET client_id = canonical
      WHERE tenant_id = t_id AND client_id IN (
        SELECT id FROM clients
        WHERE tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL AND id <> canonical
      );

    -- Sum the loyalty points of the duplicates into the canonical row, then
    -- drop the now-orphan loyalty_points rows (UNIQUE on client_id forces this).
    SELECT COALESCE(SUM(points), 0) INTO extra_pts
    FROM   loyalty_points
    WHERE  tenant_id = t_id AND client_id IN (
      SELECT id FROM clients
      WHERE tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL AND id <> canonical
    );

    UPDATE loyalty_points
    SET    points = points + extra_pts, updated_at = now()
    WHERE  client_id = canonical;

    DELETE FROM loyalty_points
    WHERE  client_id IN (
      SELECT id FROM clients
      WHERE tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL AND id <> canonical
    );

    DELETE FROM clients
    WHERE  tenant_id = t_id AND name = 'Walk-in' AND phone IS NULL AND id <> canonical;

    UPDATE clients SET is_anonymous = true WHERE id = canonical;
  END LOOP;
END $$;

-- 4. Teach the RPC to skip loyalty for anonymous clients — a "Walk-in" bucket
--    racking up points/levels is meaningless.
CREATE OR REPLACE FUNCTION public.complete_appointment(
  p_appointment_id uuid,
  p_tenant_id      uuid,
  p_price_override numeric DEFAULT NULL,
  p_extras         jsonb   DEFAULT '[]'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_client_id      uuid;
  v_service        text;
  v_date           date;
  v_price          numeric;
  v_final_price    numeric;
  v_curr_pts       int;
  v_new_pts        int;
  v_new_level      loyalty_level;
  v_loyalty_active boolean;
  v_is_anonymous   boolean;
BEGIN
  SELECT client_id, service, date, price
  INTO   v_client_id, v_service, v_date, v_price
  FROM   appointments
  WHERE  id        = p_appointment_id
    AND  tenant_id = p_tenant_id
    AND  status    = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_available' USING ERRCODE = 'P0001';
  END IF;

  v_final_price := COALESCE(p_price_override, v_price);

  UPDATE appointments
  SET    status = 'completed'
  WHERE  id = p_appointment_id;

  SELECT loyalty_active INTO v_loyalty_active
  FROM   automations_config
  WHERE  tenant_id = p_tenant_id;

  SELECT is_anonymous INTO v_is_anonymous
  FROM   clients
  WHERE  id = v_client_id;

  IF COALESCE(v_loyalty_active, true) AND NOT COALESCE(v_is_anonymous, false) THEN
    INSERT INTO visits (tenant_id, client_id, appointment_id, service, date, price, points_earned, extras)
    VALUES (p_tenant_id, v_client_id, p_appointment_id, v_service, v_date, v_final_price, 10, COALESCE(p_extras, '[]'::jsonb));

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
  END IF;

  INSERT INTO visits (tenant_id, client_id, appointment_id, service, date, price, points_earned, extras)
  VALUES (p_tenant_id, v_client_id, p_appointment_id, v_service, v_date, v_final_price, 0, COALESCE(p_extras, '[]'::jsonb));

  RETURN json_build_object('ok', true, 'points', null, 'level', null);
END;
$function$;
