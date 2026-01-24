# Event Ticket Pass

NEP-11 event tickets with QR check-in.

## Overview

| Property | Value |
|----------|-------|
| **App ID** | `miniapp-event-ticket-pass` |
| **Category** | utility |
| **Version** | 1.0.0 |
| **Framework** | Vue 3 (uni-app) |

## Features

- Create events with supply limits
- Issue NEP-11 tickets to attendees
- Display ticket QR for check-in
- Creator/gateway check-in marks tickets as used

## User Flow

1. **Create event**: set title, venue, schedule, and max supply.
2. **Issue tickets**: send tickets to attendee addresses.
3. **Show QR**: attendee opens “My Tickets” to show QR.
4. **Check-in**: organizer scans token ID and marks used.

## Contract Methods

- `CreateEvent(creator, name, venue, startTime, endTime, maxSupply, notes)`
- `UpdateEvent(creator, eventId, name, venue, startTime, endTime, maxSupply, notes)`
- `IssueTicket(creator, recipient, eventId, seat, memo)`
- `CheckIn(creator, tokenId)`
- `Transfer(from, to, tokenId, data)`
- `GetEventDetails(eventId)`
- `GetTicketDetails(tokenId)`

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
