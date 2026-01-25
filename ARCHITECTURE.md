# Neo MiniApps Architecture

## Overview

Neo MiniApps are **stateless web applications** that:
1. Load from CDN (Cloudflare R2)
2. Get state from smart contracts or external APIs
3. Are registered via `neo-manifest.json`
4. Have analytics/tracking managed by the platform

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Neo MiniApp Platform                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ MiniApp     │    │ Analytics   │    │ CDN (R2)            │ │
│  │ Registry    │    │ Service     │    │ - /lottery/         │ │
│  │ - manifest  │    │ - views     │    │ - /neo-swap/        │ │
│  │ - metadata  │    │ - ratings   │    │ - /neo-gacha/       │ │
│  │ - CDN URL   │    │ - comments  │    │ - ...               │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                   │                      │           │
│         └───────────────────┴──────────────────────┘           │
│                            │                                      │
│                   ┌────────▼────────┐                            │
│                   │  Frontend App   │                            │
│                   │  - MiniApp list │                            │
│                   │  - Details view │                            │
│                   │  - User wallet  │                            │
│                   └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Smart Contracts                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ LotteryContract   │ SwapContract   │ GachaContract          ││
│  │ - game state      │ - pools        │ - loot tables          ││
│  │ - tickets         │ - swaps        │ - rng seed             ││
│  │ - winners         │ - orders       │ - prizes               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

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

### State Source Configuration

```json
{
  "stateSource": {
    "type": "smart-contract",
    "chain": "neo-n3-mainnet",
    "endpoints": ["https://neoxrpc1.blackholelabs.io"]
  }
}
```

Or for off-chain data:

```json
{
  "stateSource": {
    "type": "api",
    "endpoint": "https://api.example.com/data",
    "auth": "Bearer ${API_TOKEN}"
  }
}
```

## neo-manifest.json Schema

The manifest is the **source of truth** for miniapp metadata.

```json
{
  "$schema": "https://schemas.r3e.network/miniapp-manifest/v1.json",
  "id": "unique-app-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "App description",
  "category": "games|finance|social|tools|other",
  "tags": ["tag1", "tag2"],
  
  "developer": {
    "name": "Developer Name",
    "email": "dev@example.com",
    "website": "https://example.com"
  },
  
  "contracts": {
    "primary": "0x1234...",
    "dependencies": ["0x5678..."]
  },
  
  "urls": {
    "entry": "/index.html",
    "icon": "/logo.png",
    "banner": "/banner.png"
  },
  
  "features": {
    "stateless": true,
    "offlineSupport": false,
    "deeplink": "neomainapp://app-id"
  },
  
  "stateSource": {
    "type": "smart-contract|api",
    "chain": "neo-n3-mainnet",
    "endpoints": ["https://..."]
  },
  
  "platform": {
    "analytics": true,
    "comments": true,
    "ratings": true,
    "transactions": true
  }
}
```

## Platform-Tracked Data

The platform manages **analytics and metadata**, NOT miniapp logic.

| Data Type | Description | Storage |
|-----------|-------------|---------|
| Views | Page views, unique visitors | Platform DB |
| Comments | User reviews & comments | Platform DB |
| Ratings | Star ratings, scores | Platform DB |
| Transactions | On-chain interactions (optional) | Platform DB + Blockchain |
| Status | Published/draft/hidden | Platform DB |
| Stats | Daily/weekly/monthly analytics | Platform DB |

## Publish Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Publish Process                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Build MiniApp                                                │
│     ./scripts/publish.sh lottery staging                         │
│         │                                                        │
│         ▼                                                        │
│  2. Compile (Vite/Uni-app)                                       │
│     - Generate dist/build/h5/                                    │
│     - Minify assets                                              │
│         │                                                        │
│         ▼                                                        │
│  3. Upload to CDN (R2)                                           │
│     - S3 sync to R2 bucket                                       │
│     - Set public-read ACL                                        │
│         │                                                        │
│         ▼                                                        │
│  4. Register with Platform                                       │
│     - POST manifest to platform API                              │
│     - Platform stores: CDN URL + metadata                        │
│     - Returns registered app ID                                  │
│         │                                                        │
│         ▼                                                        │
│  5. Platform Updates MiniApp Registry                            │
│     - App appears in listing                                     │
│     - Analytics tracking enabled                                 │
│         │                                                        │
│         ▼                                                        │
│  6. User Access                                                  │
│     - Click miniapp in platform                                  │
│     - Platform redirects to CDN URL                              │
│     - Miniapp loads from CDN                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

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
│   └── validate.sh        # Validate JSON/manifests
│
└── public/
    └── miniapps/          # Local CDN mirror
        └── {miniapp-name}/
            ├── index.html
            └── static/
```

## API Endpoints (Platform)

### Register MiniApp
```
POST /api/miniapp/register
Content-Type: application/json

{
  "manifest": { ...neo-manifest.json },
  "cdnUrl": "https://cdn.r3e.network/lottery/",
  "environment": "staging"
}
```

### Get MiniApp
```
GET /api/miniapp/{appId}
```

### List MiniApps
```
GET /api/miniapp?category=games&status=published
```

### Update Analytics
```
POST /api/miniapp/{appId}/analytics
{
  "type": "view|comment|rating|transaction",
  "data": { ... }
}
```

## Benefits

1. **Stateless = Portable**
   - Same miniapp works on any platform
   - No backend dependencies
   - Easy to migrate or backup

2. **CDN = Fast**
   - Global edge caching
   - Low latency access
   - Scalable automatically

3. **Platform = Analytics**
   - Unified analytics
   - User reviews & ratings
   - Discovery & categorization

4. **Smart Contract = Trustless**
   - All game logic on-chain
   - Transparent operations
   - No central control
