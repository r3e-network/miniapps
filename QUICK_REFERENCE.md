# Quick Reference

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build all miniapps (from root) |
| `cd apps/{app} && pnpm dev` | Start dev server |
| `cd apps/{app} && pnpm build` | Build single miniapp |

## Miniapp List

```
📦 Lottery        - Lottery game with scratch cards
📦 Coin Flip      - Simple coin flip gambling
📦 Neo Swap       - Decentralized exchange
📦 Neo NS         - Naming service
📦 Neo Gacha      - Gacha/loot box system
📦 Wallet Health  - Wallet analytics
📦 Council Gov    - DAO governance
📦 Event Ticket   - Event ticketing
📦 Stream Vault   - Streaming payments
📦 Quadratic Fund - Quadratic voting grants
... and 42 more
```

## Key Files

| File | Purpose |
|------|---------|
| `neo-manifest.json` | Miniapp metadata & contracts |
| `src/pages/index/` | Main page |
| `public/logo.png` | App icon (256x256) |
| `public/banner.png` | Banner (1024x320) |

## SDK Usage

```typescript
import { useWallet } from '@neo/uniapp-sdk'
import type { Account } from '@neo/types'

const { connect, disconnect, account } = useWallet()
```

## Troubleshooting

- **Build fails**: Run `pnpm install` from root
- **JSON error**: Check package.json for trailing commas
- **ENOSPC**: Increase file watchers limit
