## ⚡ Quick Setup Guide

### Step 1: Update Supabase Schema (REQUIRED)

Copy and paste this SQL into [Supabase SQL Editor](https://app.supabase.com/project/dmonstzalbldzzdbbcdj/sql):

```sql
ALTER TABLE public.miniapp_stats
ADD COLUMN IF NOT EXISTS app_short_id TEXT,
ADD COLUMN IF NOT EXISTS category_name TEXT,
ADD COLUMN IF NOT EXISTS category_name_zh TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS developer_name TEXT,
ADD COLUMN IF NOT EXISTS developer_email TEXT,
ADD COLUMN IF NOT EXISTS developer_website TEXT,
ADD COLUMN IF NOT EXISTS contract_address TEXT,
ADD COLUMN IF NOT EXISTS supported_networks JSONB DEFAULT '["neo-n3-mainnet"]'::jsonb,
ADD COLUMN IF NOT EXISTS default_network TEXT DEFAULT 'neo-n3-mainnet',
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS feature_stateless BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_offline_support BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_deeplink TEXT,
ADD COLUMN IF NOT EXISTS state_source_type TEXT,
ADD COLUMN IF NOT EXISTS state_source_endpoints JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS platform_analytics BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_ratings BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_transactions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manifest_json JSONB,
ADD COLUMN IF NOT EXISTS searchable_text TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS miniapp_stats_category_idx ON public.miniapp_stats(category);
CREATE INDEX IF NOT EXISTS miniapp_stats_is_active_idx ON public.miniapp_stats(is_active);
CREATE INDEX IF NOT EXISTS miniapp_stats_is_featured_idx ON public.miniapp_stats(is_featured);
CREATE INDEX IF NOT EXISTS miniapp_stats_popularity_idx ON public.miniapp_stats(popularity_score DESC);
CREATE INDEX IF NOT EXISTS miniapp_stats_search_idx ON public.miniapp_stats USING GIN (to_tsvector('english', searchable_text));
```

Click **Run** (or press Ctrl+Enter).

### Step 2: Verify Schema

```bash
pnpm supabase:list
```

### Step 3: Register All Miniapps

After schema update:

```bash
pnpm register:full
```

---

## Current Status

- ✅ 44 miniapps already registered
- ⏳ 28 columns need to be added for full functionality
- 📝 SQL ready to execute in Supabase Dashboard

---

## What Gets Added

| Feature               | Columns                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| **Short IDs**         | app_short_id                                                                   |
| **Category Display**  | category_name, category_name_zh                                                |
| **Tags**              | tags (JSONB)                                                                   |
| **Developer Info**    | developer_name, developer_email, developer_website                             |
| **Network/Contract**  | contract_address, supported_networks, default_network                          |
| **Features**          | permissions, feature_stateless, feature_offline_support, feature_deeplink      |
| **State Source**      | state_source_type, state_source_endpoints                                      |
| **Platform Features** | platform_analytics, platform_comments, platform_ratings, platform_transactions |
| **Status**            | is_featured, is_verified, is_active, sort_order, popularity_score              |
| **Metadata**          | last_used_at, manifest_json, searchable_text                                   |
