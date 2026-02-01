# Miniapp Migration Guide

This guide helps you migrate existing miniapps to use the new framework components and eliminate code duplication.

## Migration Overview

Migrating an existing miniapp involves:

1. Replacing chain validation code with `ChainWarning` component
2. Using `useChainValidation` composable where needed
3. Standardizing imports from `@shared/components`
4. Optionally adopting `MiniAppLayout` for new structure

---

## Quick Migration Checklist

- [ ] Remove inline chain validation template code
- [ ] Add `ChainWarning` component import
- [ ] Replace chain validation logic with `useChainValidation`
- [ ] Update imports to use `@shared/components`
- [ ] Test chain switching functionality
- [ ] Verify all tabs work correctly

---

## Step-by-Step Migration

### Step 1: Before Migration

**Current code in `apps/myapp/src/pages/index/index.vue`:**

```vue
<template>
    <AppLayout
        class="theme-myapp"
        :tabs="navTabs"
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
    >
        <!-- ❌ DUPLICATED CHAIN VALIDATION CODE -->
        <view v-if="showWarning" class="px-4 mb-4">
            <NeoCard variant="danger">
                <view class="flex flex-col items-center gap-2 py-1">
                    <text class="text-center font-bold text-red-400">{{
                        t("wrongChain")
                    }}</text>
                    <text class="text-xs text-center opacity-80 text-white">{{
                        t("wrongChainMessage")
                    }}</text>
                    <NeoButton
                        size="sm"
                        variant="secondary"
                        class="mt-2"
                        @click="() => switchToAppChain()"
                    >
                        {{ t("switchToNeo") }}
                    </NeoButton>
                </view>
            </NeoCard>
        </view>

        <!-- Rest of content -->
        <view v-if="activeTab === 'main'" class="tab-content">
            <!-- ... -->
        </view>
    </AppLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useWallet, useEvents } from "@neo/uniapp-sdk";
import { formatNumber } from "@shared/utils/format";
import { useI18n } from "@/composables/useI18n";
import { AppLayout, NeoDoc, NeoCard, NeoButton } from "@shared/components";

const { t } = useI18n();
const {
    address,
    connect,
    invokeContract,
    invokeRead,
    getContractAddress,
    switchToAppChain,
} = useWallet() as any;

const showWarning = computed(() => false);

// ... rest of code
</script>
```

### Step 2: After Migration

**Migrated code:**

```vue
<template>
    <AppLayout
        class="theme-myapp"
        :tabs="navTabs"
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
    >
        <!-- ✅ REPLACED WITH SINGLE COMPONENT -->
        <ChainWarning
            :title="t('wrongChain')"
            :message="t('wrongChainMessage')"
            :button-text="t('switchToNeo')"
        />

        <!-- Rest of content -->
        <view v-if="activeTab === 'main'" class="tab-content">
            <!-- ... -->
        </view>
    </AppLayout>
</template>

<script setup lang="ts">
import { useWallet, useEvents } from "@neo/uniapp-sdk";
import { formatNumber } from "@shared/utils/format";
import { useI18n } from "@/composables/useI18n";
// ✅ SINGLE IMPORT FOR ALL COMPONENTS
import {
    AppLayout,
    NeoDoc,
    NeoCard,
    NeoButton,
    ChainWarning,
} from "@shared/components";

const { t } = useI18n();
// ✅ NO NEED FOR chainType checks in template
const { address, connect, invokeContract, invokeRead, getContractAddress } =
    useWallet() as any;

// ... rest of code
</script>
```

### What Changed?

1. **Removed**: 13 lines of duplicated template code
2. **Removed**: `chainType` from destructured `useWallet`
3. **Added**: Single `ChainWarning` component
4. **Updated**: Imports to include `ChainWarning` from `@shared/components`

---

## Alternative: Using useChainValidation Composable

If you need programmatic control over chain validation:

```vue
<template>
    <AppLayout
        class="theme-myapp"
        :tabs="navTabs"
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
    >
        <!-- Custom warning display -->
        <view v-if="showWarning" class="px-4 mb-4">
            <NeoCard variant="danger">
                <view class="flex flex-col items-center gap-2 py-1">
                    <text class="text-center font-bold text-red-400">{{
                        t("wrongChain")
                    }}</text>
                    <NeoButton
                        size="sm"
                        variant="secondary"
                        class="mt-2"
                        @click="handleSwitch"
                    >
                        {{ t("switchToNeo") }}
                    </NeoButton>
                </view>
            </NeoCard>
        </view>

        <!-- Only execute when on correct chain -->
        <view v-if="!showWarning">
            <MyNeoComponent />
        </view>
    </AppLayout>
</template>

<script setup lang="ts">
import { useWallet } from "@neo/uniapp-sdk";
import { useI18n } from "@/composables/useI18n";
import { useChainValidation } from "@shared/composables/useChainValidation";
import { AppLayout, NeoCard, NeoButton } from "@shared/components";

const { t } = useI18n();
const { showWarning, switchToAppChain } = useChainValidation();

const handleSwitch = async () => {
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

## Advanced Migration: Adopting MiniAppLayout

For a more complete refactoring, adopt the `MiniAppLayout` component:

### Before

```vue
<template>
    <AppLayout
        class="theme-myapp"
        :tabs="navTabs"
        :active-tab="activeTab"
        @tab-change="activeTab = $event"
    >
        <view v-if="showWarning" class="px-4 mb-4">
            <NeoCard variant="danger">
                <!-- chain warning code -->
            </NeoCard>
        </view>

        <view v-if="activeTab === 'main'" class="tab-content">
            <MainContent />
        </view>

        <view v-if="activeTab === 'stats'" class="tab-content scrollable">
            <StatsContent />
        </view>

        <view v-if="activeTab === 'docs'" class="tab-content scrollable">
            <NeoDoc
                :title="t('title')"
                :subtitle="t('docSubtitle')"
                :description="t('docDescription')"
            />
        </view>
    </AppLayout>
