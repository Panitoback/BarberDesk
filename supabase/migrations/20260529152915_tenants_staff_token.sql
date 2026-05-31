ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS staff_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS tenants_staff_token_idx
  ON public.tenants (staff_token);
