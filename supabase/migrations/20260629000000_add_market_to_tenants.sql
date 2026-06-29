-- Migration: add market column to tenants

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'barber'
    CHECK (market IN ('barber', 'salon'));
