<template>
  <AppLayout class="theme-neo-swap" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <!-- Chain Warning -->
    <view v-if="chainType === 'evm'" class="chain-warning">
      <view class="warning-content">
        <text class="warning-icon">⚠️</text>
        <view class="warning-text">
          <text class="warning-title">{{ t("wrongChain") }}</text>
          <text class="warning-desc">{{ t("wrongChainMessage") }}</text>
        </view>
        <view class="switch-btn" @click="() => switchToAppChain()">
          {{ t("switchToNeo") }}
        </view>
      </view>
    </view>

    <SwapTab v-if="activeTab === 'swap'" :t="t as any" />
    <PoolTab v-if="activeTab === 'pool'" :t="t as any" />

    <!-- Docs Tab -->
    <view v-if="activeTab === 'docs'" class="docs-container">
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
import { ref, computed } from "vue";
import { useWallet} from "@neo/uniapp-sdk";
import { useI18n } from "@/composables/useI18n";
import { AppLayout, NeoDoc } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import SwapTab from "./components/SwapTab.vue";
import PoolTab from "./components/PoolTab.vue";

const { t } = useI18n();
const { chainType, switchToAppChain } = useWallet() as any;

const navTabs = computed<NavTab[]>(() => [
  { id: "swap", icon: "swap", label: t("tabSwap") },
  { id: "pool", icon: "droplet", label: t("tabPool") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const activeTab = ref("swap");

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
  { name: t("feature3Name"), desc: t("feature3Desc") },
]);
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./neo-swap-theme.scss";

:global(page) {
  background: var(--bg-primary);
}

.chain-warning {
  margin: 16px;
  background: var(--swap-warning-bg);
  border: 1px solid var(--swap-warning-border);
  border-radius: 16px;
  padding: 16px;
}

.warning-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.warning-icon {
  font-size: 24px;
}

.warning-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--swap-warning-text);
}

.warning-desc {
  font-size: 12px;
  color: var(--swap-warning-desc);
}

.switch-btn {
  background: var(--swap-warning-btn-bg);
  border: 1px solid var(--swap-warning-btn-border);
  color: var(--swap-warning-text);
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--swap-warning-btn-hover-bg);
  }
}

.docs-container {
  padding: 16px;
  min-height: 100vh;
  background: var(--swap-bg-gradient);
}
</style>
