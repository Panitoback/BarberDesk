-- Stripe deposit support on appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deposit_paid     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;
