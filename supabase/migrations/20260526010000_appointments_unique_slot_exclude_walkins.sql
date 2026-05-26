-- Walk-ins are served immediately and don't reserve a specific slot;
-- they should not collide with each other or with a completed appointment
-- that happened to be in the same minute. Rebuild the partial unique index
-- to ignore walk-ins. Booked appointments (walkin = false) remain protected
-- against concurrent double-booking.
DROP INDEX IF EXISTS public.appointments_unique_active_slot;
CREATE UNIQUE INDEX appointments_unique_active_slot
  ON public.appointments (tenant_id, date, "time")
  WHERE status IN ('pending'::appointment_status, 'completed'::appointment_status)
    AND walkin = false;
