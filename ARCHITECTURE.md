# Neo MiniApps Architecture

## Overview

Neo MiniApps are **stateless web applications** that:
1. Load from CDN (Cloudflare R2)
2. Get state from smart contracts or external APIs
3. Are registered via `neo-manifest.json`
4. Have analytics/tracking managed by the platform

## neo-manifest.json Schema

The manifest is the **source of truth** for miniapp metadata.

```json
{
  "$schema": "https://schemas.r3e.network/miniapp-manifest/v1.json",
  
  "id": "lottery",
  "name": "Lottery",
  "name_zh": "彩票游戏",
  "version": "1.0.0",
  
  "description": "Decentralized lottery game with transparent drawing",
  "description_zh": "去中心化彩票游戏，透明开奖",
  
  "category": "games",
  "category_name": "Games",
  "category_name_zh": "游戏",
  "tags": ["lottery", "gaming", "neo-n3"],
  
  "developer": {
    "name": "R3E Network",
    "email": "dev@r3e.network",
    "website": "https://r3e.network"
  },
  
  "contracts": {
    "neo-n3-mainnet": "0x1234567890abcdef1234567890abcdef12345678",
    "neo-n3-testnet": "0xabcdef1234567890abcdef1234567890abcdef12"
  },
  
  "supported_networks": ["neo-n3-mainnet"],
  "default_network": "neo-n3-mainnet",
  
  "urls": {
    "entry": "/index.html",
    "icon": "/logo.png",
    "banner": "/banner.png"
  },
  
  "permissions": ["invoke:primary", "read:blockchain"],
  
  "features": {
    "stateless": true,
    "offlineSupport": false,
    "deeplink": "neomainapp://lottery"
  },
  
  "stateSource": {
    "type": "smart-contract",
    "chain": "neo-n3-mainnet",
    "endpoints": ["https://neoxrpc1.blackholelabs.io"]
  },
  
  "platform": {
    "analytics": true,
    "comments": true,
    "ratings": true,
    "transactions": true
  },
  
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-26T12:00:00Z"
}
```

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique miniapp identifier |
| `name` | string | English name |
| `name_zh` | string | Chinese name |
| `description` | string | English description |
| `description_zh` | string | Chinese description |
| `category` | string | Category code (games, governance, finance, social, tools, other) |
| `category_name` | string | English category name |
| `category_name_zh` | string | Chinese category name |
| `contracts.neo-n3-mainnet` | address | Mainnet contract address |
| `contracts.neo-n3-testnet` | address | Testnet contract address |
| `supported_networks` | array | List of supported networks |
| `default_network` | string | Default network to use |

## Stateless MiniApp Design

### Principle: MiniApp = View Layer Only

```
┌─────────────────────────────────────────┐
│              MiniApp (CDN)               │
├─────────────────────────────────────────┤
│  • HTML/CSS/JS (compiled output)        │
│  • Logo & Banner images                 │
│  • NO backend logic                     │
│  • NO database connection               │
│  • NO local state (except UI state)     │
└─────────────────────────────────────────┘
                    │
                    ▼ reads
┌─────────────────────────────────────────┐
│           State Sources                  │
├─────────────────────────────────────────┤
│  1. Smart Contracts (on-chain)          │
│  2. External APIs (off-chain data)      │
│  3. User Wallet (account, balance)      │
└─────────────────────────────────────────┘
```

## Platform-Tracked Data

The platform manages **analytics and metadata**, NOT miniapp logic.

| Data Type | Description | Storage |
|-----------|-------------|---------|
| Views | Page views, unique visitors | Platform DB |
| Comments | User reviews & comments | Platform DB |
| Ratings | Star ratings, scores | Platform DB |
| Transactions | On-chain interactions | Platform DB + Blockchain |
| Status | Published/draft/hidden | Platform DB |

## File Structure

```
miniapps/
├── apps/
│   └── {miniapp-name}/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── composables/
│       ├── public/
│       │   ├── logo.png      # 256x256 app icon
│       │   └── banner.png    # 1024x320 banner
│       ├── neo-manifest.json # Miniapp metadata
│       ├── package.json
│       └── vite.config.ts
│
├── scripts/
│   ├── build-all.sh       # Build all miniapps
│   ├── publish.sh         # Build + upload + register
│   ├── validate.sh        # Validate JSON/manifests
│   ├── update-manifests.py # Update manifests schema
│   └── create-manifests.py # Create missing manifests
│
└── public/
    └── miniapps/          # Local CDN mirror
        └── {miniapp-name}/
```

## Publish Workflow

```bash
# Publish single miniapp to staging
./scripts/publish.sh lottery staging

# Publish all miniapps to production
./scripts/publish.sh all production

# List all miniapps
./scripts/publish.sh list

# Update all manifests to latest schema
python3 scripts/update-manifests.py
```

## Category List

| Code | English | Chinese |
|------|---------|---------|
| games | Games | 游戏 |
| governance | Governance | 治理 |
| finance | Finance | 金融 |
| social | Social | 社交 |
| tools | Tools | 工具 |
| other | Other | 其他 |
