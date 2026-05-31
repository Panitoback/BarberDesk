ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS barber_id uuid NULL
    REFERENCES public.barbers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appts_barber_date
  ON public.appointments (barber_id, date)
  WHERE barber_id IS NOT NULL;
