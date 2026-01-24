# Milestone Escrow

Staged escrow releases with explicit milestone approvals.

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-milestone-escrow` |
| **Category** | defi |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Features

- Lock GAS in escrow
- Creator approves each milestone
- Beneficiary claims on approval
- Creator can cancel and refund remaining funds

## User Flow

1. **Create escrow**: define milestones and deposit funds.
2. **Approve**: creator approves milestones when work is delivered.
3. **Claim**: beneficiary claims approved milestone amounts.
4. **Cancel (optional)**: creator cancels and recovers remaining funds.

## Contract Methods

- `CreateEscrow(creator, beneficiary, asset, totalAmount, milestoneAmounts, title, notes)`
- `ApproveMilestone(creator, escrowId, milestoneIndex)`
- `ClaimMilestone(beneficiary, escrowId, milestoneIndex)`
- `CancelEscrow(creator, escrowId)`
- `GetEscrowDetails(escrowId)`

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
