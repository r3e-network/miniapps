#!/usr/bin/env python3
"""
Batch migrate miniapps to use ChainWarning component.

This script reliably migrates miniapps by:
1. Finding chain validation template code
2. Replacing it with ChainWarning component
3. Updating imports
4. Removing unused variables
"""

import re
import sys
from pathlib import Path

# List of apps to migrate
APPS = [
    "lottery",
    "coin-flip",
    "self-loan",
    "explorer",
    "neo-swap",
    "stream-vault",
    "soulbound-certificate",
    "quadratic-funding",
    "neo-sign-anything",
    "milestone-escrow",
    "forever-album",
    "event-ticket-pass",
    "unbreakable-vault",
    "time-capsule",
    "red-envelope",
    "on-chain-tarot",
    "neoburger",
    "neo-swap",
    "neo-ns",
    "neo-gacha",
    "million-piece-map",
    "masquerade-dao",
    "heritage-trust",
    "hall-of-fame",
    "guardian-policy",
    "graveyard",
    "grant-share",
    "gov-merc",
    "gas-sponsor",
    "garden-of-neo",
    "flashloan",
    "ex-files",
    "doomsday-clock",
    "dev-tipping",
    "daily-checkin",
    "compound-capsule",
    "council-governance",
    "candidate-vote",
    "burn-league",
    "breakup-contract",
]

# Pattern for the chain validation template block
# Handles various structural variations including missing elements and custom implementations
TEMPLATE_PATTERN = re.compile(
    r'''<view v-if="chainType === 'evm'"[^>]*>.*?</view>\s*(?=<view v-if=|<!--|<NeoCard|</AppLayout>)''',
    re.MULTILINE | re.DOTALL,
)

# Replacement template
REPLACEMENT = '''<!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />'''


def migrate_file(file_path: Path) -> bool:
    """Migrate a single miniapp file."""
    try:
        content = file_path.read_text(encoding="utf-8")
        original_content = content

        # Step 1: Replace template
        content = TEMPLATE_PATTERN.sub(REPLACEMENT, content)

        # Check if chainType is used programmatically (outside template)
        uses_chain_type = bool(re.search(r'\bchainType\b', content))
        uses_require_neo = 'requireNeoChain' in content

        # Step 2: Update imports - add ChainWarning
        import_pattern = re.compile(
            r'''import { ([^}]+) } from "@shared/components";''',
            re.MULTILINE,
        )

        def add_chain_warning(match):
            imports = match.group(1)
            if "ChainWarning" not in imports:
                return f'import {{ {imports}, ChainWarning }} from "@shared/components";'
            return match.group(0)

        content = import_pattern.sub(add_chain_warning, content)

        # Step 3: Update useWallet destructuring
        # Keep chainType if used programmatically, remove switchToAppChain
        wallet_pattern = re.compile(
            r'''const { ([^}]+) } = useWallet\(\) as any;''',
            re.MULTILINE,
        )

        def clean_wallet_destructuring(match):
            items = [item.strip() for item in match.group(1).split(",")]
            # Remove switchToAppChain (now handled by ChainWarning component)
            filtered = [i for i in items if i != "switchToAppChain"]
            # Keep chainType if used programmatically
            if not uses_chain_type:
                filtered = [i for i in filtered if i != "chainType"]

            if not filtered:
                # Keep empty destructuring with comment
                return "// Chain validation handled by ChainWarning component\nconst {} = useWallet() as any;"

            if not uses_chain_type:
                return f"// Chain validation handled by ChainWarning component\nconst {{ {', '.join(filtered)} }} = useWallet() as any;"
            return f"const {{ {', '.join(filtered)} }} = useWallet() as any;"

        content = wallet_pattern.sub(clean_wallet_destructuring, content)

        # Step 4: Keep requireNeoChain import if used, otherwise remove it
        if not uses_require_neo:
            content = re.sub(
                r'''import { requireNeoChain } from "@shared/utils/chain";\s*\n''',
                "",
                content,
            )

        # Only write if content changed
        if content != original_content:
            file_path.write_text(content, encoding="utf-8")
            return True

        return False

    except Exception as e:
        print(f"❌ Error migrating {file_path.name}: {e}")
        return False


def main():
    """Main migration script."""
    base_path = Path(__file__).parent.parent
    migrated = 0
    failed = 0
    skipped = 0

    print(f"Starting batch migration of {len(APPS)} miniapps...")
    print()

    for app in APPS:
        file_path = base_path / "apps" / app / "src" / "pages" / "index" / "index.vue"

        if not file_path.exists():
            print(f"⚠️  Skipping {app} - file not found")
            skipped += 1
            continue

        print(f"🔄 Migrating {app}...")

        if migrate_file(file_path):
            print(f"✅ Migrated {app}")
            migrated += 1
        else:
            print(f"ℹ️  No changes needed for {app}")
            skipped += 1

    print()
    print("=" * 50)
    print("Migration Complete!")
    print("=" * 50)
    print(f"✅ Successfully migrated: {migrated}")
    print(f"ℹ️  Skipped (no changes): {skipped}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Progress: {migrated}/{len(APPS)} miniapps migrated")
    print()
    print("Next steps:")
    print("1. Test each migrated miniapp")
    print("2. Verify chain switching works")
    print("3. Run typecheck: pnpm typecheck")
    print("4. Run tests: pnpm test")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
