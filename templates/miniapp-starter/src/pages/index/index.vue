<template>
  <AppLayout class="theme-template" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <!-- Main Tab -->
    <view v-if="activeTab === 'main'" class="tab-content">
      <!-- Status Message -->
      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-4 text-center">
        <text class="status-text">{{ status.msg }}</text>
      </NeoCard>

      <!-- Main Content -->
      <view class="app-container">
        <NeoCard variant="default">
          <view class="content">
            <text class="title">{{ t("title") }}</text>
            <text class="description">{{ t("description") }}</text>

            <!-- Action Button -->
            <NeoButton
              variant="primary"
              size="lg"
              block
              :loading="isLoading"
              :disabled="isLoading"
              @click="handleAction"
            >
              {{ isLoading ? t("processing") : t("actionButton") }}
            </NeoButton>
          </view>
        </NeoCard>
      </view>
    </view>

    <!-- Docs Tab -->
    <view v-if="activeTab === 'docs'" class="tab-content scrollable">
      <NeoDoc
        :title="t('title')"
        :subtitle="t('docSubtitle')"
        :description="t('docDescription')"
        :steps="docSteps"
        :features="docFeatures"
      />
    </view>
  </AppLayout>
</template>

<script setup lang="ts">
/**
 * Template Miniapp - Main Page
 *
 * Replace this content with your miniapp's implementation.
 * Follow the standards in /STANDARDS.md for consistency.
 */

import { ref, computed, onMounted } from "vue";
import { usePayments, useWallet, useEvents } from "@neo/uniapp-sdk";
import { useI18n } from "@/composables/useI18n";
import { AppLayout, NeoCard, NeoButton, NeoDoc, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";

import { usePageState } from "./composables/usePageState";
import { useContractInteraction } from "./composables/useContractInteraction";

// ============================================================
// CONFIGURATION
// ============================================================

/** Your miniapp ID - register in NeoHub */
const APP_ID = "miniapp-template";

/** Your contract script hash (if applicable) */
const CONTRACT_HASH = "";

// ============================================================
// COMPOSABLES
// ============================================================

const { t } = useI18n();
const { address, connect, invokeContract, invokeRead } = useWallet() as any;
const { payGAS } = usePayments(APP_ID);
const { list: listEvents } = useEvents();

// Page state management
const { isLoading, error: pageError, setError, clearError } = usePageState("main");

// Contract interaction helper (if using contracts)
const contract = useContractInteraction(CONTRACT_HASH);

// ============================================================
// STATE
// ============================================================

/** Status message to display to user */
const status = ref<{ msg: string; type: "success" | "error" } | null>(null);

/** Form/input state */
const formData = ref({
  inputValue: "",
});

/** Computed state */
const isValid = computed(() => {
  return formData.value.inputValue.length > 0;
});

// ============================================================
// NAVIGATION
// ============================================================

const navTabs = computed<NavTab[]>(() => [
  { id: "main", icon: "game", label: t("tabMain") },
  { id: "docs", icon: "book", label: t("docs") },
]);

// ============================================================
// DOCUMENTATION
// ============================================================

const docSteps = computed(() => [t("step1"), t("step2"), t("step3")]);

const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
]);

// ============================================================
// ACTIONS
// ============================================================

/**
 * Main action handler - replace with your implementation
 */
const handleAction = async () => {
  if (!address.value) {
    await connect();
    return;
  }

  if (!isValid.value) {
    setError(t("invalidInput"));
    return;
  }

  clearError();

  try {
    // Example: Make a contract call
    // const result = await contract.invoke("yourOperation", [
    //   { type: "String", value: formData.value.inputValue }
    // ]);

    // Example: Pay GAS first
    // const payment = await payGAS("0.1", "memo");
    // const receiptId = payment.receipt_id;

    // Handle success
    status.value = { msg: t("success"), type: "success" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("error");
    setError(message);
    status.value = { msg: message, type: "error" };
  }
};

// ============================================================
// LIFECYCLE
// ============================================================

onMounted(() => {
  // Initialization code
  console.log("[Template] Mounted with address:", address.value);
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./template-theme.scss";

:global(page) {
  background: var(--bg-primary);
  font-family: var(--font-family-base);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.app-container {
  padding: var(--spacing-md);
}

.content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
  text-align: center;
}

.description {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.5;
}

.status-text {
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
  text-align: center;
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
