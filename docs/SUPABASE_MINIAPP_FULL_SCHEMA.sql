-- Complete Miniapp Schema for Supabase
-- This schema supports listing, sorting, categorizing, and full miniapp management

-- Drop existing view if it exists (will recreate after schema update)
DROP VIEW IF EXISTS public.miniapp_registry_view;

-- ============================================================
-- MINIAPP_STATS - Main miniapp registry table
-- ============================================================

-- Add new columns to existing miniapp_stats table
ALTER TABLE public.miniapp_stats
ADD COLUMN IF NOT EXISTS app_short_id TEXT,                    -- Short ID (e.g., "prediction-market")
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0',          -- App version
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'utility',       -- Primary category
ADD COLUMN IF NOT EXISTS category_name TEXT,                    -- Display category name
ADD COLUMN IF NOT EXISTS category_name_zh TEXT,                 -- Display category name (Chinese)
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,        -- Tags array
ADD COLUMN IF NOT EXISTS developer_name TEXT,                   -- Developer name
ADD COLUMN IF NOT EXISTS developer_email TEXT,                  -- Developer email
ADD COLUMN IF NOT EXISTS developer_website TEXT,                -- Developer website
ADD COLUMN IF NOT EXISTS contract_address TEXT,                 -- Smart contract address
ADD COLUMN IF NOT EXISTS supported_networks JSONB DEFAULT '["neo-n3-mainnet"]'::jsonb,
ADD COLUMN IF NOT EXISTS default_network TEXT DEFAULT 'neo-n3-mainnet',
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb, -- Required permissions
ADD COLUMN IF NOT EXISTS feature_stateless BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_offline_support BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_deeplink TEXT,                 -- Deep link URL
ADD COLUMN IF NOT EXISTS state_source_type TEXT,                -- State source type
ADD COLUMN IF NOT EXISTS state_source_endpoints JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS platform_analytics BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_ratings BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_transactions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,     -- Featured apps
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,     -- Verified by platform
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,        -- Active status
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,          -- Manual sort order
ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0,    -- Popularity metric
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,              -- Last usage timestamp
ADD COLUMN IF NOT EXISTS manifest_json JSONB,                    -- Full manifest storage
ADD COLUMN IF NOT EXISTS searchable_text TEXT;                  -- For full-text search

-- ============================================================
-- INDEXES for performance
-- ============================================================

-- Basic lookup indexes
CREATE INDEX IF NOT EXISTS miniapp_stats_app_short_id_idx ON public.miniapp_stats(app_short_id);
CREATE INDEX IF NOT EXISTS miniapp_stats_category_idx ON public.miniapp_stats(category);
CREATE INDEX IF NOT EXISTS miniapp_stats_developer_idx ON public.miniapp_stats(developer_name);

