# Quadratic Funding MiniApp

Quadratic Funding lets communities run public grant rounds with matching pools. Donors contribute to projects during
active rounds, matching is computed off-chain, and projects claim contributions + matching once the round is finalized.

## Features
- Create matching rounds with GAS pools
- Register projects for a round
- Track contributions and unique donors
- Finalize matching allocations and claim funds
- Built-in docs for round operators and donors

## Usage
1. Create a round with matching pool, start/end time, and description.
2. Register projects during the round window.
3. Donors contribute to projects with GAS.
4. Compute matching allocations off-chain (helper: `node scripts/quadratic-funding-matching.js --input data.json --decimals 8`).
5. Project owners claim contributions + matching.

## Development
- Entry: `src/pages/index/index.vue`
- Docs: `src/pages/docs/index.vue`
- i18n: `src/locale/messages.ts`
- Assets: `src/static/logo.png`, `src/static/banner.png`

## Network Configuration

### Testnet

| Property | Value |
|----------|-------|
| **Contract** | `Not deployed` |
| **RPC** | `https://testnet1.neo.coz.io:443` |
| **Explorer** | `https://testnet.neotube.io` |

### Mainnet

| Property | Value |
|----------|-------|
| **Contract** | `Not deployed` |
| **RPC** | `https://mainnet1.neo.coz.io:443` |
| **Explorer** | `https://neotube.io` |

> Contract deployment is pending; `neo-manifest.json` keeps empty addresses until deployment.
