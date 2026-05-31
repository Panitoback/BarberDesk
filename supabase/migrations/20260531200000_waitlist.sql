CREATE TABLE public.waitlist (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  phone       text        NOT NULL,
  service     text        NOT NULL,
  date        date        NOT NULL,
  notified_at timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- All access is via admin client — no user-facing RLS policies needed.
-- Index covers the notification query: first unnotified entry per tenant+date+service.
CREATE INDEX idx_waitlist_notify
  ON public.waitlist (tenant_id, date, service, created_at)
  WHERE notified_at IS NULL;
