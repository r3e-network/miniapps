# Miniapp Registration API - Complete Guide

## Overview

The miniapp registration system stores comprehensive data about each miniapp to support:

- **Listing**: Browse all available miniapps
- **Sorting**: By popularity, rating, views, date
- **Categorizing**: Filter by category, tags, developer
- **Searching**: Full-text search across names, descriptions
- **Discovery**: Featured apps, new apps, verified apps

## Schema Overview

### Main Table: `miniapp_stats`

| Column                    | Type        | Description                                   |
| ------------------------- | ----------- | --------------------------------------------- |
| **Basic Info**            |             |                                               |
| `app_id`                  | TEXT        | Unique ID (e.g., `miniapp-prediction-market`) |
| `app_short_id`            | TEXT        | Short ID (e.g., `prediction-market`)          |
| `name`                    | TEXT        | Display name (English)                        |
| `name_zh`                 | TEXT        | Display name (Chinese)                        |
| `description`             | TEXT        | Description (English)                         |
| `description_zh`          | TEXT        | Description (Chinese)                         |
| `version`                 | TEXT        | App version                                   |
| **Category & Tags**       |             |                                               |
| `category`                | TEXT        | Primary category slug                         |
| `category_name`           | TEXT        | Category display name                         |
| `category_name_zh`        | TEXT        | Category display name (Chinese)               |
| `tags`                    | JSONB       | Array of tags                                 |
| **Developer**             |             |                                               |
| `developer_name`          | TEXT        | Developer name                                |
| `developer_email`         | TEXT        | Developer email                               |
| `developer_website`       | TEXT        | Developer website URL                         |
| **Assets**                |             |                                               |
| `logo_url`                | TEXT        | Logo image URL                                |
| `banner_url`              | TEXT        | Banner image URL                              |
| `entry_url`               | TEXT        | Entry point URL                               |
| **Network**               |             |                                               |
| `contract_address`        | TEXT        | Smart contract address                        |
| `contracts`               | JSONB       | Per-network contract metadata                 |
| `default_network`         | TEXT        | Default network ID                            |
| **Features**              |             |                                               |
| `permissions`             | JSONB       | Required permissions                          |
| `feature_stateless`       | BOOLEAN     | Stateless operation                           |
| `feature_offline_support` | BOOLEAN     | Offline support                               |
| `feature_deeplink`        | TEXT        | Deep link URL                                 |
| **Status**                |             |                                               |
| `is_featured`             | BOOLEAN     | Featured app                                  |
| `is_verified`             | BOOLEAN     | Verified by platform                          |
| `is_active`               | BOOLEAN     | Active status                                 |
| `sort_order`              | INTEGER     | Manual sort order                             |
| `popularity_score`        | INTEGER     | Popularity metric                             |
| **Stats**                 |             |                                               |
| `view_count`              | BIGINT      | Total views                                   |
| `rating`                  | DECIMAL     | Average rating                                |
| `rating_count`            | INTEGER     | Number of ratings                             |
| **Metadata**              |             |                                               |
| `manifest_json`           | JSONB       | Full manifest storage                         |
| `searchable_text`         | TEXT        | Full-text search field                        |
| `created_at`              | TIMESTAMPTZ | Creation timestamp                            |
| `updated_at`              | TIMESTAMPTZ | Update timestamp                              |

## API Usage Examples

### 1. List All Active Miniapps

```bash
curl "${SUPABASE_URL}/rest/v1/miniapp_stats?select=*&is_active=eq.true&order=popularity_score.desc&limit=20" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

**JavaScript/TypeScript:**

```typescript
const response = await fetch(
    `${SUPABASE_URL}/rest/v1/miniapp_stats?select=*&is_active=eq.true&order=popularity_score.desc&limit=20`,
    {
        headers: { apikey: SUPABASE_ANON_KEY },
    },
);
const miniapps = await response.json();
```

### 2. Get by Category

```bash
curl "${SUPABASE_URL}/rest/v1/miniapp_stats?category=eq.finance&is_active=eq.true&order=view_count.desc" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

