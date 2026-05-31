ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS multi_barber boolean NOT NULL DEFAULT false;
