# MiniApp Platform Architecture Modernization Plan

## 1. Current Architecture Analysis

### 1.1 Current Structure
```
miniapps/
├── apps/                    # 41 miniapps
│   ├── breakup-contract/
│   ├── burn-league/
│   └── ...
├── packages/               # Shared packages (config/types/multichain-sdk)
├── shared/                  # Shared code (NOT a package)
│   ├── components/
│   ├── composables/
│   ├── styles/
│   └── utils/
├── scripts/
├── vite.shared.ts          # Shared Vite config
├── pnpm-workspace.yaml
└── package.json
```

### 1.2 Current Strengths ✅
- pnpm workspaces for package management
- Shared Vite configuration (vite.shared.ts)
- Unified shared/ directory for common code
- @neo/uniapp-sdk consumed as an external npm dependency

### 1.3 Current Weaknesses ❌
- No Turborepo for build caching
- `shared/` is not a proper package (uses path alias)
- No centralized TypeScript/ESLint config package
- No type-safe API client with runtime validation
- No versioning/changelog management (Changesets)
- No unified CI/CD pipeline
- No platform-specific exports (web vs native)

---

## 2. Target Architecture (Turborepo + Modern Patterns)

### 2.1 Proposed Structure
```
miniapps/
├── apps/
│   ├── breakup-contract/
│   ├── burn-league/
│   └── ... (41 miniapps)
├── packages/
│   ├── @neo/ui/              # Shared UI components (NEW)
│   ├── @neo/api/             # Type-safe API client (NEW)
│   ├── @neo/types/           # Shared types + Zod schemas (NEW)
│   └── @neo/config/          # ESLint, Prettier, TSConfig (NEW)
├── (external) @neo/uniapp-sdk  # SDK published to npm (consumed by apps)
├── turbo.json                # Turborepo config (NEW)
├── tsconfig.base.json        # Base TS config (NEW)
├── .changeset/               # Changesets config (NEW)
├── .github/workflows/ci.yml  # GitHub Actions CI (NEW)
├── pnpm-workspace.yaml
└── package.json
```

### 2.2 Package Responsibilities

| Package | Purpose |
|---------|---------|
| `@neo/ui` | Shared Vue components (AppLayout, NeoButton, etc.) |
| `@neo/api` | Type-safe API client with Zod validation |
| `@neo/types` | Shared TypeScript types + Zod schemas |
| `@neo/config` | Centralized ESLint, Prettier, TSConfig |
| `@neo/uniapp-sdk` | MiniApp SDK (wallet, payments, etc.), consumed from npm |

---

## 3. Key Improvements to Implement

### 3.1 Turborepo Integration
**Benefits:**
- Incremental builds (only rebuild changed packages)
- Remote caching (share cache across CI and developers)
- Parallel execution
- Dependency graph awareness

**Implementation:**
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": { "cache": false, "persistent": true },
    "build": {
      "outputs": ["dist/**", ".next/**"],
      "dependsOn": ["^build"]
    },
    "lint": { "outputs": [] },
    "test": { "outputs": [] },
    "typecheck": { "outputs": [] }
  }
}
```

### 3.2 Proper Packages for Shared Code
**Convert `shared/` directory to `@neo/ui` package:**

```json
// packages/@neo/ui/package.json
{
  "name": "@neo/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components": "./src/components/index.ts",
    "./styles/*": "./src/styles/*"
  },
  "peerDependencies": {
    "vue": "^3.0.0"
  }
}
```

### 3.3 Type-Safe API Client with Zod
**Create `@neo/api` package:**

```typescript
// packages/@neo/api/src/client.ts
import { z } from "zod";
import { ContractInvokeResult } from "@neo/types";

export class NeoApiClient {
  constructor(private baseUrl: string) {}

