# ZK Piggy Bank 零知识存钱罐

A privacy-focused savings account using Zero-Knowledge proofs. Supports any ERC-20 token.

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-piggy-bank` |
| **Category** | Finance |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Summary

Private goal-based savings vaults on EVM

ZK Piggy Bank allows you to save any ERC-20 token toward a target and lock it until a chosen date. Zero-knowledge proofs keep balances private until you decide to smash the bank. Connect an EVM wallet and configure Alchemy RPC before use.

## Features

- **Zero-knowledge privacy**: Balances remain hidden until withdrawal.
- **Any ERC-20**: Deposit ETH, stablecoins, or any token contract.
- **Time-locked vaults**: Funds are locked until your chosen unlock date.
- **Multi-chain ready**: Works across major EVM networks with RPC config.
- **Local secrets**: Savings secrets stay on your device for safety.
- **Goal verification**: Check target progress without exposing amounts.

## How to use

1. Connect an EVM wallet and select your network.
2. Create a new Piggy Bank with a token, target amount, and unlock date.
3. Deposit ERC-20 tokens (popular or custom contract address).
4. Use ZK Verify to check goal progress without revealing balances.
5. Smash the Piggy Bank after unlock to withdraw funds.

## Permissions

| Permission | Required |
|------------|----------|
| Wallet | ✅ Yes |
| Payments | ❌ No |
| RNG | ❌ No |
| Data Feed | ❌ No |
| Governance | ❌ No |
| Automation | ❌ No |

## On-chain behavior

- No on-chain contract is deployed; the app relies on off-chain APIs and wallet signing flows.

## Network Configuration

No on-chain contract is deployed.

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

- **Allowed Assets**: All (any token)

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for H5
npm run build
```
