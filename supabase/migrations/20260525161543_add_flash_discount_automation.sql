ALTER TABLE public.automations_config
  ADD COLUMN IF NOT EXISTS flash_active boolean NOT NULL DEFAULT false;
