-- Add read_at column to track which inbound messages the owner has seen
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL;

-- Enable Realtime on messages so the dashboard gets live badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
