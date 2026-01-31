# Neo MiniApps (UniApp)

Canonical source for all Neo N3 MiniApp frontends built with UniApp + Vue 3.

## 🌐 Live Platform

**CDN**: [https://meshmini.app](https://meshmini.app)

All miniapps are hosted on Cloudflare R2 CDN and accessible at:

```
https://meshmini.app/miniapps/{app-name}/index.html
```

MiniApps typically use **dedicated on-chain contracts** (one per app) built from `contracts/`. The shared **UniversalMiniApp** contract remains available for lightweight prototypes or experiments that do not need custom logic.

## Structure

```
miniapps/
├── apps/                    # MiniApp applications
│   ├── lottery/
│   │   ├── neo-manifest.json  # MiniApp config (auto-registration + permissions)
│   │   └── src/
│   │       ├── pages/         # Vue components
│   │       ├── static/        # Assets (logo.png, banner.png)
│   │       ├── shared/        # Shared styles/utils
│   │       ├── App.vue
│   │       ├── main.ts
│   │       ├── manifest.json  # UniApp config
│   │       └── pages.json
│   └── ...
├── contracts/               # Shared MiniApp DevPack
├── public/miniapps/          # CDN-ready MiniApp builds
├── packages/                 # Shared packages (config, types, multichain-sdk)
├── _shared/                  # Shared build-free helpers
├── templates/                # Starter kits
├── scripts/
│   ├── auto-discover-miniapps.js  # Auto-discover and register miniapps
│   ├── update-icons-erobo.js      # Update icons to E-Robo style
│   ├── build-all.sh               # Build all apps (includes auto-discover)
│   └── generate-neo-manifests.js
└── shared/                  # Cross-app shared resources
```

## 📚 Documentation

All project documentation is organized in the `docs/` folder:

| Document | Purpose |
|----------|---------|
| [docs/QUICK_START.md](docs/QUICK_START.md) | Developer onboarding guide |
| [docs/STANDARDS.md](docs/STANDARDS.md) | Coding standards and best practices |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Development workflow and guides |
| [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) | Production deployment steps |
| [docs/SECURITY_FIXES_APPLIED.md](docs/SECURITY_FIXES_APPLIED.md) | Security hardening summary |
| [docs/FINAL_160_ROUND_PERFECT_REVIEW.md](docs/FINAL_160_ROUND_PERFECT_REVIEW.md) | Complete optimization report |

## Quick Start

```bash
# Install dependencies
pnpm install

# Dev single app
cd apps/lottery && pnpm dev

# Build all apps
pnpm build:all

# Auto-discover and register all miniapps
node scripts/auto-discover-miniapps.js
```

## Creating a New MiniApp

1. Create a new directory under `apps/`:

```bash
mkdir -p apps/my-app/src
```

2. Add `neo-manifest.json` in the app root (source of truth):

```json
{
  "app_id": "miniapp-my-app",
  "entry_url": "/miniapps/my-app/index.html",
  "category": "gaming",
  "name": "My App",
  "name_zh": "我的应用",
  "description": "My awesome MiniApp",
  "description_zh": "我的精彩小程序",
  "status": "active",
  "developer_pubkey": "0x<33-byte compressed pubkey hex>",
  "permissions": {
    "payments": true,
    "rng": true
  },
  "assets_allowed": ["GAS"],
  "governance_assets_allowed": ["NEO"]
}
```

Permissions are **deny-by-default**. Only the keys you set to `true` are enabled.
Keep `app_id` aligned with the `APP_ID` constant used in your MiniApp code so
payments, events, and SDK scoping all target the same app.
If your MiniApp calls on-chain functions, set `contracts.<chain>.address` to the deployed
contract address for each network (for example `neo-n3-testnet` and `neo-n3-mainnet`).
Auto-discovery will backfill `contracts` when a matching entry exists in
`deploy/config/testnet_contracts.json` or `deploy/config/mainnet_contracts.json`.

3. Auto-discover to register (already runs during host-app dev/build):

```bash
node scripts/auto-discover-miniapps.js
```

That's it! Your MiniApp will be automatically registered.

**Auto-registration:** The host app runs `scripts/export_host_miniapps.sh` on `predev` and `prebuild`,
which copies built MiniApps and runs auto-discovery. You can still call
`node scripts/auto-discover-miniapps.js` directly if you need to refresh the registry.

**Note:** The `build-all.sh` script automatically runs auto-discover after building, so you don't need to run it manually when building.

## SDK Usage

The `@r3e/uniapp-sdk` (installed from npm) provides Vue 3 composables for wallet access, platform services, and contract invocations:

```vue
<script setup lang="ts">
import {
  useWallet,
  usePayments,
  useRNG,
  useDatafeed,
  useEvents,
} from "@r3e/uniapp-sdk";

const APP_ID = "miniapp-my-app";

// Wallet connection
const { address, connect, invokeRead, invokeContract } = useWallet();

// Payments (GAS)
const { payGAS, isLoading } = usePayments(APP_ID);

// Random numbers (VRF)
const { requestRandom } = useRNG(APP_ID);

// Price feeds
const { getPrice, getNetworkStats } = useDatafeed();

// Custom events
const { emit, list } = useEvents();
</script>
```

When invoking MiniApp contract methods, use the method names defined in the contract README (PascalCase in the updated contracts).

### SDK API Reference

| Composable      | Methods                                                                           | Description                          |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| `useWallet`     | `connect`, `address`, `invokeRead`, `invokeContract`                              | Wallet connection and contract calls |
| `usePayments`   | `payGAS(amount, memo)`                                                            | GAS payment processing               |
| `useRNG`        | `requestRandom()`                                                                 | VRF random number generation         |
| `useDatafeed`   | `getPrice(symbol)`, `getPrices()`, `getNetworkStats()`, `getRecentTransactions()` | Price feeds and network data         |
| `useEvents`     | `emit(type, data)`, `list(filters)`                                               | Custom event emission and querying   |
| `useGovernance` | `vote()`, `getCandidates()`                                                       | Governance operations                |
| `useGasSponsor` | `requestSponsorship()`                                                            | Gas sponsorship requests             |

## Apps

| Category       | Apps                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **Gaming**     | lottery, coin-flip, million-piece-map, on-chain-tarot, turtle-match                               |
| **DeFi**       | flashloan, compound-capsule, self-loan, neo-swap, neoburger, gas-sponsor                          |
| **Social**     | red-envelope, dev-tipping, breakup-contract, forever-album, grant-share, hall-of-fame             |
| **NFT**        | time-capsule, heritage-trust, garden-of-neo, graveyard                                            |
| **Governance** | burn-league, doomsday-clock, masquerade-dao, gov-merc, candidate-vote, council-governance         |
| **Utility**    | neo-ns, neo-news-today, explorer, guardian-policy, unbreakable-vault, neo-treasury, daily-checkin |

**Total:** 52 production miniapps

## Contract Addresses

### Platform Contracts (Neo N3 Mainnet)

| Contract            | Address                                      | Status    |
| ------------------- | -------------------------------------------- | --------- |
| PaymentHub          | `0xc700fa6001a654efcd63e15a3833fbea7baaa3a3` | ✅ Active |
| Governance          | `0x705615e903d92abf8f6f459086b83f51096aa413` | ✅ Active |
| PriceFeed           | `0x9e889922d2f64fa0c06a28d179c60fe1af915d27` | ✅ Active |
| RandomnessLog       | `0x66493b8a2dee9f9b74a16cf01e443c3fe7452c25` | ✅ Active |
| AppRegistry         | `0x583cabba8beff13e036230de844c2fb4118ee38c` | ✅ Active |
| AutomationAnchor    | `0x0fd51557facee54178a5d48181dcfa1b61956144` | ✅ Active |
| ServiceLayerGateway | `0x7f73ae3036c1ca57cad0d4e4291788653b0fa7d7` | ✅ Active |

**Mainnet RPC:** https://mainnet1.neo.coz.io:443
**Network Magic:** 860833102

### Platform Contracts (Neo N3 Testnet)

| Contract            | Address                              | Status    |
| ------------------- | ------------------------------------ | --------- |
| PaymentHub          | `NLyxAiXdbc7pvckLw8aHpEiYb7P7NYHpQq` | ✅ Active |
| Governance          | `NeEWK3vcVRWJDebyBCyLx6HSzJZSeYhXAt` | ✅ Active |
| PriceFeed           | `Ndx6Lia3FsF7K1t73F138HXHaKwLYca2yM` | ✅ Active |
| RandomnessLog       | `NWkXBKnpvQTVy3exMD2dWNDzdtc399eLaD` | ✅ Active |
| AppRegistry         | `NX25pqQJSjpeyKBvcdReRtzuXMeEyJkyiy` | ✅ Active |
| AutomationAnchor    | `NNWqgxGnXGtfK7VHvEqbdSu3jq8Pu8xkvM` | ✅ Active |
| ServiceLayerGateway | `NPXyVuEVfp47Abcwq6oTKmtwbJM6Yh965c` | ✅ Active |

**Testnet RPC:** https://testnet1.neo.coz.io:443
**Network Magic:** 894710606

### MiniApp Contract Addresses

#### Mainnet Deployed Contracts

| MiniApp                   | Mainnet Address                              | Testnet Address                              |
| ------------------------- | -------------------------------------------- | -------------------------------------------- |
| Lottery                   | `0xb3c0ca9950885c5bf4d0556e84bc367473c3475e` | `0x3e330b4c396b40aa08d49912c0179319831b3a6e` |
| Coin Flip                 | `0x0a39f71c274dc944cd20cb49e4a38ce10f3ceea1` | `0xbd4c9203495048900e34cd9c4618c05994e86cc0` |
| Red Envelope              | `0x5f371cc50116bb13d79554d96ccdd6e246cd5d59` | `0xf2649c2b6312d8c7b4982c0c597c9772a2595b1e` |
| On-Chain Tarot            | `0xfb5d6b25c974a301e34c570dd038de8c25f3ae56` | `0xc2bb26d21f357f125a0e49cbca7718b6aa5c3b1e` |
| FlashLoan                 | `0xb5d8fb0dc2319edc4be3104304b4136b925df6e4` | `0xee51e5b399f7727267b7d296ff34ec6bb9283131` |
| Compound Capsule          | `0x46852726d7c4a347991606ef1135e61d8112a175` | `0xba302bebace6c2bd0f610228b56bd3d3de07dbd7` |
| Self Loan                 | `0x942da575b31f39cbb59e64b5813b128739b44c25` | `0x5ed7d8c85f24f4aa16b328aca776e09be5241296` |
| Heritage Trust            | `0xd260b66f646a49c15f572aa827e5eb36f7756563` | `0xd59eea851cd8e5dd57efe80646ff53fa274600f8` |
| Guardian Policy           | `0x451422cfb5a16e26a12f3222aa04fb669d978229` | `0x893a774957244b83a0efed1d42771fe1e424cfec` |
| Neo Gacha                 | `0xc9af7c9de5b0963e6514b6462b293f0179eb3798` | -                                            |
| Doomsday Clock            | `0x8f46753fd7123bd276d77ef1100839004b9a3440` | `0xe4f386057d6308b83a5fd2e84bc3eb9149adc719` |
| Dev Tipping               | `0x1d476b067a180bc54ee4f90c91489ffa123759a4` | `0x38ec54ce12e9cbf041cc7e31534eccae0eaa38dc` |
| Masquerade DAO            | `0xc5e3e2e481af11dc823ae4ebcd8f791b9ba9b6f9` | `0x36873ae952147150e065ad2ba8d23731ffd00d5a` |
| Gov Merc                  | `0xe8f3d8d5784f8570d1f806940bbaa7daff9f52d0` | `0x05d4ed2e60141043d6d20f5cde274704bd42c0dc` |
| Council Governance        | `0xc7e50e67589df63302cbea1a6b00beb649ee74d8` | -                                            |
| Hall of Fame              | `0x3c00cbea1c4e502bafae4c6ce7a56237a7d71ded` | -                                            |
| Breakup Contract          | `0x7742a80565ef04c0b7487d1679e6efbeb2d0c6a9` | `0x84a3864028b7b71e9f420056e1eae2e3e3113a0c` |
| Ex Files                  | `0x9cfc02ad75691521cceb2ec0550e6a227251ad35` | `0xb45cd9f5869f75f3a7ac9e71587909262cbb96a5` |
| Burn League               | `0xd829b7a8c0d9fa3c67a29c703a277de3f922f173` | `0xf1aa73e2fb00664e8ef100dac083fc42be6aaf85` |
| Garden of Neo             | `0x72aa16fd44305eabe8b85ca397b9bfcdc718dce8` | `0xdb52b284d97973b01fed431dd6d143a4d04d9fa7` |
| Million Piece Map         | `0xdae609b67e51634a95badea92bae585459fe83a4` | `0xdf787aaf8a70dd2612521de69f12c7bf5a8d0d6d` |
| Graveyard                 | `0x0195e668f7a2a41ef4a0200c5b9c2cc1c02e24d1` | `0xe88938b2c2032483cf5edcdab7e4bde981e5fb24` |
| Unbreakable Vault         | `0x198bfcccabb9b73181f23b5af22fe73afdc6c3aa` | `0xb60bf51f7fc9b7e0beeabfde0765d8ec9b895dd4` |
| Time Capsule              | `0xd853a4ac293ff96e7f70f774c2155d846f91a989` | `0x119763e1402d7190728191d83c95c5b8e995abcd` |
| Forever Album             | `0x254421a4aeb4e731f89182776b7bc6042c40c797` | -                                            |
| Memorial Shrine           | `0xee7a548b71c69364fcb0e45a63a40f141b938e42` | -                                            |
| Daily Checkin             | `0x908867b23ab551a598723ceeaaedd70c54e10c76` | -                                            |
| Gas Sponsor               | `0x80ea8435a88334b9b80077220097d88c440615f1` | -                                            |
| Turtle Match              | `0xac10b90f40c015da61c71e30533309760b75fec7` | -                                            |
| Candidate Vote (External) | `0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5` | -                                            |
| Neo Swap (External)       | `0xf970f4ccecd765b63732b821775dc38c25d74f23` | -                                            |
| NeoBurger (External)      | `0x48c40d4666f93408be1bef038b6722404d9a4c2a` | -                                            |
| Neo NS (External)         | `0x50ac1c37690cc2cfc594472833cf57505d5f46de` | -                                            |

For complete contract information, see [`contracts-info/README.md`](./contracts-info/README.md).

## UniversalMiniApp Contract

The shared `UniversalMiniApp` contract is optional and best suited for rapid prototypes or MiniApps that only need basic storage, payments, and events.

**Features:**

- App registration with isolated storage
- Payment processing (GAS)
- VRF randomness
- Price feeds
- Event emission

See `contracts/UniversalMiniApp/README.md` for details.

## Design System (E-Robo Style)

All MiniApps use a unified E-Robo inspired design system with:

### CSS Variables

```css
:root {
  --erobo-purple: #9f9df3;
  --erobo-purple-dark: #7b79d1;
  --erobo-pink: #f7aac7;
  --erobo-peach: #f8d7c2;
  --erobo-mint: #d8f2e2;
  --erobo-sky: #d9ecff;
  --erobo-ink: #1b1b2f;
  --erobo-ink-soft: #4a4a63;
  --erobo-gradient: linear-gradient(135deg, #9f9df3 0%, #7b79d1 100%);
  --erobo-glow: 0 0 30px rgba(159, 157, 243, 0.4);
  --card-radius: 20px;
  --blur-radius: 50px;
}
```

### Shared Components

| Component      | Description                 | Usage                                  |
| -------------- | --------------------------- | -------------------------------------- |
| `AppLayout`    | Mobile-first layout wrapper | `<AppLayout title="My App">`           |
| `NeoCard`      | Glass-morphism card         | `<NeoCard variant="erobo">`            |
| `NeoButton`    | Gradient button with glow   | `<NeoButton variant="erobo">`          |
| `BlurGlow`     | Background blur/glow effect | `<BlurGlow color="purple">`            |
| `GradientCard` | E-Robo style gradient card  | `<GradientCard variant="purple" glow>` |

### Card Variants

- `default` - Standard glass card
- `erobo` - Purple gradient with glow
- `erobo-neo` - Neo green gradient
- `erobo-bitcoin` - Bitcoin gold gradient

## Security

### Permissions (Secure by Default)

Apps must explicitly request permissions in `neo-manifest.json`:

```json
{
  "permissions": {
    "payments": false,
    "governance": false,
    "automation": false
  }
}
```

### Validation

- Contract hash format validated (0x + 40 hex chars)
- Manifest schema validation
- Origin validation for iframe communication

## Deployment

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://bf0d7e814f69945157f30505e9fba9fe.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
CLOUDFLARE_R2_REGION=auto

# CDN Configuration
NEXT_PUBLIC_CDN_URL=https://meshmini.app
CDN_URL=https://meshmini.app

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Deploy to Cloudflare R2 + Supabase

```bash
# Build all miniapps
pnpm build:all

# Upload to CDN (R2)
node scripts/deploy/upload-built.js production

# Register to Supabase
node scripts/deploy/to-supabase-upsert.js
```

Or use the combined deployment script:

```bash
# Deploy to production
pnpm deploy:prod
```

### Deployment Scripts

| Script                                 | Description                                 |
| -------------------------------------- | ------------------------------------------- |
| `scripts/deploy/upload-built.js`       | Upload built files to R2 CDN                |
| `scripts/deploy/to-supabase-upsert.js` | Register miniapps to Supabase with metadata |
| `scripts/comprehensive-check.js`       | Verify CDN + Supabase consistency           |

### Platform Integration

For platform integration documentation, see:

- [Platform Miniapp Guide](./docs/PLATFORM_MINIAPP_GUIDE.md) - Complete platform integration guide
- [Platform CDN Integration](./docs/PLATFORM_CDN_INTEGRATION.md) - CDN discovery and loading
- [Supabase API Reference](./docs/SUPABASE_MINIAPP_API.md) - Supabase queries and operations

## Dependencies

The project uses the following key dependencies:

### Runtime Dependencies

- **@aws-sdk/client-s3** (^3.709.0) - AWS S3 client for Cloudflare R2 deployment
- **dotenv** (^16.4.7) - Environment variable management
- **vue** (^3.5.0) - Vue 3 framework
- **@dcloudio/uni-\*** - uni-app framework packages

### Development Dependencies

- **turbo** (^2.7.5) - Build system and task runner
- **typescript** (^5.4.5) - TypeScript compiler
- **vitest** (^2.1.0) - Testing framework
- **prettier** - Code formatting
- **eslint** - Linting

All dependencies are managed via pnpm workspace catalog for consistent versioning across the monorepo.
