# Soulbound Certificate

Non-transferable NEP-11 certificates for courses, events, and achievements.

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-soulbound-certificate` |
| **Category** | utility |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Features

- Create certificate templates with supply limits
- Issue soulbound certificates to recipients
- Display certificates with QR verification
- Issuers can revoke certificates

## User Flow

1. **Create template**: define certificate name, issuer, category, and supply.
2. **Issue certificate**: send certificate to recipient address.
3. **View certificate**: recipient opens “My Certificates” with QR token ID.
4. **Verify / revoke**: issuer checks token ID and revokes if needed.

## Contract Methods

- `CreateTemplate(issuer, name, issuerName, category, maxSupply, description)`
- `UpdateTemplate(issuer, templateId, name, issuerName, category, maxSupply, description)`
- `IssueCertificate(issuer, recipient, templateId, recipientName, achievement, memo)`
- `RevokeCertificate(issuer, tokenId)`
- `Transfer(from, to, tokenId, data)`
- `GetTemplateDetails(templateId)`
- `GetCertificateDetails(tokenId)`

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
