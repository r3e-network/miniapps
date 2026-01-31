# Neo N3 Only Platform Simplification Design

**Date:** 2026-01-31

## Goal
Simplify the MiniApp platform to support **only** Neo N3 mainnet and testnet, removing multi-chain (EVM/NeoX) concepts from registry output, host-app types/UI, and Supabase storage.

## Non-Goals
- No changes to on-chain contract code.
- No redesign of MiniApp UI/UX beyond network display.
- No changes to the CDN paths or entry URL structure.

## Current State (Summary)
- Manifests and registry output include multi-chain constructs (`supportedChains`, `chainContracts`).
- Host app has multi-chain types and chain registry with EVM/NeoX configs.
- Supabase stores per-chain rows via `chain_id` and `contract_address`.

## Target State
- **Single row per app** in Supabase.
- Registry output includes only Neo N3 mainnet/testnet via a `contracts` object.
- Host app types and chain registry are **Neo N3 only**.

---

## Data Model Changes

### Registry (`public/data/miniapps.json`)
Remove:
- `supportedChains`
- `chainContracts`

Add / retain:
- `contracts` (Neo N3 only)
- `default_network` (must be `neo-n3-mainnet` or `neo-n3-testnet`)

Example output:
```json
{
  "app_id": "miniapp-lottery",
  "name": "Lottery",
  "entry_url": "/miniapps/lottery/index.html",
  "default_network": "neo-n3-mainnet",
  "contracts": {
    "neo-n3-mainnet": { "address": "0x...", "active": true },
    "neo-n3-testnet": { "address": "0x...", "active": true }
  }
}
```

Policy: always include both keys (`neo-n3-mainnet`, `neo-n3-testnet`). If unknown, set `address: null` and `active: false` to keep a stable schema.

### Supabase
- Single row per app.
- Remove per-chain rows.
- Store contracts JSON in a `contracts` column.

New columns:
- `contracts JSONB NOT NULL`
- `default_network TEXT NOT NULL`

Drop columns:
- `chain_id`
- `contract_address`
- `contract_hash`
- `supported_networks` (no longer needed)

---

## Host App / SDK Simplification

### Types
- `ChainId` becomes a strict union of `"neo-n3-mainnet" | "neo-n3-testnet"`.
- Remove `ChainType`, EVM chain IDs, and EVM-specific configs.
- `MiniAppInfo` replaces `supportedChains`/`chainContracts` with:
  ```ts
  contracts: {
    "neo-n3-mainnet"?: { address: string | null; active?: boolean; entryUrl?: string };
    "neo-n3-testnet"?: { address: string | null; active?: boolean; entryUrl?: string };
  };
  default_network: "neo-n3-mainnet" | "neo-n3-testnet";
  ```

### Chain Registry
- Keep only `NEO_N3_MAINNET` and `NEO_N3_TESTNET` configs.
- Remove NeoX/Ethereum/Polygon/BSC configs and EVM helpers.
- Wallet providers limited to Neo wallet providers.

### UI
- Network badges and selection derive from `contracts` keys (N3 only).
- Replace any multi-chain UI text with "Neo N3 Mainnet" / "Neo N3 Testnet".

### Tests
- Remove or rewrite multi-chain tests to N3-only tests.
- Add tests verifying contract selection and default network behavior.

---

## Script Changes

### `scripts/auto-discover-miniapps.js`
- Emit `contracts` and `default_network` only.
- Filter manifests to N3 mainnet/testnet keys.
- Stop emitting `supportedChains` / `chainContracts`.

### `scripts/deploy/to-supabase-upsert.js`
- Single-row upsert per app_id.
- Build `contracts` JSON from manifest, filtered to N3.
- Persist `default_network`.
- Remove per-chain loop and `chain_id` logic.

### Manifest Normalizers
- `scripts/standardize-manifests.js`, `scripts/auto-discover.js`, `scripts/update-manifests.py`:
  - Stop emitting `supported_networks` / `supported_chains`.
  - Ensure `contracts` only contains N3 mainnet/testnet.

---

## Migration Plan (Supabase)

1. Create new table `miniapp_stats_v2` with the simplified schema.
2. Backfill by grouping old rows by `app_id`:
   - Build `contracts` JSON from existing `contract_address` for mainnet/testnet rows.
   - Set `default_network` from manifest if present, else `neo-n3-mainnet`.
3. Validate row counts and sampled apps.
4. Swap tables or rename.
5. Drop deprecated columns in old table (if keeping same table name).

---

## Documentation Updates
- Update platform integration docs to remove multi-chain references.
- Remove `supportedChains` / `chainContracts` examples.
- Update manifest/spec docs to N3-only contract fields.

---

## Risks & Mitigations
- **Risk:** Host-app code assumes multi-chain arrays.
  - **Mitigation:** Replace with contracts-derived network list and add targeted tests.
- **Risk:** Supabase migration data loss.
  - **Mitigation:** Backfill into v2 table and validate before swap.

---

## Verification
- Regenerate registry and validate shape.
- Host-app tests pass after type updates.
- Supabase migration dry-run verified on staging or backup.

