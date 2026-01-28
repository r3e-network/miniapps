-- Add miniapp metadata columns to miniapp_stats table
-- Run this in Supabase SQL Editor

ALTER TABLE public.miniapp_stats
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS name_zh TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS description_zh TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'utility',
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS entry_url TEXT;

-- Create index on app_id if not exists
CREATE INDEX IF NOT EXISTS miniapp_stats_app_id_idx ON public.miniapp_stats(app_id);
