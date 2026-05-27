-- Trigger / event-trigger helpers are invoked by Postgres itself, never via
-- PostgREST. Revoking EXECUTE from anon/authenticated/public removes the
-- /rest/v1/rpc/* exposure flagged by the Supabase security advisor.
REVOKE EXECUTE ON FUNCTION public.init_client_loyalty()  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.init_tenant_defaults() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_last_visit()    FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()      FROM anon, authenticated, public;
