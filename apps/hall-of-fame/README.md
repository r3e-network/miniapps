# Neo Hall of Fame Neo 名人堂

Neo Hall of Fame - Neo MiniApp

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-hall-of-fame` |
| **Category** | Social |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Summary

Community recognition through GAS voting

Neo Hall of Fame is a community-driven leaderboard where you can boost your favorite people, communities, and developers in the Neo ecosystem by voting with GAS.

## Features

- **GAS Voting**: Vote with real GAS tokens to boost rankings.
- **Multiple Categories**: Recognize people, communities, and developers.

## How to use

1. Connect your Neo wallet
2. Browse categories: People, Communities, Developers
3. Click BOOST to vote with GAS
4. Watch your favorites climb the leaderboard

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
| **Contract** | `0xfdfd94a2a0819d97c0c681ddef4dbcad25973940` |
| **RPC** | `https://testnet1.neo.coz.io:443` |
| **Explorer** | [View on NeoTube](https://testnet.neotube.io/contract/0xfdfd94a2a0819d97c0c681ddef4dbcad25973940) |
| **Network Magic** | `894710606` |

### Mainnet

| Property | Value |
|----------|-------|
| **Contract** | `0x3c00cbea1c4e502bafae4c6ce7a56237a7d71ded` |
| **RPC** | `https://mainnet1.neo.coz.io:443` |
| **Explorer** | [View on NeoTube](https://neotube.io/contract/0x3c00cbea1c4e502bafae4c6ce7a56237a7d71ded) |
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
