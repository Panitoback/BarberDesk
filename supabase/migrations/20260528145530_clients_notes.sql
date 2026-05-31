-- Owner-only free-text notes per client (e.g. "prefers fade #2, allergic to X").
-- Visible on the client detail page and as a tooltip on day-of appointment cards.
ALTER TABLE clients ADD COLUMN notes text;
COMMENT ON COLUMN clients.notes IS 'Owner-only free-text notes about the client';
