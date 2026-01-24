# Stream Vault

Time-based release vaults for payrolls, subscriptions, and recurring payments.

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-stream-vault` |
| **Category** | defi |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Features

- Lock GAS in a vault
- Fixed interval releases to a beneficiary
- Beneficiary claims on schedule
- Creator can cancel and reclaim remaining funds

## User Flow

1. **Create stream**: choose asset, total amount, release rate, and interval.
2. **Vault active**: funds stay locked until each interval unlocks releases.
3. **Claim**: beneficiary claims released amounts over time.
4. **Cancel (optional)**: creator cancels and receives remaining funds.

## Contract Methods

- `CreateStream(creator, beneficiary, asset, totalAmount, rateAmount, intervalSeconds, title, notes)`
- `ClaimStream(beneficiary, streamId)`
- `CancelStream(creator, streamId)`
- `GetStreamDetails(streamId)`
- `GetUserStreams(user, offset, limit)`
- `GetBeneficiaryStreams(beneficiary, offset, limit)`

## Permissions

| Permission | Required |
|------------|----------|
| Payments | ❌ No |
| Automation | ❌ No |
| RNG | ❌ No |
| Data Feed | ❌ No |

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
