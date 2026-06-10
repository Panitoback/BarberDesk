-- Migration: add haircut_photo_url to appointments

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS haircut_photo_url TEXT;
