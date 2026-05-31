ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS preferred_barber_id uuid NULL
    REFERENCES public.barbers(id) ON DELETE SET NULL;
