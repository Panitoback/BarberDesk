-- Owner-defined blocks on the calendar (vacation, lunch, sick day) that
-- prevent slots from being bookable. Independent of appointments; the slot
-- helper layers blocks on top of taken appointments to compute availability.
CREATE TABLE time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date       date NOT NULL,
  start_time time NOT NULL,
  end_time   time NOT NULL,
  reason     text,
  all_day    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (length(coalesce(reason,'')) <= 200)
);

CREATE INDEX idx_time_blocks_tenant_date ON time_blocks(tenant_id, date);

ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_blocks_owner_select ON time_blocks
  FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY time_blocks_owner_insert ON time_blocks
  FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY time_blocks_owner_update ON time_blocks
  FOR UPDATE USING (user_owns_tenant(tenant_id)) WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY time_blocks_owner_delete ON time_blocks
  FOR DELETE USING (user_owns_tenant(tenant_id));