</template>
```

### After

```vue
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
                <MainContent />
            </view>

            <view v-if="activeTab === 'stats'" class="tab-content scrollable">
                <StatsContent />
            </view>

            <view v-if="activeTab === 'docs'" class="tab-content scrollable">
                <NeoDoc
                    :title="t('title')"
                    :subtitle="t('docSubtitle')"
                    :description="t('docDescription')"
                />
            </view>
        </template>
    </MiniAppLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "@/composables/useI18n";
import { MiniAppLayout, NeoDoc } from "@shared/components";

const { t } = useI18n();

const navTabs = computed(() => [
    { id: "main", icon: "game", label: t("main") },
    { id: "stats", icon: "chart", label: t("stats") },
    { id: "docs", icon: "book", label: t("docs") },
]);
</script>
```

---

## Migration Impact Summary

### Code Reduction

| Metric                         | Before   | After  | Reduction  |
| ------------------------------ | -------- | ------ | ---------- |
| Template lines (chain warning) | 13       | 1      | 92%        |
| Script imports                 | Multiple | Single | Simplified |
| Duplicated logic               | Per app  | Shared | 100%       |

### Benefits

1. **Maintainability**: Chain validation logic centralized
2. **Consistency**: All miniapps show same warning UI
3. **Type Safety**: Better TypeScript support
4. **Testing**: Single component to test
5. **Updates**: Change once, affect all apps

---

## Common Migration Issues

### Issue 1: Import Path Errors

**Problem**: Cannot find module '@shared/components/ChainWarning.vue'

**Solution**: Ensure `shared/components/index.ts` exports the component:

```typescript
export { default as ChainWarning } from "./ChainWarning.vue";
```

### Issue 2: Type Errors with useWallet

**Problem**: `chainType` no longer available

**Solution**: Use `useChainValidation` composable instead:

```typescript
// Before
const { switchToAppChain } = useWallet() as any;

// After
import { useChainValidation } from "@shared/composables/useChainValidation";
const { showWarning, switchToAppChain } = useChainValidation();
```

### Issue 3: Custom Chain Logic

**Problem**: App has custom chain validation logic

**Solution**: Combine `useChainValidation` with custom logic:

```typescript
const { showWarning: baseWarning } = useChainValidation();

const showWarning = computed(() => {
    // Add custom logic
    return baseWarning.value || customCondition.value;
});
```

---

## Testing After Migration

### Checklist

1. **Chain Switching Test**
    - [ ] Switch between Neo N3 testnet and mainnet (if applicable)
    - [ ] Verify warning disappears after switch
    - [ ] Verify button shows loading state

2. **Tab Navigation Test**
    - [ ] All tabs navigate correctly
    - [ ] Active tab state persists
    - [ ] Content displays correctly

3. **i18n Test**
    - [ ] All translated strings display
    - [ ] Language switching works

4. **Responsive Test**
    - [ ] Layout works on mobile
    - [ ] Scrollable areas function

---

## Rollback Plan

If issues arise, you can quickly rollback:

```vue
<!-- Keep old code commented for quick rollback -->
<!--
<view v-if="showWarning" class="px-4 mb-4">
  <NeoCard variant="danger">
    <view class="flex flex-col items-center gap-2 py-1">
      <text class="text-center font-bold text-red-400">{{ t("wrongChain") }}</text>
      <text class="text-xs text-center opacity-80 text-white">{{ t("wrongChainMessage") }}</text>
      <NeoButton size="sm" variant="secondary" class="mt-2" @click="() => switchToAppChain()">
        {{ t("switchToNeo") }}
      </NeoButton>
    </view>
  </NeoCard>
</view>
-->
```

---

## Batch Migration Script

For migrating multiple miniapps at once:

```bash
#!/bin/bash
# migrate-miniapps.sh

APPS=("lottery" "coin-flip" "self-loan" "stream-vault")

for app in "${APPS[@]}"; do
  echo "Migrating $app..."

  # Backup original file
  cp "apps/$app/src/pages/index/index.vue" "apps/$app/src/pages/index/index.vue.bak"

  # Apply migration (manual or use sed/awk for simple patterns)
  echo "  - Backed up original file"
  echo "  - Manual migration required"
done

echo "Migration complete. Review changes and test each app."
```

---

## Need Help?

- **Documentation**: See `MINIAPP_GUIDE.md` for detailed framework usage
- **Examples**: Reference `apps/lottery` for a migrated example
- **Issues**: Report problems in the project issue tracker
