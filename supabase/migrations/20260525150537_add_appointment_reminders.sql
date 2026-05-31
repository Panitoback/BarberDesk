ALTER TABLE public.automations_config
  ADD COLUMN IF NOT EXISTS reminder_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_hours  int     NOT NULL DEFAULT 24;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz NULL;
