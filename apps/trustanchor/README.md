# TrustAnchor MiniApp

Non-profit voting delegation for Neo N3 governance.

## Description

TrustAnchor allows NEO holders to delegate their voting power to candidates with proven reputation and active contribution. The platform operates on a zero-fee model, ensuring 100% of GAS rewards go to stakers.

## Core Philosophy

> "Amplify voices of active contributors. Vote for reputation, not profit."

TrustAnchor exists to promote quality governance. GAS rewards are a natural incentive, but our true purpose is ensuring Neo N3 is governed by active, reputable contributors.

## Features

- **Stake NEO** - Participate in governance by staking your NEO
- **Vote for Reputation** - Delegate voting power to candidates with proven track records
- **Zero Fees** - 100% of GAS rewards go to stakers
- **Transparent** - All operations are on-chain

## Usage

### Development

```bash
cd apps/trustanchor
pnpm dev
```

### Build

```bash
pnpm build
```

## Architecture

### Composables

- `useTrustAnchor` - Core business logic for staking, delegation, and rewards

### Components

- `StatsGrid` - Displays stake statistics in a grid layout
- `StakeForm` - Stake/unstake input form (coming soon)

### Smart Contract

The TrustAnchor smart contract handles:
- Staking and unstaking NEO
- Vote delegation to candidates
- GAS reward distribution

Contract addresses:
- **Testnet**: `0x0000000000000000000000000000000000000000`
- **Mainnet**: `0x0000000000000000000000000000000000000000`

## Permissions

| Permission | Status | Purpose |
|------------|--------|---------|
| `governance` | ✅ | Vote delegation and candidate selection |
| `payments` | ❌ | Not required (no payment processing) |
| `rng` | ❌ | Not required |

## Supported Chains

- Neo N3 Testnet
- Neo N3 Mainnet

## License

Private - Internal use only
