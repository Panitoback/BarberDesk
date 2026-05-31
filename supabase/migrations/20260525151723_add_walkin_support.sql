ALTER TABLE public.clients
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS walkin boolean NOT NULL DEFAULT false;
