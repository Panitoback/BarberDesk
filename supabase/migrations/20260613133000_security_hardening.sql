-- Security hardening (audit 2026-06-13)
--
-- 1. Pin search_path on SECURITY-relevant functions that were still mutable.
--    The 4-arg complete_appointment(uuid,uuid,numeric,jsonb) — the one the app
--    calls — already pins it; this covers the legacy 3-arg overload and
--    redeem_loyalty_reward. ALTER FUNCTION leaves the body untouched.
ALTER FUNCTION public.complete_appointment(uuid, uuid, numeric)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.redeem_loyalty_reward(uuid, uuid, uuid, text)
  SET search_path = public, pg_temp;

-- 2. Explicit RLS policy on waitlist. It has RLS enabled but no policies, so it
--    works only through the service-role admin client. This lets the owner's
--    RLS-scoped dashboard client read its own waitlist; the admin client used
--    by /api/waitlist bypasses RLS regardless.
DROP POLICY IF EXISTS waitlist_owner_all ON public.waitlist;
CREATE POLICY waitlist_owner_all ON public.waitlist
  FOR ALL
  USING (public.user_owns_tenant(tenant_id))
  WITH CHECK (public.user_owns_tenant(tenant_id));
