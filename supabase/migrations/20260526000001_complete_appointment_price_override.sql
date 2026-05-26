-- Adds optional p_price_override to complete_appointment.
-- When provided (e.g. base price + extra perks added in the dashboard),
-- it overrides the stored appointments.price in the resulting visit row.
-- When NULL, falls back to appointments.price as before.

CREATE OR REPLACE FUNCTION public.complete_appointment(
  p_appointment_id uuid,
  p_tenant_id      uuid,
  p_price_override numeric DEFAULT NULL
)
 RETURNS json
 LANGUAGE plpgsql
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

  -- Use the override if the owner adjusted the total (extra perks),
  -- otherwise fall back to the booking price.
  v_final_price := COALESCE(p_price_override, v_price);

  UPDATE appointments
  SET    status = 'completed'
  WHERE  id = p_appointment_id;

  SELECT loyalty_active INTO v_loyalty_active
  FROM   automations_config
  WHERE  tenant_id = p_tenant_id;

  IF COALESCE(v_loyalty_active, true) THEN
    INSERT INTO visits (tenant_id, client_id, service, date, price, points_earned)
    VALUES (p_tenant_id, v_client_id, v_service, v_date, v_final_price, 10);

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

  INSERT INTO visits (tenant_id, client_id, service, date, price, points_earned)
  VALUES (p_tenant_id, v_client_id, v_service, v_date, v_final_price, 0);

  RETURN json_build_object('ok', true, 'points', null, 'level', null);
END;
$function$;