**Response:**

```json
[
    {
        "app_id": "miniapp-charity-vault",
        "name": "Charity Vault",
        "name_zh": "慈善金库",
        "category": "finance",
        "category_name": "Finance",
        "logo_url": "...",
        "entry_url": "...",
        "view_count": 1500,
        "rating": 4.5
    }
]
```

### 3. Search Miniapps

```bash
curl "${SUPABASE_URL}/rest/v1/miniapp_stats?select=*&searchable_text=fts.prediction" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

**JavaScript:**

```typescript
const searchMiniapps = async (query: string) => {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/miniapp_stats?select=app_id,name,name_zh,description,logo_url,rating&view_count=gt.0&order=popularity_score.desc`,
        {
            method: "POST",
            headers: {
                apikey: SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: `SELECT * FROM miniapp_stats WHERE to_tsvector('english', searchable_text) @@ plainto_tsquery('english', '${query}')`,
            }),
        },
    );
    return response.json();
};
```

### 4. Filter by Tags

```bash
# Using JSONB contains operator
curl "${SUPABASE_URL}/rest/v1/miniapp_stats?tags=cs.{\"finance\"}&is_active=eq.true" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

### 5. Get Featured Apps

```bash
curl "${SUPABASE_URL}/rest/v1/miniapp_stats?is_featured=eq.true&is_active=eq.true&order=sort_order.asc" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

### 6. Get by Developer

```bash
curl "${SUPABASE_URL}/rest/v1/miniapp_stats?developer_name=eq.R3E%20Network&is_active=eq.true" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

### 7. Sort Options

| Sort Field              | Description                 |
| ----------------------- | --------------------------- |
| `popularity_score.desc` | Most popular first          |
| `view_count.desc`       | Most viewed first           |
| `rating.desc`           | Highest rated first         |
| `created_at.desc`       | Newest first                |
| `name.asc`              | Alphabetical A-Z            |
| `sort_order.asc`        | Manual order (for featured) |

### 8. Using the Search Function

```bash
curl "${SUPABASE_URL}/rest/v1/rpc/search_miniapps" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "search_query": "prediction",
    "category_filter": "finance",
    "featured_only": false,
    "verified_only": true,
    "limit_count": 10,
    "offset_count": 0
  }'
```

### 9. Increment View Count

```bash
curl "${SUPABASE_URL}/rest/v1/rpc/increment_miniapp_views" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"p_app_id": "miniapp-prediction-market"}'
```

### 10. Get Single Miniapp

```bash
curl "${SUPABASE_URL}/rest/v1/miniapp_stats?app_id=eq.miniapp-prediction-market&select=*" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

**Response includes full manifest:**

```json
{
  "app_id": "miniapp-prediction-market",
  "app_short_id": "prediction-market",
  "name": "Prediction Market",
  "name_zh": "预测市场",
  "description": "Prediction Market miniapp on Neo N3",
  "category": "other",
  "tags": ["other"],
  "developer_name": "R3E Network",
  "logo_url": "https://...",
  "banner_url": "https://...",
  "entry_url": "https://meshmini.app/miniapps/prediction-market/index.html",
  "contract_address": "0x0000000000000000000000000000000000000000",
  "contracts": {
    "neo-n3-mainnet": { "address": "0x0000000000000000000000000000000000000000", "active": true },
    "neo-n3-testnet": { "address": null, "active": false }
  },
  "default_network": "neo-n3-mainnet",
  "permissions": ["invoke:primary", "read:blockchain"],
  "feature_stateless": true,
  "platform_analytics": true,
  "is_featured": false,
  "is_verified": false,
  "is_active": true,
  "view_count": 0,
  "rating": 0,
  "popularity_score": 0,
  "manifest_json": {...},
  "created_at": "2026-01-26T12:00:00Z",
  "updated_at": "2026-01-26T12:00:00Z"
}
```

