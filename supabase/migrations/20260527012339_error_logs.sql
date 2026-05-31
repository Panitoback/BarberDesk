-- Lightweight error capture for debugging during pre-launch testing.
-- Server-side errors come from lib/error-logger.ts (service-role insert).
-- Client-side errors come from /api/errors (also service-role insert).
-- Owners can read their own tenant's errors via RLS; admin uses service-role
-- to query across tenants.

CREATE TABLE public.error_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL,                            -- 'server' | 'client'
  route         text,                                     -- e.g. '/api/walkin' or '/dashboard'
  method        text,                                     -- 'POST', 'GET', etc.
  status        int,                                      -- HTTP status if applicable
  tenant_id     uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id       uuid,                                     -- auth.users.id, no FK to keep insert lenient
  message       text NOT NULL,
  error_code    text,                                     -- '23505', 'P0001', etc.
  stack         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_body  jsonb                                     -- sanitized: password/token/secret stripped
);

CREATE INDEX error_logs_created_at_idx ON public.error_logs (created_at DESC);
CREATE INDEX error_logs_tenant_id_idx  ON public.error_logs (tenant_id) WHERE tenant_id IS NOT NULL;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Owners read their own tenant errors (admin queries via service-role).
CREATE POLICY error_logs_select_own ON public.error_logs
  FOR SELECT
  USING (tenant_id IS NOT NULL AND public.user_owns_tenant(tenant_id));

-- No INSERT/UPDATE/DELETE policies — only service-role can write.
