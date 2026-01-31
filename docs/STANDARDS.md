# Miniapps Development Standards

## Overview

This document defines the standardized patterns, structure, and development process for all miniapps in this monorepo.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Composable Patterns](#composable-patterns)
3. [Component Standards](#component-standards)
4. [State Management](#state-management)
5. [Error Handling](#error-handling)
6. [Testing Standards](#testing-standards)
7. [Styling Guidelines](#styling-guidelines)
8. [Type Safety](#type-safety)
9. [Development Workflow](#development-workflow)
10. [Code Review Checklist](#code-review-checklist)

---

## 1. Project Structure

### Standard App Structure

```
apps/{app-name}/
├── src/
│   ├── App.vue                    # Root component
│   ├── main.ts                    # Entry point (if needed)
│   ├── pages/
│   │   ├── index/
│   │   │   ├── index.vue          # Main page
│   │   │   ├── components/        # Page-specific components
│   │   │   ├── composables/       # Page-specific composables
│   │   │   ├── types.ts           # Page-specific types
│   │   │   ├── utils.ts           # Page-specific utilities
│   │   │   ├── index.test.ts      # Page tests
│   │   │   └── {app}-theme.scss   # Theme variables
│   │   └── docs/
│   │       └── index.vue          # Documentation page
│   ├── locale/
│   │   └── messages.ts            # i18n translations
│   ├── static/                    # Static assets
│   └── shims/
│       └── uni-app.d.ts           # UniApp type declarations
├── vite.config.ts                 # Vite config (minimal)
├── package.json
└── README.md                      # App documentation
```

### Required Directories

- `src/pages/index/` - Main page implementation
- `src/locale/` - Translation files
- `src/static/` - Static assets

### Optional Directories (use when needed)

- `src/pages/index/components/` - Extract when component has >50 lines or is reused
- `src/pages/index/composables/` - Extract logic shared between components
- `src/pages/index/types.ts` - Define when you have >3 complex types
- `src/pages/index/utils.ts` - Create only when logic doesn't fit elsewhere

### Import Path Aliases

```typescript
// Configured in vite.shared.ts
import { something } from "@/"; // src/
import { shared } from "@shared"; // shared/
import { types } from "@neo/types"; // packages/@neo/types/
```

---

## 2. Composable Patterns

### When to Create a Composable

Extract logic into a composable when:

- Logic is used in multiple components
- Logic needs to be tested independently
- Logic has complex state management
- Logic can be reused across apps

### Standard Composables

#### Page State Composable

```typescript
// src/pages/index/composables/usePageState.ts
import { ref } from "vue";

export function usePageState(defaultTab = "main") {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const activeTab = ref(defaultTab);

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (msg: string | null) => {
    error.value = msg;
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    isLoading,
    error,
    activeTab,
    setLoading,
    setError,
    clearError,
  };
}
```

#### Contract Interaction Composable

```typescript
// src/pages/index/composables/useContractInteraction.ts
import { ref } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import { handleAsync } from "@shared/utils/errorHandling";

export function useContractInteraction(scriptHash: string) {
  const { invokeContract, invokeRead } = useWallet() as any;
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const invoke = async (operation: string, args: any[]) => {
    return handleAsync(
      async () => {
        isLoading.value = true;
        const result = await invokeContract({ scriptHash, operation, args });
        return result;
      },
      {
        onError: (e) => {
          error.value = e;
        },
      },
    );
  };

  const read = async (operation: string, args: any[]) => {
    return handleAsync(
      async () => {
        isLoading.value = true;
        const result = await invokeRead({ scriptHash, operation, args });
        return result;
      },
      {
        onError: (e) => {
          error.value = e;
        },
      },
    );
  };

  return {
    isLoading,
    error,
    invoke,
    read,
  };
}
```

#### Form State Composable

```typescript
// src/pages/index/composables/useFormState.ts
import { reactive, computed } from "vue";

export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  validate?: (values: T) => Record<string, string> | null,
) {
  const values = reactive({ ...initialValues });
  const errors = reactive<Record<string, string>>({});
  const touched = reactive<Record<string, boolean>>({});

  const setFieldValue = <K extends keyof T>(field: K, value: T[K]) => {
    values[field] = value;
    touched[field] = true;
  };

  const setError = (field: string, message: string) => {
    errors[field] = message;
  };

  const clearError = (field: string) => {
    delete errors[field];
  };

  const validate = (): boolean => {
    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors) {
        Object.assign(errors, validationErrors);
        return false;
      }
    }
    return true;
  };

  const isValid = computed(() => Object.keys(errors).length === 0);

  const reset = () => {
    Object.assign(values, initialValues);
    Object.keys(errors).forEach((key) => delete errors[key]);
    Object.keys(touched).forEach((key) => delete touched[key]);
  };

  return {
    values,
    errors,
    touched,
    isValid,
    setFieldValue,
    setError,
    clearError,
    validate,
    reset,
  };
}
```

### Usage Pattern

```vue
<script setup lang="ts">
import { usePageState } from "./composables/usePageState";
import { useContractInteraction } from "./composables/useContractInteraction";

const { isLoading, error, activeTab } = usePageState("game");
const { invoke } = useContractInteraction(CONTRACT_HASH);

const doAction = async () => {
  const result = await invoke("someOperation", [arg1, arg2]);
  if (result.success) {
    // Handle success
  }
};
</script>
```

---

## 3. Component Standards

### Component Size Limits

- **Page components**: Max 300 lines - extract subcomponents
- **Subcomponents**: Max 150 lines - further extraction
- **Composables**: Max 100 lines - split into multiple

### Component Structure Template

````vue
<template>
  <view class="theme-{app-name} component-name">
    <!-- Template content -->
  </view>
</template>

<script setup lang="ts">
/**
 * ComponentName - Brief description
 *
 * @example
 * ```vue
 * <ComponentName
 *   :prop-name="value"
 *   @event-name="handler"
 * />
 * ```
 */

// 1. Imports
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import type { SomeType } from "./types";

// 2. Props
interface Props {
  modelValue: string;
  required?: boolean;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
});

// 3. Emits
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "submit"): void;
  (e: "cancel"): void;
}>();

// 4. Composables
const { something } = useSomeComposable();

// 5. State
const localValue = ref(props.modelValue);

// 6. Computed
const isValid = computed(() => {
  return localValue.value.length > 0;
});

// 7. Methods
const handleSubmit = () => {
  if (isValid.value) {
    emit("submit");
  }
};

// 8. Lifecycle
onMounted(() => {
  // Initialization
});

onUnmounted(() => {
  // Cleanup
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";

.component-name {
  /* Styles */
}
</style>
````

### Props Definition Rules

1. Always use TypeScript interfaces
2. Provide JSDoc comments for complex props
3. Define sensible defaults
4. Use `.sync` / `v-model` pattern for two-way binding

### Event Definition Rules

1. Use TypeScript for type-safe emits
2. Follow kebab-case naming for events
3. Provide JSDoc for complex events

---

## 4. State Management

### Local State (Preferred)

```typescript
// Use for component-local state
const count = ref(0);
const user = ref<User | null>(null);
const items = ref<Item[]>([]);
```

### Computed State

```typescript
// Use for derived state
const totalCount = computed(() => items.value.length);
const isEmpty = computed(() => totalCount.value === 0);
```

### Global State (When Needed)

For state shared across components, use a composable:

```typescript
// src/composables/useSharedState.ts
import { ref, watchEffect } from "vue";

const globalState = ref({
  key: "value",
});

export function useSharedState() {
  return {
    state: globalState,
    update: (key: string, value: any) => {
      globalState.value = { ...globalState.value, [key]: value };
    },
  };
}
```

---

## 5. Error Handling

### Standard Pattern

```typescript
import { handleAsync } from "@shared/utils/errorHandling";

const result = await handleAsync(
  async () => {
    // Operation that might fail
    return await someOperation();
  },
  {
    context: "Descriptive operation name",
    onError: (error) => {
      status.value = { msg: error.message, type: "error" };
    },
  },
);

if (result.success) {
  // Handle success
  const data = result.data;
}
```

### User-Facing Error Messages

```typescript
import { formatErrorMessage } from "@shared/utils/errorHandling";

try {
  await operation();
} catch (error) {
  const message = formatErrorMessage(error, "Operation failed");
  showErrorToast(message);
}
```

### Error Logging

```typescript
const logError = (context: string, error: unknown) => {
  console.error(`[${context}]`, error);
  // Could send to error tracking service
};
```

---

## 6. Testing Standards

### Test File Location

Place tests next to the file being tested:

```
src/pages/index/
├── index.vue
├── index.test.ts
├── components/
│   ├── MyComponent.vue
│   └── MyComponent.test.ts
└── composables/
    ├── usePageState.ts
    └── usePageState.test.ts
```

### Test Structure Template

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

// Mock external dependencies
vi.mock("@neo/uniapp-sdk", () => ({
  useWallet: vi.fn(() => ({
    address: ref("Nxxx..."),
    connect: vi.fn(),
    invokeContract: vi.fn(),
  })),
}));

describe("ComponentName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when prop is set", () => {
    it("should render correctly", () => {
      // Test implementation
    });

    it("should emit event on action", async () => {
      // Test implementation
    });
  });
});
```

### Coverage Requirements

- **New apps**: Minimum 70% coverage
- **Shared components**: Minimum 90% coverage
- **Composables**: Minimum 80% coverage

---

## 7. Styling Guidelines

### Theme Variable Usage

```scss
// ✅ Good - use semantic variables
.my-component {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

// ❌ Bad - hardcoded values
.my-component {
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Class Naming Convention

Use BEM-like naming with component prefix:

```scss
.my-component {
}
.my-component__header {
}
.my-component__body {
}
.my-component--disabled {
}
```

### Responsive Design

```scss
// Use standard breakpoints
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;

@media (min-width: $breakpoint-md) {
  // Desktop styles
}
```

---

## 8. Type Safety

### Type Imports

```typescript
// ✅ Good - use type-only imports
import type { NavTab } from "@shared/components";
import type { WalletSDK } from "@neo/types";

// ❌ Bad - value imports for types
import { NavTab } from "@shared/components";
```

### Interface vs Type

```typescript
// Use interface for object shapes that might be extended
interface User {
  name: string;
  email: string;
}

// Use type for unions, primitives, mapped types
type Status = "pending" | "active" | "inactive";
type Nullable<T> = T | null;
```

### Strict Mode Compliance

```typescript
// ✅ Good - explicit types
const count: number = ref(0);
const items: Item[] = ref([]);

// ❌ Bad - relies on inference
const count = ref(0);
const items = ref([]);
```

---

## 9. Development Workflow

### Creating a New Miniapp

1. **Use the template**:

   ```bash
   cp -r templates/miniapp-starter apps/new-app
   cd apps/new-app
   pnpm install
   ```

2. **Update configuration**:
   - Edit `package.json` with app name and description
   - Update `vite.config.ts` if needed
   - Create `README.md` with app documentation

3. **Implement features**:
   - Create page components following standards
   - Extract composables for reusable logic
   - Add tests as you develop

4. **Test and verify**:
   ```bash
   pnpm test
   pnpm typecheck
   pnpm lint
   ```

### Code Review Checklist

Before submitting PR, verify:

- [ ] All tests pass
- [ ] Type check passes
- [ ] Linter passes
- [ ] No `as any` without justification
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Components are <300 lines
- [ ] Tests for new features
- [ ] Documentation updated
- [ ] No hardcoded values (use constants)

---

## 10. Code Review Checklist

### Functionality

- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] Error states handled
- [ ] Loading states shown
- [ ] User feedback provided

### Code Quality

- [ ] Follows standards in this document
- [ ] No code duplication
- [ ] Proper abstraction
- [ ] Clear naming
- [ ] Appropriate comments

### Testing

- [ ] Unit tests added
- [ ] Edge cases tested
- [ ] Tests are maintainable
- [ ] Coverage requirement met

### Performance

- [ ] No unnecessary re-renders
- [ ] Computed used appropriately
- [ ] Large lists virtualized
- [ ] Images optimized

### Accessibility

- [ ] Semantic HTML
- [ ] ARIA labels where needed
- [ ] Keyboard navigation
- [ ] Screen reader friendly

---

## Migration Guide for Existing Apps

### Step 1: Add Composables

Create `src/pages/index/composables/` and extract:

- Contract interaction logic → `useContractInteraction.ts`
- Page state logic → `usePageState.ts`
- Form logic → `useFormState.ts`

### Step 2: Add Tests

Create test files for:

- Main page logic
- Composables
- Components (if extracted)

### Step 3: Update Imports

Replace direct SDK usage with composables.

### Step 4: Update Styles

Replace hardcoded values with theme variables.

### Step 5: Verify

Run tests and typecheck to ensure no regressions.

---

## Resources

- [Shared Components Documentation](../shared/components/README.md)
- [Testing Guide](../shared/test/README.md)
- [Type Definitions](../packages/@neo/types/README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
