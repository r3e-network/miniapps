<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-neo-swap" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <!-- Chain Warning -->
    <!-- Chain Warning - Framework Component -->
    <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')"
  /></ResponsiveLayout>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { useI18n } from "@/composables/useI18n";
import { ResponsiveLayout, NeoDoc, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import SwapTab from "./components/SwapTab.vue";
import PoolTab from "./components/PoolTab.vue";

const { t } = useI18n();
const { chainType } = useWallet() as WalletSDK;

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
