# @neo/types

Shared TypeScript types and Zod schemas for the Neo MiniApp platform.

## Features

- **Type-safe interfaces** for wallet, contract, and SDK operations
- **Zod schemas** for runtime validation of API responses
- **Single source of truth** for types across all packages

## Installation

This is an internal package. Add it as a dependency in your app:

```json
{
  "dependencies": {
    "@neo/types": "workspace:*"
  }
}
```

## Usage

### TypeScript Types

```typescript
import type { WalletState, TransactionResult } from "@neo/types";

const wallet: WalletState = {
  connected: true,
  address: "NXV7...",
  publicKey: "03...",
  network: "N3MainNet",
};
```

### Zod Schemas (Runtime Validation)

```typescript
import { TransactionResultSchema } from "@neo/types/schemas";

// Validate API response at runtime
const result = TransactionResultSchema.parse(apiResponse);
// result is now type-safe!
```

## Exports

| Path | Contents |
|------|----------|
| `@neo/types` | All types |
| `@neo/types/wallet` | Wallet types |
| `@neo/types/contract` | Contract types |
| `@neo/types/schemas` | Zod validation schemas |