  async invokeRead<T>(
    contract: string,
    method: string,
    args: unknown[],
    schema: z.ZodType<T>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/invoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contract, method, args }),
    });
    const data = await response.json();
    return schema.parse(data); // Runtime validation!
  }
}
```

### 3.4 Centralized Config Package
**Create `@neo/config` package:**

```javascript
// packages/@neo/config/eslint.config.js
export default {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "vue"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-recommended"
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": "warn",
    "vue/multi-word-component-names": "off"
  }
};
```

### 3.5 Base TypeScript Config
**Create `tsconfig.base.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@neo/ui": ["packages/@neo/ui/src"],
      "@neo/api": ["packages/@neo/api/src"],
      "@neo/types": ["packages/@neo/types/src"],
      "@neo/config": ["packages/@neo/config/src"]
    }
  }
}
```

### 3.6 Changesets for Versioning
**Benefits:**
- Automated changelog generation
- Semantic versioning
- Coordinated releases

```bash
# Initialize
pnpm dlx changeset init

# When making changes
pnpm changeset  # Create a changeset
pnpm changeset version  # Bump versions
pnpm changeset publish  # Publish to registry
```

### 3.7 GitHub Actions CI
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

---

## 4. Migration Plan

### Phase 1: Foundation (Week 1) ✅ COMPLETED
- [x] Add Turborepo (`turbo.json`)
- [x] Create `tsconfig.base.json`
- [x] Create `@neo/config` package
- [x] Update root `package.json` scripts

### Phase 2: Package Reorganization (Week 2) ✅ COMPLETED
- [x] Convert `shared/` to `@neo/ui` package
- [x] Create `@neo/types` package with Zod schemas
- [ ] Create `@neo/api` package (optional - for future)
- [x] All 43 packages build successfully

### Phase 3: CI/CD & Tooling (Week 3) ✅ COMPLETED
- [ ] Set up Changesets (optional - for future releases)
- [x] Create GitHub Actions workflow
- [ ] Add remote caching (Turborepo + Vercel) (optional)
- [x] Documentation updates

### Phase 4: Platform-Specific Support (Week 4)
- [ ] Add platform-specific exports (web vs native)
- [ ] React Native compatibility layer (if needed)
- [ ] E2E testing setup

---

## 5. Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Build Caching | ❌ None | ✅ Turborepo with remote cache |
| Shared Code | Path alias | Proper packages |
| Type Safety | TypeScript only | TypeScript + Zod runtime |
| Config | Per-app | Centralized package |
| Versioning | Manual | Changesets automated |
| CI/CD | None | GitHub Actions |
| Build Speed | ~5-10min (all) | ~1-2min (incremental) |

---

## 6. Key Learnings from Turborepo Article

### 6.1 Package Structure Best Practices
- Use `workspace:*` for internal dependencies
- Export both CommonJS and ESM when needed
- Use `peerDependencies` for shared runtime deps (Vue, React)

### 6.2 Metro + Symlinks (React Native)
- Configure `watchFolders` for monorepo root
- Add `nodeModulesPaths` for package resolution
- This applies if we add React Native support

### 6.3 Type-Safe API Pattern
- Define schemas with Zod
- Validate at runtime AND compile time
- Single source of truth for types

### 6.4 Platform-Specific Exports
```json
{
  "exports": {
    ".": {
      "import": {
        "react-native": "./src/index.native.tsx",
        "default": "./src/index.web.tsx"
      }
    }
  }
}
```

---

## 7. Quick Wins (Implement First)

1. **Add Turborepo** - Immediate build speed improvement
2. **Create `@neo/config`** - Eliminate config duplication
3. **Add `turbo.json`** - Enable caching and parallel builds
4. **Update CI** - Add GitHub Actions workflow

---

## 8. Commands Reference

```bash
# Development
pnpm dev                    # Start all apps in parallel
pnpm dev --filter=lottery   # Start specific app

# Building
pnpm build                  # Build all with caching
pnpm build --filter=@neo/ui # Build specific package

# Testing
pnpm test                   # Run all tests
pnpm lint                   # Lint all packages

# Versioning
pnpm changeset              # Create changeset
pnpm release                # Version + publish
```
