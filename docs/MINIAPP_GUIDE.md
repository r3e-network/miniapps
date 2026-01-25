# Miniapp Development Guide

This guide provides comprehensive standards, best practices, and framework usage for developing miniapps in the Neo ecosystem.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Framework Components](#framework-components)
4. [Common Patterns](#common-patterns)
5. [Best Practices](#best-practices)
6. [TypeScript Standards](#typescript-standards)
7. [Testing Guidelines](#testing-guidelines)
8. [Deployment](#deployment)

---

## Quick Start

### Creating a New Miniapp

```bash
# 1. Create the app directory
mkdir -p apps/my-new-app/src/{pages,locale,static,components}

# 2. Copy basic structure
cp -r templates/react-starter apps/my-new-app/

# 3. Install dependencies
pnpm install

# 4. Start development
pnpm --filter my-new-app dev
```

### Basic Miniapp Template

```vue
<!-- src/pages/index/index.vue -->
<template>
    <MiniAppLayout
        theme-class="theme-myapp"
        :tabs="navTabs"
        :chain-warning-title="t('wrongChain')"
        :chain-warning-message="t('wrongChainMessage')"
        :chain-warning-button-text="t('switchToNeo')"
    >
        <template #default="{ activeTab }">
            <view v-if="activeTab === 'main'" class="tab-content">
                <!-- Main content here -->
            </view>

            <view v-if="activeTab === 'stats'" class="tab-content scrollable">
                <!-- Stats content here -->
            </view>

            <view v-if="activeTab === 'docs'" class="tab-content scrollable">
                <NeoDoc
                    :title="t('title')"
                    :subtitle="t('docSubtitle')"
                    :description="t('docDescription')"
                    :steps="docSteps"
                    :features="docFeatures"
                />
            </view>
        </template>
    </MiniAppLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { MiniAppLayout, NeoDoc } from "@shared/components";
import { useI18n } from "@/composables/useI18n";

const { t } = useI18n();

const navTabs = computed(() => [
    { id: "main", icon: "game", label: t("main") },
    { id: "stats", icon: "chart", label: t("stats") },
    { id: "docs", icon: "book", label: t("docs") },
]);

const docSteps = computed(() => [
    t("step1"),
    t("step2"),
    t("step3"),
    t("step4"),
]);

const docFeatures = computed(() => [
    { name: t("feature1Name"), desc: t("feature1Desc") },
    { name: t("feature2Name"), desc: t("feature2Desc") },
]);
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./myapp-theme.scss";

.tab-content {
    padding: 16px;
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}
</style>
```

---

## Project Structure

### Standard Miniapp Structure

```
apps/my-miniapp/
├── src/
│   ├── pages/
│   │   └── index/
│   │       ├── index.vue          # Main page component
│   │       └── components/         # Page-specific components
│   │           ├── FeatureCard.vue
│   │           └── StatsDisplay.vue
│   ├── locale/
│   │   └── messages.ts             # i18n messages
│   ├── static/
│   │   └── myapp-theme.scss        # App-specific theme
│   ├── composables/                # App-specific composables
│   │   └── useGameLogic.ts
│   ├── utils/                      # App-specific utilities
│   │   └── helpers.ts
│   ├── App.vue                     # Root component
│   ├── pages.json                  # Page configuration
│   └── manifest.json               # App manifest
├── neo-manifest.json               # Neo-specific manifest
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Shared Resources

```
shared/
├── components/                     # Shared UI components
│   ├── AppLayout.vue
│   ├── MiniAppLayout.vue           # Use this for new apps!
│   ├── ChainWarning.vue           # Chain validation component
│   ├── NeoCard.vue
│   ├── NeoButton.vue
│   └── ...
├── composables/                    # Shared composables
│   ├── useChainValidation.ts      # Chain validation logic
│   └── useI18n.ts
├── utils/                          # Shared utilities
│   ├── format.ts                   # Number, address formatting
│   ├── chain.ts                    # Chain utilities
│   └── theme.ts
└── styles/                         # Shared styles
    ├── tokens.scss
    ├── variables.scss
    └── theme.scss
```

---

## Framework Components

### MiniAppLayout

The `MiniAppLayout` component provides a standardized layout with:

- Automatic chain validation warning
- Tab navigation
- Documentation tab
- Consistent structure

**Usage:**

```vue
<MiniAppLayout
    theme-class="theme-myapp"
    :tabs="navTabs"
    :chain-warning-title="t('wrongChain')"
    :chain-warning-message="t('wrongChainMessage')"
    :chain-warning-button-text="t('switchToNeo')"
    @tab-change="handleTabChange"
    @chain-switch="handleChainSwitch"
>
  <!-- Your content here -->
</MiniAppLayout>
```

**Props:**

| Prop                     | Type       | Default            | Description           |
| ------------------------ | ---------- | ------------------ | --------------------- |
| `themeClass`             | `string`   | `""`               | CSS class for theming |
| `tabs`                   | `NavTab[]` | `[]`               | Navigation tabs       |
| `initialTab`             | `string`   | First tab          | Initially active tab  |
| `hideChainWarning`       | `boolean`  | `false`            | Hide chain warning    |
| `chainWarningTitle`      | `string`   | `"Wrong Network"`  | Warning title         |
| `chainWarningMessage`    | `string`   | See docs           | Warning message       |
| `chainWarningButtonText` | `string`   | `"Switch Network"` | Button text           |

### ChainWarning Component

For standalone chain warning display:

```vue
<template>
    <ChainWarning
        :title="t('wrongChain')"
        :message="t('wrongChainMessage')"
        :button-text="t('switchToNeo')"
        @switch="handleSwitch"
        @switch-complete="handleSuccess"
        @switch-error="handleError"
    />
</template>

<script setup lang="ts">
import { ChainWarning } from "@shared/components";

const handleSwitch = () => {
    console.log("Switching chains...");
};

const handleSuccess = () => {
    console.log("Chain switched successfully");
};

const handleError = (error: Error) => {
    console.error("Failed to switch chain:", error);
};
</script>
```

### useChainValidation Composable

For programmatic chain validation:

```vue
<script setup lang="ts">
import { useChainValidation } from "@shared/composables/useChainValidation";

const { showWarning, switchToAppChain } = useChainValidation();

// Conditionally execute operations based on chain
const someOperation = async () => {
    if (!showWarning.value) {
        // Safe to proceed with Neo operations
        await neoSpecificOperation();
    }
};

// Manual chain switching
const handleSwitchClick = async () => {
    try {
        await switchToAppChain();
        console.log("Switched successfully");
    } catch (error) {
        console.error("Switch failed:", error);
    }
};
</script>
```

---

## Common Patterns

### Pattern 1: Wallet Integration

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useWallet, useEvents } from "@neo/uniapp-sdk";

const { address, connect, invokeContract, getBalance } = useWallet();
const { list: listEvents } = useEvents();

const balance = ref(0);

const fetchData = async () => {
    if (!address.value) {
        await connect();
    }

    const neo = await getBalance("NEO");
    balance.value = typeof neo === "string" ? parseFloat(neo) || 0 : neo;
};

onMounted(() => {
    fetchData();
});
</script>
```

### Pattern 2: Contract Interaction

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import { parseInvokeResult } from "@shared/utils/neo";

const { invokeContract, invokeRead, getContractAddress } = useWallet();

const contractAddress = ref<string | null>(null);

const ensureContractAddress = async () => {
    if (!contractAddress.value) {
        contractAddress.value = await getContractAddress();
    }
    return contractAddress.value;
};

const readContract = async () => {
    const contract = await ensureContractAddress();
    const result = await invokeRead({
        contractAddress: contract,
        operation: "getInfo",
        args: [],
    });
    return parseInvokeResult(result);
};

const writeContract = async (value: number) => {
    const contract = await ensureContractAddress();
    await invokeContract({
        scriptHash: contract,
        operation: "setValue",
        args: [{ type: "Integer", value: String(value) }],
    });
};
</script>
```

### Pattern 3: Event Handling

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useEvents } from "@neo/uniapp-sdk";
import { parseStackItem } from "@shared/utils/neo";

const { list: listEvents } = useEvents();
const APP_ID = "miniapp-myapp";

const loadEvents = async () => {
    const result = await listEvents({
        app_id: APP_ID,
        event_name: "MyEvent",
        limit: 20,
    });

    return result.events.map((evt) => {
        const values = Array.isArray(evt?.state)
            ? evt.state.map(parseStackItem)
            : [];
        return {
            tx: evt.tx_hash,
            timestamp: evt.created_at,
            values,
        };
    });
};

const waitForEvent = async (txid: string, eventName: string) => {
    for (let attempt = 0; attempt < 20; attempt++) {
        const result = await listEvents({
            app_id: APP_ID,
            event_name: eventName,
            limit: 10,
        });
        const match = result.events.find((evt) => evt.tx_hash === txid);
        if (match) return match;
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return null;
};
</script>
```

### Pattern 4: Internationalization

````vue
<script setup lang="ts">
// src/locale/messages.ts
export const messages = {
    title: { en: "My App", zh: "我的应用" },
    description: { en: "Description", zh: "描述" },
    wrongChain: { en: "Wrong Network", zh: "网络错误" },
    wrongChainMessage: {
        en: "Switch to Neo N3 Mainnet",
        zh: "切换到 Neo N3 主网",
    },
    switchToNeo: { en: "Switch Network", zh: "切换网络" },
    main: { en: "Main", zh: "主页" },
    stats: { en: "Stats", zh: "统计" },
    docs: { en: "Docs", zh: "文档" },
    step1: { en: "First step", zh: "第一步" },
    step2: { en: "Second step", zh: "第二步" },
    step3: { en: "Third step", zh: "第三步" },
    step4: { en: "Fourth step", zh: "第四步" },
    feature1Name: { en: "Feature 1", zh: "功能一" },
    feature1Desc: { en: "Description", zh: "描述" },
    feature2Name: { en: "Feature 2", zh: "功能二" },
    feature2Desc: { en: "Description", zh: "描述" },
};
</script>

```vue
<!-- src/composables/useI18n.ts -->
<script setup lang="ts">
import { createUseI18n } from "@shared/utils/i18n";
import { messages } from "../locale/messages";

export const useI18n = createUseI18n(messages);
</script>
````

---

## Best Practices

### DO ✅

1. **Use shared components** - Always import from `@shared/components`
2. **Use shared utilities** - Import formatting functions from `@shared/utils/format`
3. **Use chain validation composable** - Replace inline chain checks with `useChainValidation`
4. **Follow TypeScript strict mode** - Avoid `any` types
5. **Handle errors gracefully** - Always include try-catch for async operations
6. **Use computed properties** - For derived state
7. **Lazy load heavy components** - Use `defineAsyncComponent` when appropriate
8. **Follow naming conventions** - PascalCase for components, camelCase for utilities

### DON'T ❌

1. **Don't duplicate chain validation code** - Use `ChainWarning` component
2. **Don't use `as any`** - Use proper type definitions
3. **Don't ignore errors** - Always handle or log errors
4. **Don't hardcode values** - Use constants or computed properties
5. **Don't create local i18n instances** - Use the shared `useI18n` composable
6. **Don't mix concerns** - Keep business logic in composables
7. **Don't skip testing** - Write tests for critical paths
8. **Don't ignore accessibility** - Use semantic HTML and ARIA labels

---

## TypeScript Standards

### Type Definitions

```typescript
// Define clear interfaces for your data
interface GameState {
    id: string;
    score: number;
    isActive: boolean;
    createdAt: number;
}

interface ContractResult {
    value: unknown;
    success: boolean;
    error?: string;
}

// Use proper return types
async function loadGameState(id: string): Promise<GameState | null> {
    // Implementation
    return null;
}

// Type guard functions
function isValidGameState(data: unknown): data is GameState {
    return (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        "score" in data &&
        "isActive" in data
    );
}
```

### Generic Utilities

```typescript
// Use generics for reusable utilities
function createAsyncState<T>() {
    const data = ref<T | null>(null);
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const execute = async (fn: () => Promise<T>) => {
        isLoading.value = true;
        error.value = null;
        try {
            data.value = await fn();
        } catch (e) {
            error.value = e instanceof Error ? e : new Error(String(e));
        } finally {
            isLoading.value = false;
        }
    };

    return { data, isLoading, error, execute };
}
```

---

## Testing Guidelines

### Unit Tests

```typescript
// tests/components/MyComponent.test.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MyComponent from "../MyComponent.vue";

describe("MyComponent", () => {
    it("renders correctly", () => {
        const wrapper = mount(MyComponent, {
            props: {
                title: "Test Title",
            },
        });
        expect(wrapper.text()).toContain("Test Title");
    });

    it("emits events correctly", async () => {
        const wrapper = mount(MyComponent);
        await wrapper.find("button").trigger("click");
        expect(wrapper.emitted("click")).toBeTruthy();
    });
});
```

### Integration Tests

```typescript
// tests/integration/contract.test.ts
import { describe, it, expect } from "vitest";
import { invokeContract } from "@neo/uniapp-sdk";

describe("Contract Integration", () => {
    it("reads contract state correctly", async () => {
        const result = await invokeContract({
            scriptHash: "0x...",
            operation: "getInfo",
            args: [],
        });
        expect(result).toBeDefined();
    });
});
```

---

## Deployment

### Build Process

```bash
# Build all miniapps
pnpm build

# Build specific miniapp
pnpm --filter my-miniapp build

# Build with type checking
pnpm --filter my-miniapp typecheck
```

### Pre-deployment Checklist

- [ ] All TypeScript errors resolved
- [ ] Tests passing
- [ ] i18n messages complete (en + zh)
- [ ] Chain validation implemented
- [ ] Error handling in place
- [ ] Loading states defined
- [ ] Theme variables set
- [ ] Documentation updated

---

## Additional Resources

- [Neo N3 Documentation](https://docs.neo.org/)
- [UniApp Documentation](https://uniapp.dcloud.net.cn/)
- [Vue 3 Documentation](https://vuejs.org/)
- [pnpm Workspace](https://pnpm.io/workspaces)

---

## Changelog

| Version | Date       | Changes                                 |
| ------- | ---------- | --------------------------------------- |
| 1.0.0   | 2025-01-25 | Initial guide with framework components |
