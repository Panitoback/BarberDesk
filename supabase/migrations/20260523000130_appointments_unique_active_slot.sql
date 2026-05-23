-- Prevent double-booking the same (tenant, date, time) for active appointments.
-- Cancelled and no_show free the slot back up so it can be re-booked.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_unique_active_slot
  ON appointments (tenant_id, date, time)
  WHERE status IN ('pending', 'completed');

COMMENT ON INDEX appointments_unique_active_slot IS
  'Enforces one active appointment per (tenant, date, time). Cancelled and no_show appointments do not occupy the slot.';
