-- Client-supplied note at booking time (allergies, instructions, etc.).
-- Visible only to the owner on day-of views; not surfaced in SMS.
ALTER TABLE appointments ADD COLUMN client_note text;
ALTER TABLE appointments ADD CONSTRAINT appointments_client_note_len_chk
  CHECK (length(coalesce(client_note,'')) <= 500);
COMMENT ON COLUMN appointments.client_note IS 'Client-supplied note at booking time (allergies, instructions, etc.)';
