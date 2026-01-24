# Neo Convert Neo 转换工具

Convert Neo addresses, private keys, and script hashes

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-neo-convert` |
| **Category** | utilities |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Summary

Offline key toolkit for Neo N3

Generate Neo N3 accounts locally, convert between WIF/private/public keys, derive addresses, and disassemble scripts. Everything runs on-device with no server calls, making it suitable for cold storage preparation and quick format checks.

## Features

- **Local key generation**: Keys are generated on your device with no network transmission.
- **Format auto-detection**: Detects WIF, private/public keys, and scripts for quick conversion.
- **Script disassembler**: Turns NeoVM script hex into readable opcode lists for debugging.
- **Paper wallet export**: QR-backed PDF export for secure offline storage.

## How to use

1. Open the Generate tab to create a new account and keep the private key/WIF offline.
2. Export the paper wallet PDF for an offline backup or print it for cold storage.
3. Switch to Convert and paste a WIF, private key, public key, or script hex.
4. Review derived values (address, pubkey, WIF) and copy the verified format.

## Permissions

| Permission | Required |
|------------|----------|
| Wallet | ❌ No |
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

- **Allowed Assets**: None

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for H5
npm run build
```
