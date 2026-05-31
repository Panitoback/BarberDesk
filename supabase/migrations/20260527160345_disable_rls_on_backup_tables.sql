-- The rls_auto_enable event trigger turned RLS on when the backup tables
-- were created in public. They are now in the backup schema with anon/
-- authenticated revoked, so RLS without policies just trips the advisor for
-- nothing. Drop it.
ALTER TABLE backup.backup_20260527_clients        DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup.backup_20260527_visits         DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup.backup_20260527_appointments   DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup.backup_20260527_messages       DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup.backup_20260527_actions_log    DISABLE ROW LEVEL SECURITY;
ALTER TABLE backup.backup_20260527_loyalty_points DISABLE ROW LEVEL SECURITY;
