# Supabase Duplicate Cleanup Guide

## Problem Summary

The `miniapp_stats` table contains duplicate entries caused by inconsistent naming conventions during different import periods.

### Root Cause

Two separate imports created the same miniapps with different `app_id` formats:

| Period     | Count      | Naming Convention    | Example             |
| ---------- | ---------- | -------------------- | ------------------- |
| 2025-12-31 | 67 records | snake_case/camelCase | `miniapp-selfloan`  |
| 2026-01-25 | 44 records | kebab-case           | `miniapp-self-loan` |

The newer records have complete metadata (name, description, etc.), while older records lack the `name` field.

### Duplicate Pairs

| Old (to delete)          | New (keep)                |
| ------------------------ | ------------------------- |
| miniapp-timecapsule      | miniapp-time-capsule      |
| miniapp-selfloan         | miniapp-self-loan         |
| miniapp-redenvelope      | miniapp-red-envelope      |
| miniapp-unbreakablevault | miniapp-unbreakable-vault |
| miniapp-predictionmarket | miniapp-prediction-market |
| miniapp-masqueradedao    | miniapp-masquerade-dao    |
| miniapp-gardenofneo      | miniapp-garden-of-neo     |
| miniapp-guardianpolicy   | miniapp-guardian-policy   |
| miniapp-heritagetrust    | miniapp-heritage-trust    |
| miniapp-millionpiecemap  | miniapp-million-piece-map |
| miniapp-compoundcapsule  | miniapp-compound-capsule  |
| miniapp-burnleague       | miniapp-burn-league       |
| miniapp-breakupcontract  | miniapp-breakup-contract  |
| miniapp-govmerc          | miniapp-gov-merc          |
| miniapp-doomsdayclock    | miniapp-doomsday-clock    |
| miniapp-devtipping       | miniapp-dev-tipping       |

## Cleanup Procedure

### Step 1: Dry Run (Review)

```bash
node scripts/cleanup-supabase-duplicates.js
```

This will show all 67 records that will be deleted without making changes.

### Step 2: Execute Cleanup

```bash
node scripts/cleanup-supabase-duplicates.js --execute
```

This will delete the 67 old records that lack the `name` field.

### Step 3: Verification

The script automatically verifies after deletion. You can also manually verify:

```bash
node scripts/check-supabase-duplicates.js
```

Expected result:

- Total records: 44 (down from 111)
- All records have `name` field populated

## Prevention

To prevent future duplicates:

1. **Use consistent naming**: Always use kebab-case for `app_id` (e.g., `miniapp-my-app`)
2. **Check before insert**: The registration script uses `Prefer: resolution=merge-duplicates`
3. **Unique constraint**: The table has a unique constraint on `(app_id, chain_id)`

## Scripts

| Script                                   | Purpose                               |
| ---------------------------------------- | ------------------------------------- |
| `scripts/check-supabase-duplicates.js`   | Check for duplicates in miniapp_stats |
| `scripts/check-all-duplicates.js`        | Check all tables for duplicates       |
| `scripts/cleanup-supabase-duplicates.js` | Clean up duplicates (with dry-run)    |
| `scripts/list-supabase-tables.js`        | List all Supabase tables              |

## Safety Features

- **Dry-run by default**: Must use `--execute` flag to actually delete
- **Verification step**: Automatically checks after deletion
- **Selective deletion**: Only deletes records without `name` field
- **Transaction-based**: Each deletion is atomic

## Rollback

If needed, you can restore deleted records from:

1. Supabase Dashboard > Database > Backups
2. Repopulate using `scripts/deploy/to-supabase.js` with old naming convention

## Current Status

### Before Cleanup

- **Total records**: 111
- **With name**: 44 (keep)
- **Without name**: 67 (delete)

### After Cleanup ✅

- **Total records**: 44
- **With name**: 44 (100%)
- **Without name**: 0
- **Cleanup date**: 2026-01-26

All duplicate entries have been successfully removed. The table now contains only the newer records with complete metadata and consistent kebab-case naming.
