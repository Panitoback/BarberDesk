-- Migration: shop gallery table for tenant photo portfolios

CREATE TABLE IF NOT EXISTS shop_gallery (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  photo_path    TEXT NOT NULL,
  caption       TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shop_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_gallery_tenant_isolation"
  ON shop_gallery
  FOR ALL
  USING (user_owns_tenant(tenant_id));
