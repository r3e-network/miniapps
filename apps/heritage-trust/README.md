# Heritage Trust

Living trust DAO - lock NEO/GAS, earn rewards, and release monthly inheritances after inactivity

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-heritage-trust` |
| **Category** | nft |
| **Version** | 2.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Features

- Lock NEO and/or GAS as principal with a monthly release schedule
- Convert NEO to bNEO via NeoBurger to earn GAS rewards
- Three release modes: principal NEO + GAS, principal NEO + rewards, or rewards only
- Support GAS-only principal with monthly GAS releases
- Beneficiaries claim released assets monthly after inactivity trigger
- Owners can still claim accrued GAS rewards before execution

## Release Modes

| Mode | Principal Locked | Monthly Release |
|------|------------------|----------------|
| Fixed NEO + GAS | NEO + GAS | NEO + GAS (principal) |
| NEO + GAS Rewards | NEO | NEO (principal) + GAS rewards |
| Rewards Only | NEO | GAS rewards only |

## Release Mechanics

- Locked NEO is swapped to bNEO via NeoBurger inside the contract.
- GAS rewards accumulate on-chain and can be claimed by the owner before execution.
- After execution, beneficiaries claim monthly releases via `claimReleasedAssets`.
- In rewards-only mode, principal stays locked and only GAS rewards are released.

## Lifecycle

1. **Create trust**: lock NEO/GAS and set beneficiary + monthly schedule.
2. **Heartbeat**: owner submits a heartbeat to keep the trust active.
3. **Trigger**: if the heartbeat deadline passes, the trust becomes executable.
4. **Monthly claims**: beneficiary claims released NEO/GAS based on the chosen mode.

## User Flows

- **Owner**
  - Create trust and set release mode + interval.
  - Claim GAS rewards while the trust is active.
  - Send heartbeats to keep the trust from triggering.
- **Beneficiary**
  - Execute the trust after inactivity.
  - Claim monthly released NEO/GAS.

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
| **Contract** | `0xd59eea851cd8e5dd57efe80646ff53fa274600f8` |
| **RPC** | `https://testnet1.neo.coz.io:443` |
| **Explorer** | [View on NeoTube](https://testnet.neotube.io/contract/0xd59eea851cd8e5dd57efe80646ff53fa274600f8) |
| **Network Magic** | `894710606` |

### Mainnet

| Property | Value |
|----------|-------|
| **Contract** | `0xd260b66f646a49c15f572aa827e5eb36f7756563` |
| **RPC** | `https://mainnet1.neo.coz.io:443` |
| **Explorer** | [View on NeoTube](https://neotube.io/contract/0xd260b66f646a49c15f572aa827e5eb36f7756563) |
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

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for H5
npm run build
```

## Assets

- **Allowed Assets**: NEO, GAS (bNEO used internally for rewards)
  - NEO is converted to bNEO to accrue GAS rewards via NeoBurger.
  - GAS principal is only released in fixed mode.

## Contract Interface (TestNet)

- `createTrust(owner, heir, neoAmount, gasAmount, heartbeatIntervalDays, monthlyNeo, monthlyGas, onlyRewards, trustName, notes, receiptId)`
- `heartbeat(trustId)` — reset inactivity timer
- `executeTrust(trustId)` — trigger monthly release schedule
- `claimReleasedAssets(trustId)` — beneficiary claim
- `claimYield(trustId)` — owner claims rewards before execution


## License

MIT License - R3E Network
