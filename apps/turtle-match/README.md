# 乌龟对对碰

Turtle Match - Neo MiniApp Game

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-turtle-match` |
| **Category** | Gaming |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Summary

Blindbox matching with GAS rewards

Purchase blindboxes, auto-open turtles on a 3x3 grid, match pairs, and settle rewards on-chain. Rewards follow the contract odds and are paid after settlement.

## Features

- **On-chain sessions**: Sessions, matches, and payouts are recorded by the contract.
- **Deterministic reveals**: Turtle colors are derived from a seeded hash for transparent outcomes.
- **Instant settlement**: Complete the session and claim rewards in a single settlement.

## How to use

1. Connect your wallet to sync game sessions and stats.
2. Choose 3-20 blindboxes and start the session (0.1 GAS each).
3. Watch auto-opening, matches, and reward previews as the grid fills.
4. Settle the session on-chain to receive GAS rewards, then start a new game.

## Permissions

| Permission | Required |
|------------|----------|
| Wallet | ❌ No |
| Payments | ✅ Yes |
| RNG | ❌ No |
| Data Feed | ❌ No |
| Governance | ❌ No |
| Automation | ❌ No |

## On-chain behavior

- Validates payments on-chain (PaymentHub receipts when enabled).

## Network Configuration

### Testnet

| Property | Value |
|----------|-------|
| **Contract** | `0x795bb2b8be2ac574d17988937cdd27d12d5950d6` |
| **RPC** | `https://testnet1.neo.coz.io:443` |
| **Explorer** | [View on NeoTube](https://testnet.neotube.io/contract/0x795bb2b8be2ac574d17988937cdd27d12d5950d6) |
| **Network Magic** | `894710606` |

### Mainnet

| Property | Value |
|----------|-------|
| **Contract** | `0xac10b90f40c015da61c71e30533309760b75fec7` |
| **RPC** | `https://mainnet1.neo.coz.io:443` |
| **Explorer** | [View on NeoTube](https://neotube.io/contract/0xac10b90f40c015da61c71e30533309760b75fec7) |
| **Network Magic** | `860833102` |

## Platform Contracts

### Testnet

| Contract | Address |
| --- | --- |
| PaymentHub | `0x0bb8f09e6d3611bc5c8adbd79ff8af1e34f73193` |
| Governance | `0xc8f3bbe1c205c932aab00b28f7df99f9bc788a05` |
| PriceFeed | `0xc5d9117d255054489d1cf59b2c1d188c01bc9954` |
| RandomnessLog | `0x76dfee17f2f4b9fa8f32bd3f4da6406319ab7b39` |
| AppRegistry | `0x79d16bee03122e992bb80c478ad4ed405f33bc7f` |
| AutomationAnchor | `0x1c888d699ce76b0824028af310d90c3c18adeab5` |
| ServiceLayerGateway | `0x27b79cf631eff4b520dd9d95cd1425ec33025a53` |

### Mainnet

| Contract | Address |
| --- | --- |
| PaymentHub | `0xc700fa6001a654efcd63e15a3833fbea7baaa3a3` |
| Governance | `0x705615e903d92abf8f6f459086b83f51096aa413` |
| PriceFeed | `0x9e889922d2f64fa0c06a28d179c60fe1af915d27` |
| RandomnessLog | `0x66493b8a2dee9f9b74a16cf01e443c3fe7452c25` |
| AppRegistry | `0x583cabba8beff13e036230de844c2fb4118ee38c` |
| AutomationAnchor | `0x0fd51557facee54178a5d48181dcfa1b61956144` |
| ServiceLayerGateway | `0x7f73ae3036c1ca57cad0d4e4291788653b0fa7d7` |

## Assets

- **Allowed Assets**: NEO, GAS

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for H5
npm run build
```