-- Status and featured indexes
CREATE INDEX IF NOT EXISTS miniapp_stats_is_active_idx ON public.miniapp_stats(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS miniapp_stats_is_featured_idx ON public.miniapp_stats(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS miniapp_stats_is_verified_idx ON public.miniapp_stats(is_verified) WHERE is_verified = true;

-- Sorting and filtering indexes
CREATE INDEX IF NOT EXISTS miniapp_stats_popularity_idx ON public.miniapp_stats(popularity_score DESC);
CREATE INDEX IF NOT EXISTS miniapp_stats_view_count_idx ON public.miniapp_stats(view_count DESC);
CREATE INDEX IF NOT EXISTS miniapp_stats_rating_idx ON public.miniapp_stats(rating DESC);
CREATE INDEX IF NOT EXISTS miniapp_stats_created_at_idx ON public.miniapp_stats(created_at DESC);
CREATE INDEX IF NOT EXISTS miniapp_stats_updated_at_idx ON public.miniapp_stats(updated_at DESC);

-- JSONB indexes for tag and network queries
CREATE INDEX IF NOT EXISTS miniapp_stats_tags_idx ON public.miniapp_stats USING GIN (tags);
CREATE INDEX IF NOT EXISTS miniapp_stats_networks_idx ON public.miniapp_stats USING GIN (supported_networks);

-- Full-text search index
CREATE INDEX IF NOT EXISTS miniapp_stats_search_idx ON public.miniapp_stats USING GIN (to_tsvector('english', searchable_text));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS miniapp_stats_active_category_idx ON public.miniapp_stats(category, popularity_score DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS miniapp_stats_active_featured_idx ON public.miniapp_stats(is_featured, sort_order) WHERE is_active = true;

-- ============================================================
-- CATEGORIES table for managed categories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.miniapp_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_zh TEXT,
  description TEXT,
  description_zh TEXT,
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW
);

-- Insert default categories
INSERT INTO public.miniapp_categories (id, name, name_zh, sort_order) VALUES
  ('finance', 'Finance', '金融', 1),
  ('social', 'Social', '社交', 2),
  ('gaming', 'Gaming', '游戏', 3),
  ('utility', 'Utility', '工具', 4),
  ('nft', 'NFT', 'NFT', 5),
  ('dao', 'DAO', 'DAO', 6),
  ('defi', 'DeFi', 'DeFi', 7),
  ('education', 'Education', '教育', 8),
  ('entertainment', 'Entertainment', '娱乐', 9),
  ('other', 'Other', '其他', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VIEW for convenient querying
-- ============================================================
CREATE OR REPLACE VIEW public.miniapp_registry_view AS
SELECT
  app_id,
  app_short_id,
  name,
  name_zh,
  description,
  description_zh,
  version,
  category,
  category_name,
  category_name_zh,
  tags,
  developer_name,
  logo_url,
  banner_url,
  entry_url,
  contract_address,
  supported_networks,
  default_network,
  is_featured,
  is_verified,
  is_active,
  view_count,
  rating,
  rating_count,
  popularity_score,
  created_at,
  updated_at
FROM public.miniapp_stats
WHERE is_active = true;

-- ============================================================
-- TRIGGERS for maintaining searchable_text and timestamps
-- ============================================================

-- Function to update searchable_text
CREATE OR REPLACE FUNCTION public.update_miniapp_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.searchable_text := COALESCE(NEW.name, '') || ' ' ||
                         COALESCE(NEW.name_zh, '') || ' ' ||
                         COALESCE(NEW.description, '') || ' ' ||
                         COALESCE(NEW.description_zh, '') || ' ' ||
                         COALESCE(NEW.developer_name, '') || ' ' ||
                         COALESCE(ARRAY_TO_STRING(ARRAY(SELECT jsonb_array_elements_text(NEW.tags)), ' '), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER miniapp_searchable_text_trigger
  BEFORE INSERT OR UPDATE ON public.miniapp_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_miniapp_searchable_text();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_miniapp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER miniapp_timestamp_trigger
  BEFORE UPDATE ON public.miniapp_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_miniapp_timestamp();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_miniapp_views(p_app_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  UPDATE public.miniapp_stats
  SET view_count = view_count + 1,
      last_used_at = NOW(),
      popularity_score = popularity_score + 1
  WHERE app_id = p_app_id;
  RETURN (SELECT view_count FROM public.miniapp_stats WHERE app_id = p_app_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search miniapps
CREATE OR REPLACE FUNCTION public.search_miniapps(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT NULL,
  featured_only BOOLEAN DEFAULT false,
  verified_only BOOLEAN DEFAULT false,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  app_id TEXT,
  app_short_id TEXT,
  name TEXT,
  name_zh TEXT,
  description TEXT,
  category TEXT,
  developer_name TEXT,
  logo_url TEXT,
  banner_url TEXT,
  entry_url TEXT,
  view_count BIGINT,
  rating DECIMAL,
  is_featured BOOLEAN,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.app_id,
    m.app_short_id,
    m.name,
    m.name_zh,
    m.description,
    m.category,
    m.developer_name,
    m.logo_url,
    m.banner_url,
    m.entry_url,
    m.view_count,
    m.rating,
    m.is_featured,
    m.is_verified
  FROM public.miniapp_stats m
  WHERE m.is_active = true
    AND (category_filter IS NULL OR m.category = category_filter)
    AND (featured_only = false OR m.is_featured = true)
    AND (verified_only = false OR m.is_verified = true)
    AND (search_query = '' OR to_tsvector('english', m.searchable_text) @@ plainto_tsquery('english', search_query))
  ORDER BY
    CASE WHEN m.is_featured THEN 0 ELSE 1 END,
    m.popularity_score DESC,
    m.view_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.miniapp_stats ENABLE ROW LEVEL SECURITY;

-- Public can read active miniapps
CREATE POLICY "Public can view active miniapps"
  ON public.miniapp_stats FOR SELECT
  USING (is_active = true);

-- Service role can do everything
CREATE POLICY "Service role full access"
  ON public.miniapp_stats FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Only service role can insert/update/delete
CREATE POLICY "Service role can insert"
  ON public.miniapp_stats FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can update"
  ON public.miniapp_stats FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can delete"
  ON public.miniapp_stats FOR DELETE
  USING (auth.jwt()->>'role' = 'service_role');

-- Enable RLS for categories
ALTER TABLE public.miniapp_categories ENABLE ROW LEVEL SECURITY;

-- Public can read categories
CREATE POLICY "Public can view categories"
  ON public.miniapp_categories FOR SELECT
  USING (is_active = true);

-- Service role full access to categories
CREATE POLICY "Service role full access to categories"
  ON public.miniapp_categories FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
