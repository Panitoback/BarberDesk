-- Snapshot of service duration on each appointment, so changing a service's
-- duration in /settings later doesn't retroactively shift booked appointments.
-- Restricted to the 30-min grid multiples the slot picker supports.
ALTER TABLE appointments ADD COLUMN duration_min int NOT NULL DEFAULT 30
  CHECK (duration_min IN (30, 45, 60, 90));
COMMENT ON COLUMN appointments.duration_min IS 'Snapshot of service duration in minutes at booking time';
