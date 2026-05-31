CREATE TABLE IF NOT EXISTS public.barbers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  active         boolean     NOT NULL DEFAULT true,
  email          text        NULL,
  photo_path     text        NULL,
  bio            text        NULL CHECK (char_length(bio) <= 200),
  price_modifier numeric     NOT NULL DEFAULT 1.0,
  hours          jsonb       NULL,
  display_order  int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_barbers_tenant_active
  ON public.barbers (tenant_id, active);

CREATE POLICY barbers_owner_select ON public.barbers
  FOR SELECT USING (user_owns_tenant(tenant_id));

CREATE POLICY barbers_owner_insert ON public.barbers
  FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));

CREATE POLICY barbers_owner_update ON public.barbers
  FOR UPDATE USING (user_owns_tenant(tenant_id))
  WITH CHECK (user_owns_tenant(tenant_id));

CREATE POLICY barbers_owner_delete ON public.barbers
  FOR DELETE USING (user_owns_tenant(tenant_id));
