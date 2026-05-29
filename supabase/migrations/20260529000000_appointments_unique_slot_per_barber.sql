-- Multi-barber shops need two different barbers to book the same slot simultaneously.
-- The previous index keyed on (tenant_id, date, time) alone, which blocked that.
-- New index adds barber_id with NULLS NOT DISTINCT so that:
--   • Two bookings for the SAME barber (or both legacy NULL) at the same slot → 23505
--   • Two bookings for DIFFERENT barbers at the same slot → allowed
DROP INDEX IF EXISTS public.appointments_unique_active_slot;

CREATE UNIQUE INDEX appointments_unique_active_slot
  ON public.appointments (tenant_id, date, "time", barber_id)
  NULLS NOT DISTINCT
  WHERE status IN ('pending'::appointment_status, 'completed'::appointment_status)
    AND walkin = false;
