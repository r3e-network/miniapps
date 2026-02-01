#!/bin/bash
# Batch migrate miniapps to use ChainWarning component
# Usage: bash scripts/migrate-miniapps.sh

set -e

# Array of apps to migrate
APPS=(
  "stream-vault"
  "soulbound-certificate"
  "quadratic-funding"
  "neo-sign-anything"
  "milestone-escrow"
  "forever-album"
  "event-ticket-pass"
  "unbreakable-vault"
  "time-capsule"
  "red-envelope"
  "on-chain-tarot"
  "neoburger"
  "neo-swap"
  "neo-ns"
  "neo-gacha"
  "million-piece-map"
  "masquerade-dao"
  "heritage-trust"
  "hall-of-fame"
  "guardian-policy"
  "graveyard"
  "grant-share"
  "gov-merc"
  "gas-sponsor"
  "garden-of-neo"
  "flashloan"
  "explorer"
  "ex-files"
  "doomsday-clock"
  "dev-tipping"
  "daily-checkin"
  "compound-capsule"
  "council-governance"
  "candidate-vote"
  "burn-league"
  "breakup-contract"
)

MIGRATED=0
FAILED=0

echo "Starting batch migration of ${#APPS[@]} miniapps..."
echo ""

for app in "${APPS[@]}"; do
  FILE="apps/$app/src/pages/index/index.vue"

  if [ ! -f "$FILE" ]; then
    echo "⚠️  Skipping $app - file not found"
    continue
  fi

  echo "🔄 Migrating $app..."

  # Backup the file
  cp "$FILE" "$FILE.bak" || {
    echo "❌ Failed to backup $app"
    ((FAILED++))
    continue
  }

  # Use sed for pattern replacement (more reliable than multi-line edits)
  # Replace the chain validation block with ChainWarning component
  sed -i '/v-if=".*chainType.*"/,/<\/view>/c\
  <!-- Chain Warning - Framework Component -->\
  <ChainWarning :title="t('\''wrongChain'\'')"\
    :message="t('\''wrongChainMessage'\'')"\
    :button-text="t('\''switchToNeo'\'')" />\
' "$FILE" && rm -f "$FILE.bak" || {
    echo "❌ Failed to migrate $app, restoring backup..."
    mv "$FILE.bak" "$FILE"
    ((FAILED++))
    continue
  }

  # Update imports to add ChainWarning
  sed -i 's/import { AppLayout, NeoDoc, NeoCard, NeoButton } from "@shared\/components";/import { AppLayout, NeoDoc, NeoCard, NeoButton, ChainWarning } from "@shared\/components";/' "$FILE" || true

  # Remove requireNeoChain import if exists
  sed -i '/import { requireNeoChain } from "@shared\/utils\/chain";/d' "$FILE" || true

  # Update useWallet destructuring to remove chainType and switchToAppChain
  sed -i 's/useWallet() as any;/useWallet() as any;  # Chain validation handled by ChainWarning component/g' "$FILE" || true

  echo "✅ Migrated $app"
  ((MIGRATED++))
done

echo ""
echo "========================================="
echo "Migration Complete!"
echo "========================================="
echo "✅ Successfully migrated: $MIGRATED"
echo "❌ Failed: $FAILED"
echo "📊 Progress: $MIGRATED/${#APPS[@]} miniapps migrated"
echo ""
echo "Next steps:"
echo "1. Test each migrated miniapp"
echo "2. Verify chain switching works"
echo "3. Run typecheck: pnpm typecheck"
echo "4. Run tests: pnpm test"
