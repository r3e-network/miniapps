# Neo MiniApps Development Workflow

## Overview

This document describes the recommended workflow for developing individual miniapps in the monorepo.

## Prerequisites

- Node.js 22+
- pnpm 10+
- Git

## Workspace Structure

```
miniapps/
├── apps/                  # 52+ miniapp projects
│   ├── lottery/
│   ├── coin-flip/
│   └── ...
├── shared/                # Shared Vue components & composables
├── sdk/                   # neo-miniapps-platform submodule
│   └── packages/
│       ├── @neo/types/    # TypeScript type definitions
│       └── @neo/uniapp-sdk/
├── pnpm-workspace.yaml    # Workspace configuration
└── pnpm-lock.yaml
```

## Installing Dependencies

### Option 1: Install All Dependencies (Recommended for First Setup)

```bash
pnpm install
```

### Option 2: Install Single Miniapp Dependencies

```bash
cd apps/{miniapp-name}
pnpm install
```

## Development Commands

### Run Development Server (H5)

```bash
cd apps/{miniapp-name}
pnpm dev
```

### Build for Production (H5)

```bash
cd apps/{miniapp-name}
pnpm build
```

### Build All Miniapps

```bash
# Build specific miniapp
cd apps/{miniapp-name}
pnpm build

# Or build from root using parallel execution
for app in apps/*/; do
  (cd "$app" && pnpm build) &
done
wait
```

## Quick Start: Develop a Single Miniapp

```bash
# 1. Navigate to the miniapp
cd apps/lottery

# 2. Install dependencies (if not already installed)
pnpm install

# 3. Start development server
pnpm dev

# 4. Open browser at http://localhost:3000

# 5. Make changes - hot reload is enabled

# 6. Build for production when ready
pnpm build
```

## Using SDK in Your Miniapp

The `@neo/uniapp-sdk` and `@neo/types` packages are available as workspace dependencies:

```typescript
// TypeScript imports
import { useWallet, useAccount } from '@neo/uniapp-sdk'
import type { WalletAccount, Transaction } from '@neo/types'
```

## Common Issues

### ENOSPC: System limit for file watchers reached

```bash
# Increase file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### JSON Syntax Errors in package.json

If you see JSON errors after merging changes:

```bash
# Validate all package.json files
for f in apps/*/package.json; do
  python3 -c "import json; json.load(open('$f'))" || echo "ERROR: $f"
done

# Fix trailing commas
python3 -c "
import re, json
for f in ['apps/$app/package.json']:
    with open(f) as file:
        content = file.read()
    # Remove trailing commas before }
    content = re.sub(r',(\s*})', r'\1', content)
    with open(f, 'w') as file:
        file.write(content)
"
```

### Build Fails with Dependency Errors

Ensure SDK is properly linked:

```bash
# From root
pnpm install
cd apps/{miniapp-name}
pnpm install
```

## Testing Changes Across All Miniapps

```bash
# Build all miniapps and check for failures
FAILED=0
for app in apps/*/; do
  name=$(basename "$app")
  echo "Building $name..."
  if ! cd "$app" && pnpm build > /dev/null 2>&1; then
    echo "FAILED: $name"
    FAILED=$((FAILED + 1))
  fi
done
echo "Total failed: $FAILED"
```

## Creating a New Miniapp

1. Copy from template or existing miniapp:

```bash
cd apps
cp -r lottery new-miniapp
cd new-miniapp
```

2. Update `package.json`:

```json
{
  "name": "miniapp-new-miniapp",
  "version": "1.0.0"
}
```

3. Update `neo-manifest.json` with contract address and metadata

4. Start development:

```bash
pnpm dev
```

## Git Workflow

1. **Create feature branch**:

```bash
git checkout -b feature/my-feature
```

2. **Make changes and test**:

```bash
cd apps/lottery
# Make changes
pnpm build
```

3. **Commit changes**:

```bash
git add apps/lottery/
git commit -m "feat: add new feature"
```

4. **Push and create PR**:

```bash
git push origin feature/my-feature
```

## Directory Structure for a Miniapp

```
apps/{miniapp-name}/
├── src/
│   ├── pages/
│   │   └── index/
│   │       └── index.vue
│   ├── components/
│   ├── composables/
│   └── utils/
├── public/
│   ├── logo.png
│   └── banner.png
├── neo-manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── dist/           # Build output
```

## Next Steps

- See [STANDARDS.md](./STANDARDS.md) for code style guidelines
- See [sdk/README.md](./sdk/README.md) for SDK documentation
- Check individual miniapp READMEs for specific instructions
