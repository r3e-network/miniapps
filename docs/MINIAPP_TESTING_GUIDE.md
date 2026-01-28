# MiniApp Testing Guide

Complete guide for testing Neo MiniApps with Vitest.

## Overview

This guide provides:

- Test infrastructure setup
- Testing patterns and examples
- Mock SDK utilities
- Best practices for miniapp testing

## Quick Start

### 1. Install Test Dependencies

```bash
# Add to your miniapp's package.json
pnpm add -D vitest @vitest/ui jsdom @testing-library/vue @vue/test-utils happy-dom
```

### 2. Copy Test Configuration

Copy `vitest.config.ts` from the lottery app template.

### 3. Create Test Directory Structure

```
apps/{miniapp-name}/
├── __tests__/
│   ├── composables/
│   │   └── *.test.ts
│   ├── components/
│   │   └── *.test.tsx
│   └── integration/
│       └── *.test.ts
├── vitest.config.ts
└── package.json
```

### 4. Add Test Scripts

```json
{
    "scripts": {
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage"
    }
}
```

## Test Utilities

### Mock SDK Functions

Available from `@shared/test-utils/mock-sdk`:

| Function               | Description                   |
| ---------------------- | ----------------------------- |
| `createMockWallet()`   | Mock wallet composable        |
| `createMockPayments()` | Mock payments composable      |
| `createMockRNG()`      | Mock randomness composable    |
| `createMockDatafeed()` | Mock price data composable    |
| `createMockEvents()`   | Mock events composable        |
| `resetMocks()`         | Reset all mocks between tests |
| `flushPromises()`      | Wait for async operations     |

## Testing Patterns

### 1. Testing Composables

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createMockWallet, resetMocks } from "@shared/test-utils/mock-sdk";
import type { WalletSDK } from "@neo/types";

describe("MyComposable", () => {
    beforeEach(() => {
        resetMocks();
    });

    it("should call contract correctly", async () => {
        const mockWallet = createMockWallet() as WalletSDK;
        const result = await mockWallet.invokeContract!({
            scriptHash: "0xcontract",
            operation: "MyMethod",
            args: [],
        });

        expect(result).toHaveProperty("txid");
        expect(mockWallet.invokeContract).toHaveBeenCalled();
    });
});
```

### 2. Testing Components

```typescript
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import MyComponent from "./MyComponent.vue";

describe("MyComponent", () => {
    it("should render correctly", () => {
        const wrapper = mount(MyComponent, {
            props: {
                title: "Test",
            },
        });

        expect(wrapper.text()).toContain("Test");
    });
});
```

### 3. Integration Testing

```typescript
describe("User Workflow", () => {
    it("should complete full flow", async () => {
        // 1. Connect wallet
        // 2. Execute contract call
        // 3. Verify result
        // 4. Check UI updates
    });
});
```

## Example Test Cases

### Contract Integration Tests

```typescript
describe("Contract Integration", () => {
    it("should buy ticket with correct parameters", async () => {
        const mockWallet = createMockWallet() as WalletSDK;
        mockWallet.address.value = "NTestUser";

        await buyTicket(1);

        expect(mockWallet.invokeContract).toHaveBeenCalledWith({
            scriptHash: expect.any(String),
            operation: "BuyScratchTicket",
            args: expect.arrayContaining([
                expect.objectContaining({
                    type: "Hash160",
                    value: "NTestUser",
                }),
                expect.objectContaining({ type: "Integer", value: 1 }),
            ]),
        });
    });
});
```

### Error Handling Tests

```typescript
describe("Error Handling", () => {
    it("should handle wallet not connected", async () => {
        const mockWallet = createMockWallet() as WalletSDK;
        mockWallet.address.value = "";

        await expect(async () => {
            await buyTicket(1);
        }).rejects.toThrow("Wallet not connected");
    });

    it("should handle contract failures", async () => {
        const mockWallet = createMockWallet() as WalletSDK;
        mockWallet.invokeContract = vi.fn(() =>
            Promise.reject(new Error("RPC failed")),
        );

        await expect(buyTicket(1)).rejects.toThrow("RPC failed");
    });
});
```

### State Management Tests

```typescript
describe("State Management", () => {
    it("should update loading state during async operation", async () => {
        const isLoading = ref(false);
        const mockWallet = createMockWallet() as WalletSDK;

        const operation = async () => {
            isLoading.value = true;
            await mockWallet.invokeContract!({
                /* ... */
            });
            isLoading.value = false;
        };

        await operation();

        expect(isLoading.value).toBe(false);
    });
});
```

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Tests in UI Mode

```bash
pnpm test:ui
```

### Run Tests Once

```bash
pnpm test:run
```

### Generate Coverage Report

```bash
pnpm test:coverage
```

## Test Coverage Goals

| Metric     | Target |
| ---------- | ------ |
| Statements | 80%    |
| Branches   | 75%    |
| Functions  | 80%    |
| Lines      | 80%    |

## Best Practices

### 1. Test Structure

- **Arrange**: Set up test data and mocks
- **Act**: Execute the code being tested
- **Assert**: Verify expected outcomes

### 2. Mock Isolation

- Reset mocks before each test
- Use descriptive mock data
- Avoid over-mocking

### 3. Test Naming

- Use descriptive test names
- Follow `should...` pattern
- Include edge cases

### 4. Async Testing

- Use `flushPromises()` for async operations
- Test both success and failure cases
- Handle timeouts appropriately

## Common Pitfalls

### 1. Not Resetting Mocks

```typescript
beforeEach(() => {
    resetMocks(); // Always reset!
});
```

### 2. Testing Implementation Details

```typescript
// Bad
it("should set loading to true", () => {
    expect(loading.value).toBe(true);
});

// Good
it("should show loading indicator to user", () => {
    expect(wrapper.find(".loading").exists()).toBe(true);
});
```

### 3. Ignoring Errors

```typescript
// Bad
try {
    await risky();
} catch {}

// Good
await expect(risky()).resolves.not.toThrow();
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: pnpm/action-setup@v2
            - uses: actions/setup-node@v3
            - run: pnpm install
            - run: pnpm test:coverage
            - uses: codecov/codecov-action@v3
```

## Advanced Topics

### Vue Component Testing

```typescript
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";

describe("MyComponent", () => {
    it("emits event on click", async () => {
        const wrapper = mount(MyComponent, {
            global: {
                plugins: [createPinia()],
            },
        });

        await wrapper.find("button").trigger("click");

        expect(wrapper.emitted("my-event")).toBeTruthy();
    });
});
```

### Contract State Testing

```typescript
describe("Contract State", () => {
    it("should maintain state consistency", async () => {
        const state = createMockContractState({
            balance: 100,
            lastUpdate: Date.now(),
        });

        // Perform state-changing operation
        await updateContract(state, 50);

        expect(state.value.balance).toBe(50);
    });
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Library](https://testing-library.com/)

## Support

For issues or questions about testing miniapps:

1. Check existing tests in `apps/lottery/__tests__/`
2. Review this guide
3. Consult the main validation report
