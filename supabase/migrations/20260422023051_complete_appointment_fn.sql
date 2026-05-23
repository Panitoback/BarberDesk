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
  v_servicio  text;
  v_fecha     date;
  v_curr_pts  int;
  v_new_pts   int;
  v_new_level loyalty_level;
BEGIN
  -- Lock row and validate: must exist, belong to tenant, and be pending
  SELECT client_id, servicio, fecha
  INTO   v_client_id, v_servicio, v_fecha
  FROM   citas
  WHERE  id        = p_appointment_id
    AND  tenant_id = p_tenant_id
    AND  estado    = 'pendiente'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_available' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Mark completed
  UPDATE citas
  SET    estado = 'completada'
  WHERE  id = p_appointment_id;

  -- 2. Record visit (10 pts per visit, matches POINTS_PER_VISIT in lib/loyalty.ts)
  INSERT INTO visits (tenant_id, client_id, servicio, fecha, puntos_ganados)
  VALUES (p_tenant_id, v_client_id, v_servicio, v_fecha, 10);

  -- 3. Calculate and update loyalty points
  SELECT puntos INTO v_curr_pts
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
  SET    puntos = v_new_pts, nivel = v_new_level, updated_at = now()
  WHERE  client_id = v_client_id AND tenant_id = p_tenant_id;

  -- 4. Log action
  INSERT INTO actions_log (tenant_id, client_id, tipo, metadata)
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
