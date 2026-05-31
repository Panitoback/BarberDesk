ALTER TABLE public.automations_config
  ADD COLUMN IF NOT EXISTS flash_discount_pct int NOT NULL DEFAULT 20;
