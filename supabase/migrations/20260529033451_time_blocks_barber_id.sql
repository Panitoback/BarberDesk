ALTER TABLE public.time_blocks
  ADD COLUMN IF NOT EXISTS barber_id uuid NULL
    REFERENCES public.barbers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_time_blocks_barber
  ON public.time_blocks (barber_id)
  WHERE barber_id IS NOT NULL;
