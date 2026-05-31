-- The previous migration created backup tables in public, which exposed them
-- via PostgREST and polluted the generated TypeScript types. Move them to a
-- private schema PostgREST doesn't introspect. Idempotent for fresh installs
-- (the create_schema in 20260527000004 also runs there; we just keep this as
-- a no-op safety net for environments where the prior migration already ran
-- with public-scoped backups).
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated, public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'backup_20260527_clients') THEN
    ALTER TABLE public.backup_20260527_clients        SET SCHEMA backup;
    ALTER TABLE public.backup_20260527_visits         SET SCHEMA backup;
    ALTER TABLE public.backup_20260527_appointments   SET SCHEMA backup;
    ALTER TABLE public.backup_20260527_messages       SET SCHEMA backup;
    ALTER TABLE public.backup_20260527_actions_log    SET SCHEMA backup;
    ALTER TABLE public.backup_20260527_loyalty_points SET SCHEMA backup;
  END IF;
END $$;