## Common Query Patterns

### Homepage - Featured + Popular

```typescript
const getHomepageData = async () => {
    const [featured, popular, newApps] = await Promise.all([
        // Featured apps (manual order)
        fetch(
            `${SUPABASE_URL}/rest/v1/miniapp_stats?is_featured=eq.true&is_active=eq.true&order=sort_order.asc&limit=5`,
        ),
        // Popular apps
        fetch(
            `${SUPABASE_URL}/rest/v1/miniapp_stats?is_active=eq.true&order=popularity_score.desc&limit=10`,
        ),
        // New apps
        fetch(
            `${SUPABASE_URL}/rest/v1/miniapp_stats?is_active=eq.true&order=created_at.desc&limit=10`,
        ),
    ]);

    return {
        featured: await featured.json(),
        popular: await popular.json(),
        new: await newApps.json(),
    };
};
```

### Category Page

```typescript
const getCategoryPage = async (category: string, page: number = 0) => {
    const limit = 20;
    const offset = page * limit;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/miniapp_stats?category=eq.${category}&is_active=eq.true&order=popularity_score.desc&limit=${limit}&offset=${offset}`,
    );

    const miniapps = await response.json();
    return miniapps;
};
```

### Search with Filters

```typescript
const searchMiniapps = async (params: {
    query?: string;
    category?: string;
    tags?: string[];
    verified?: boolean;
    sort?: "popular" | "rating" | "newest";
    page?: number;
}) => {
    const {
        query,
        category,
        tags,
        verified,
        sort = "popular",
        page = 0,
    } = params;
    const limit = 20;
    const offset = page * limit;

    const searchParams = new URLSearchParams();
    searchParams.append("is_active", "eq.true");
    if (category) searchParams.append("category", `eq.${category}`);
    if (verified) searchParams.append("is_verified", "eq.true");
    if (tags?.length)
        searchParams.append("tags", `cs.{${JSON.stringify(tags)}}`);

    const sortMap = {
        popular: "popularity_score.desc",
        rating: "rating.desc",
        newest: "created_at.desc",
    };
    searchParams.append("order", sortMap[sort]);
    searchParams.append("limit", limit.toString());
    searchParams.append("offset", offset.toString());

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/miniapp_stats?select=*&${searchParams.toString()}`,
    );

    return response.json();
};
```

## Setup Instructions

### 1. Run Schema Update

```bash
# In Supabase SQL Editor, run:
cat docs/SUPABASE_MINIAPP_FULL_SCHEMA.sql
```

### 2. Register Miniapps

```bash
# Register all miniapps with full data
node scripts/deploy/to-supabase-full.js
```

### 3. Add npm scripts

```json
{
    "scripts": {
        "register:full": "node scripts/deploy/to-supabase-full.js"
    }
}
```

## Categories Reference

| ID              | Name (EN)     | Name (ZH) |
| --------------- | ------------- | --------- |
| `finance`       | Finance       | 金融      |
| `social`        | Social        | 社交      |
| `gaming`        | Gaming        | 游戏      |
| `utility`       | Utility       | 工具      |
| `nft`           | NFT           | NFT       |
| `dao`           | DAO           | DAO       |
| `defi`          | DeFi          | DeFi      |
| `education`     | Education     | 教育      |
| `entertainment` | Entertainment | 娱乐      |
| `other`         | Other         | 其他      |

## Supabase Client Example

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get active miniapps
const { data: miniapps } = await supabase
    .from("miniapp_stats")
    .select("*")
    .eq("is_active", true)
    .order("popularity_score", { ascending: false })
    .limit(20);

// Filter by category
const { data: financeApps } = await supabase
    .from("miniapp_stats")
    .select("*")
    .eq("category", "finance")
    .eq("is_active", true);

// Search using RPC
const { data: searchResults } = await supabase.rpc("search_miniapps", {
    search_query: "prediction",
    category_filter: null,
    limit_count: 10,
});
```
