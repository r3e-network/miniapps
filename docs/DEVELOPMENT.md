# Miniapps Development Guide

## Overview

This guide covers the complete development process for miniapps in this monorepo, from setup to deployment.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Testing](#testing)
5. [Building & Deployment](#building--deployment)
6. [Architecture Patterns](#architecture-patterns)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 1. Getting Started

### Prerequisites

- **Node.js**: 18+
- **pnpm**: Latest version
- **Git**: For version control

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd miniapps

# Install dependencies
pnpm install

# Verify setup
pnpm typecheck
pnpm test
```

### IDE Setup

#### VSCode (Recommended)

Install these extensions:

- **Vue - Official** (Vue language support)
- **TypeScript Vue Plugin** (Volar)
- **Prettier** (Code formatting)
- **ESLint** (Linting)

#### Recommended Settings

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "volar.takeOverMode.enabled": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## 2. Project Structure

### Monorepo Layout

```
miniapps/
├── apps/                          # Miniapp applications
│   ├── lottery/                   # Example miniapp
│   ├── coin-flip/                 # Example miniapp
│   └── ...
├── packages/@neo/                 # Internal packages
│   ├── config/                    # Shared configs (ESLint, TSConfig)
│   ├── multichain-sdk/            # Multi-chain wallet SDK
│   ├── uniapp-sdk/                # UniApp-specific SDK
│   └── types/                     # TypeScript type definitions
├── shared/                        # Shared Vue components & utilities
│   ├── components/                # Reusable Vue components
│   ├── composables/               # Shared composables
│   ├── utils/                     # Utility functions
│   ├── styles/                    # Shared styles
│   └── locale/                   # i18n messages
├── templates/                     # App templates
│   └── miniapp-starter/           # New miniapp template
├── scripts/                       # Build & utility scripts
├── vite.shared.ts                 # Shared Vite config
├── turbo.json                     # Turborepo config
├── pnpm-workspace.yaml            # Workspace config
├── STANDARDS.md                   # Development standards
└── DEVELOPMENT.md                 # This file
```

### Miniapp Structure

Each miniapp follows this structure:

```
apps/{app-name}/
├── src/
│   ├── App.vue                    # Root component
│   ├── pages/
│   │   ├── index/
│   │   │   ├── index.vue          # Main page
│   │   │   ├── components/        # Page components
│   │   │   ���── composables/       # Page logic
│   │   │   ├── index.test.ts      # Tests
│   │   │   └── {app}-theme.scss   # Theme
│   │   └── docs/
│   │       └── index.vue          # Documentation
│   ├── locale/
│   │   └── messages.ts            # i18n
│   ├── static/                    # Assets
│   └── shims/                     # Type declarations
├── dist/                          # Build output
├── vite.config.ts                 # Vite config
├── package.json
└── README.md
```

---

## 3. Development Workflow

### Creating a New Miniapp

```bash
# 1. Copy the template
cp -r templates/miniapp-starter apps/my-new-app

# 2. Update configuration
cd apps/my-new-app
# Edit package.json - update name, description

# 3. Update app constants
# Edit src/pages/index/index.vue:
#   - Set APP_ID
#   - Set CONTRACT_HASH (if applicable)

# 4. Customize theme
# Edit src/pages/index/index-theme.scss

# 5. Add translations
# Edit src/locale/messages.ts

# 6. Implement your logic
# Edit src/pages/index/index.vue

# 7. Install dependencies
pnpm install

# 8. Start development
pnpm dev
```

### Development Commands

```bash
# Development server (H5)
pnpm dev

# Type checking
pnpm typecheck

# Run tests
pnpm test
pnpm test:run
pnpm test:coverage

# Linting
pnpm lint
pnpm lint:fix

# Build for production
pnpm build
```

### Using Shared Components

```vue
<script setup lang="ts">
import {
  AppLayout,
  NeoCard,
  NeoButton,
  ChainWarning,
} from "@shared/components";
import { usePageState, useContractInteraction } from "@shared/composables";
import { handleAsync, formatNumber } from "@shared/utils/format";
import type { NavTab } from "@shared/components/NavBar.vue";
</script>
```

---

## 4. Testing

### Test Structure

Place tests next to the code being tested:

```
src/pages/index/
├── index.vue
├── index.test.ts              # Page tests
├── components/
│   ├── MyComponent.vue
│   └── MyComponent.test.ts    # Component tests
└── composables/
    ├── usePageState.ts
    └── usePageState.test.ts   # Composable tests
```

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("@neo/uniapp-sdk", () => ({
  useWallet: vi.fn(() => ({
    address: ref("Nxxx..."),
    connect: vi.fn(),
  })),
}));

describe("My Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should work correctly", () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

### Coverage Requirements

- **New apps**: Minimum 70% coverage
- **Shared components**: Minimum 90% coverage
- **Composables**: Minimum 80% coverage

---

## 5. Building & Deployment

### Build Process

```bash
# Build a single app
cd apps/my-app
pnpm build

# Build all apps
pnpm build:all
```

### Build Output

Built files are in `dist/build/h5/`:

```
apps/my-app/dist/build/h5/
├── static/
│   ├── js/
│   ├── css/
│   └── assets/
├── index.html
└── ...
```

### Deployment to NeoHub

1. **Build your app**

   ```bash
   cd apps/my-app
   pnpm build
   ```

2. **Upload to NeoHub**
   - Navigate to your app in NeoHub
   - Upload the contents of `dist/build/h5/`
   - Configure your app ID and settings

3. **Test on NeoHub**
   - Verify all features work
   - Test wallet connection
   - Test contract interactions

---

## 6. Architecture Patterns

### Component Architecture

```
AppLayout (Root)
├── NavBar (Navigation)
└── Pages
    ├── index (Main functionality)
    │   ├── Sub-components
    │   └── Shared components
    └── docs (Documentation)
        └── NeoDoc
```

### State Management

1. **Local State** (Preferred)

   ```typescript
   const count = ref(0);
   const user = ref<User | null>(null);
   ```

2. **Composables** (For shared logic)

   ```typescript
   const { isLoading, error, invoke } = useContractInteraction(hash);
   ```

3. **Props Down, Events Up** (Parent-Child)
   ```vue
   <Parent>
     <Child :value="data" @update="handleChange" />
   </Parent>
   ```

### Contract Interaction Pattern

```typescript
// 1. Get contract address
const contract = await getContractAddress();

// 2. Pay GAS (if needed)
const payment = await payGAS(amount, memo);

// 3. Invoke contract
const tx = await invokeContract({
  scriptHash: contract,
  operation: "myMethod",
  args: [
    { type: "String", value: "arg1" },
    { type: "Integer", value: 123 },
  ],
});

// 4. Parse result
const txid = String(tx?.txid || tx?.txHash);
```

### Event Listening Pattern

```typescript
// Poll for events
const waitForEvent = async (txid: string, eventName: string) => {
  for (let i = 0; i < 20; i++) {
    const result = await listEvents({
      app_id: APP_ID,
      event_name: eventName,
      limit: 20,
    });

    const match = result.events.find((e) => e.tx_hash === txid);
    if (match) return match;

    await sleep(1500);
  }
  return null;
};
```

---

## 7. Best Practices

### Code Organization

1. **Single Responsibility**
   - Each component/composable has one clear purpose
   - Extract when file exceeds limits

2. **DRY Principle**
   - Use shared components and utilities
   - Extract common patterns to composables

3. **Type Safety**
   - Use TypeScript for all code
   - Avoid `as any` - use proper types
   - Import types from `@neo/types`

### Performance

1. **Computed Properties**

   ```typescript
   // ✅ Good - cached
   const fullName = computed(() => `${first.value} ${last.value}`);

   // ❌ Bad - recalculated every access
   const fullName = () => `${first.value} ${last.value}`;
   ```

2. **Lazy Loading**

   ```typescript
   // Load components only when needed
   const HeavyComponent = defineAsyncComponent(
     () => import("./HeavyComponent.vue"),
   );
   ```

3. **Avoid Unnecessary Reactivity**

   ```typescript
   // ✅ Good - not reactive
   const CONFIG = { max: 100 };

   // ❌ Bad - unnecessarily reactive
   const config = ref({ max: 100 });
   ```

### Security

1. **Validate All Inputs**

   ```typescript
   const validate = (input: string): boolean => {
     return input.length > 0 && input.length <= 100;
   };
   ```

2. **Never Trust Client Data**

   ```typescript
   // Always verify on contract
   const result = await contract.validate(input);
   ```

3. **Handle Errors Gracefully**
   ```typescript
   try {
     await operation();
   } catch (error) {
     // Log and show user-friendly message
     console.error(error);
     showError("Operation failed");
   }
   ```

---

## 8. Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist .turbo
pnpm install
pnpm build
```

#### Type Errors

```bash
# Regenerate types
pnpm typecheck --noEmit
```

#### Tests Fail

```bash
# Run tests in watch mode to debug
pnpm test --watch

# Run specific test file
pnpm test path/to/test.test.ts
```

#### Wallet Connection Issues

```bash
# Verify NeoHub wallet connection
# Check browser console for errors
# Verify APP_ID matches NeoHub registration
```

### Getting Help

1. **Check Documentation**
   - [STANDARDS.md](./STANDARDS.md)
   - [FRAMEWORK_SUMMARY.md](./docs/FRAMEWORK_SUMMARY.md)
   - [MINIAPP_GUIDE.md](./docs/MINIAPP_GUIDE.md)

2. **Search Similar Apps**

   ```bash
   # Find apps with similar functionality
   rg "pattern" apps/ --files-with-matches
   ```

3. **Create an Issue**
   - Describe the problem
   - Include error messages
   - Share reproduction steps

---

## Quick Reference

### Import Patterns

```typescript
// Components
import { AppLayout, NeoCard, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";

// Composables
import { usePageState, useContractInteraction } from "@shared/composables";

// Utils
import { formatNumber, sleep, toFixed8 } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { handleAsync } from "@shared/utils/errorHandling";

// Wallet SDK
import { useWallet, usePayments, useEvents } from "@neo/uniapp-sdk";

// Types
import type { WalletSDK, InvokeResult } from "@neo/types";

// i18n
import { useI18n } from "@/composables/useI18n";
```

### Common Patterns

```typescript
// Chain validation (automatic via ChainWarning component)
<ChainWarning
  :title="t('wrongChain')"
  :message="t('wrongChainMessage')"
  :button-text="t('switchToNeo')"
/>

// Error handling
const result = await handleAsync(
  async () => await riskyOperation(),
  {
    context: "Operation name",
    onError: (error) => setError(error.message)
  }
);

// Contract call
const tx = await invokeContract({
  scriptHash: contract,
  operation: "method",
  args: [{ type: "String", value: "arg" }]
});

// Event polling
const event = await pollForEvent(
  () => listEvents({ app_id: APP_ID, event_name: "MyEvent" }),
  (e) => e.tx_hash === txid,
  { timeoutMs: 30000 }
);
```

---

## Additional Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [UniApp Documentation](https://uniapp.dcloud.net.cn/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [NeoHub Documentation](https://neohub.dev/)
