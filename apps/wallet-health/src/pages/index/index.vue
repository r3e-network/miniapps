<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-wallet-health" :tabs="navTabs" :active-tab="activeTab" @tab-change="onTabChange"

      <!-- Desktop Sidebar -->
      <template #desktop-sidebar>
        <view class="desktop-sidebar">
          <text class="sidebar-title">{{ t('overview') }}</text>
        </view>
      </template>
>
    <view v-if="activeTab === 'health'" class="tab-content">
      <view v-if="isEvm" class="mb-4">
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

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-4 text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <view v-if="!address" class="empty-state">
        <NeoCard variant="erobo" class="p-6 text-center">
          <text class="text-sm block mb-3">{{ t("walletNotConnected") }}</text>
          <NeoButton size="sm" variant="primary" @click="connectWallet">
            {{ t("connectWallet") }}
          </NeoButton>
        </NeoCard>
      </view>

      <view v-else class="health-stack">
        <NeoCard variant="erobo-neo">
          <NeoStats :stats="healthStats" />
        </NeoCard>

        <NeoCard variant="erobo" class="balance-card">
          <view class="section-header">
            <text class="section-title">{{ t("sectionBalances") }}</text>
            <NeoButton size="sm" variant="secondary" :loading="isRefreshing" @click="refreshBalances">
              {{ t("refresh") }}
            </NeoButton>
          </view>

          <view class="balance-grid">
            <view class="balance-item">
              <text class="balance-label">NEO</text>
              <text class="balance-value">{{ neoDisplay }}</text>
            </view>
            <view class="balance-item">
              <text class="balance-label">GAS</text>
              <text class="balance-value">{{ gasDisplay }}</text>
            </view>
          </view>

          <view class="risk-pill" :class="riskClass">
            <AppIcon :name="riskIcon" :size="14" />
            <text>{{ riskLabel }}</text>
          </view>
        </NeoCard>

        <NeoCard variant="erobo" class="recommendation-card">
          <text class="section-title">{{ t("sectionRecommendations") }}</text>
          <view v-if="recommendations.length === 0" class="recommendation-empty">
            <text class="text-xs">{{ t("allSet") }}</text>
          </view>
          <view v-else class="recommendation-list">
            <view v-for="rec in recommendations" :key="rec" class="recommendation-item">
              <view class="recommendation-dot" />
              <text class="recommendation-text">{{ rec }}</text>
            </view>
          </view>
        </NeoCard>
      </view>
    </view>

    <view v-if="activeTab === 'checklist'" class="tab-content">
      <NeoCard variant="erobo-neo" class="score-card">
        <view class="score-header">
          <text class="section-title">{{ t("sectionChecklist") }}</text>
          <text class="score-value">{{ safetyScore }}%</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: `${safetyScore}%` }" />
        </view>
      </NeoCard>

      <NeoCard variant="erobo" class="checklist-card">
        <view v-for="item in checklistItems" :key="item.id" class="checklist-item">
          <view class="checklist-content">
            <text class="checklist-title">{{ item.title }}</text>
            <text class="checklist-desc">{{ item.desc }}</text>
          </view>
          <NeoButton
            size="sm"
            :variant="item.done ? 'primary' : 'secondary'"
            :disabled="item.auto"
            @click="toggleChecklist(item.id)"
          >
            <AppIcon :name="item.done ? 'check' : 'x'" :size="14" />
            <text class="checklist-action">
              {{ item.auto ? t("autoChecked") : item.done ? t("markUndo") : t("markDone") }}
            </text>
          </NeoButton>
        </view>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'docs'" class="tab-content scrollable">
      <NeoDoc
        :title="t('title')"
        :subtitle="t('docsSubtitle')"
        :description="t('docsDescription')"
        :steps="[t('step1'), t('step2'), t('step3'), t('step4')]"
        :features="[
          { name: t('feature1Name'), desc: t('feature1Desc') },
          { name: t('feature2Name'), desc: t('feature2Desc') },
          { name: t('feature3Name'), desc: t('feature3Desc') },
        ]"
      />
    </view>
  </ResponsiveLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";

// Responsive state
const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value < 768);
const isDesktop = computed(() => windowWidth.value >= 1024);
const handleResize = () => { windowWidth.value = window.innerWidth; };

onMounted(() => window.addEventListener('resize', handleResize));
onUnmounted(() => window.removeEventListener('resize', handleResize));
import { useWallet } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { useI18n } from "@/composables/useI18n";
import { ResponsiveLayout, NeoCard, NeoButton, NeoStats, NeoDoc, AppIcon } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import { requireNeoChain, isEvmChain } from "@shared/utils/chain";
import { formatFixed8 } from "@shared/utils/format";
import { parseInvokeResult } from "@shared/utils/neo";

const { t } = useI18n();
const { address, connect, invokeRead, chainType, switchToAppChain } = useWallet() as WalletSDK;

const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const GAS_LOW_THRESHOLD = 10000000n;

const activeTab = ref("health");
const navTabs = computed<NavTab[]>(() => [
  { id: "health", icon: "shield", label: t("tabHealth") },
  { id: "checklist", icon: "check", label: t("tabChecklist") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const isEvm = computed(() => isEvmChain(chainType));
const chainLabel = computed(() => {
  const value = (chainType as any)?.value ?? chainType ?? "";
  if (!value) return t("statusUnknown");
  return isEvm.value ? t("statusEvm") : t("statusNeo");
});
const chainVariant = computed(() => {
  const value = (chainType as any)?.value ?? chainType ?? "";
  if (!value) return "warning";
  return isEvm.value ? "warning" : "accent";
});

const status = ref<{ msg: string; type: "success" | "error" } | null>(null);
const isRefreshing = ref(false);

const balances = reactive({
  neo: 0n,
  gas: 0n,
});

const gasOk = computed(() => balances.gas >= GAS_LOW_THRESHOLD);

const checklistState = reactive<Record<string, boolean>>({});
const checklistStorageKey = "wallet-health-checklist";

const checklistBase = [
  { id: "backup", titleKey: "checklistBackup", descKey: "checklistBackupDesc" },
  { id: "gas", titleKey: "checklistGas", descKey: "checklistGasDesc" },
  { id: "permissions", titleKey: "checklistPermissions", descKey: "checklistPermissionsDesc" },
  { id: "device", titleKey: "checklistDevice", descKey: "checklistDeviceDesc" },
  { id: "hardware", titleKey: "checklistHardware", descKey: "checklistHardwareDesc" },
  { id: "twofa", titleKey: "checklist2fa", descKey: "checklist2faDesc" },
];

const checklistItems = computed(() =>
  checklistBase.map((item) => ({
    id: item.id,
    title: t(item.titleKey as any),
    desc: t(item.descKey as any),
    done: item.id === "gas" ? gasOk.value : checklistState[item.id] === true,
    auto: item.id === "gas",
  })),
);

const completedChecklistCount = computed(() => checklistItems.value.filter((item) => item.done).length);
const totalChecklistCount = computed(() => checklistItems.value.length);

const safetyScore = computed(() => {
  const score = (completedChecklistCount.value / totalChecklistCount.value) * 100;
  return Math.round(score);
});

const riskLabel = computed(() => {
  if (safetyScore.value >= 80) return t("riskLow");
  if (safetyScore.value >= 50) return t("riskMedium");
  return t("riskHigh");
});

const riskClass = computed(() => {
  if (safetyScore.value >= 80) return "risk-low";
  if (safetyScore.value >= 50) return "risk-medium";
  return "risk-high";
});

const riskIcon = computed(() => {
  if (safetyScore.value >= 80) return "check-circle";
  if (safetyScore.value >= 50) return "alert-circle";
  return "alert-circle";
});

const recommendations = computed(() => {
  const items: string[] = [];
  if (!checklistState.backup) items.push(t("recommendationBackup"));
  if (!gasOk.value) items.push(t("recommendationGasLow"));
  if (!checklistState.permissions) items.push(t("recommendationPermissions"));
  return items;
});

const neoDisplay = computed(() => balances.neo.toString());
const gasDisplay = computed(() => formatFixed8(balances.gas, 4));

const healthStats = computed(() => [
  {
    label: t("statConnection"),
    value: address.value ? t("statusConnected") : t("statusDisconnected"),
    variant: address.value ? "success" : "danger",
  },
  {
    label: t("statNetwork"),
    value: chainLabel.value,
    variant: chainVariant.value,
  },
  {
    label: t("statNeo"),
    value: neoDisplay.value,
    variant: "erobo-neo",
  },
  {
    label: t("statGas"),
    value: gasDisplay.value,
    variant: gasOk.value ? "success" : "warning",
  },
  {
    label: t("statScore"),
    value: `${safetyScore.value}%`,
    variant: safetyScore.value >= 80 ? "success" : safetyScore.value >= 50 ? "warning" : "danger",
  },
]);

const parseBigInt = (value: unknown) => {
  try {
    return BigInt(String(value ?? "0"));
  } catch {
    return 0n;
  }
};

const setStatus = (msg: string, type: "success" | "error") => {
  status.value = { msg, type };
  setTimeout(() => {
    if (status.value?.msg === msg) status.value = null;
  }, 4000);
};

const refreshBalances = async () => {
  if (!address.value) return;
  if (isRefreshing.value) return;
  if (!requireNeoChain(chainType, t, undefined, { silent: true })) return;

  try {
    isRefreshing.value = true;
    const neoResult = await invokeRead({
      contractAddress: NEO_HASH,
      operation: "balanceOf",
      args: [{ type: "Hash160", value: address.value }],
    });
    const gasResult = await invokeRead({
      contractAddress: GAS_HASH,
      operation: "balanceOf",
      args: [{ type: "Hash160", value: address.value }],
    });

    balances.neo = parseBigInt(parseInvokeResult(neoResult));
    balances.gas = parseBigInt(parseInvokeResult(gasResult));
  } catch (e: any) {
    setStatus(e.message || t("walletNotConnected"), "error");
  } finally {
    isRefreshing.value = false;
  }
};

const connectWallet = async () => {
  try {
    await connect();
    if (address.value) {
      await refreshBalances();
    }
  } catch (e: any) {
    setStatus(e.message || t("walletNotConnected"), "error");
  }
};

const loadChecklist = () => {
  try {
    const stored = uni.getStorageSync(checklistStorageKey);
    if (stored) {
      const parsed = JSON.parse(String(stored));
      if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach((key) => {
          checklistState[key] = Boolean(parsed[key]);
        });
      }
    }
  } catch {
    // ignore
  }
};

const saveChecklist = () => {
  try {
    uni.setStorageSync(checklistStorageKey, JSON.stringify(checklistState));
  } catch {
    // ignore
  }
};

const toggleChecklist = (id: string) => {
  if (id === "gas") return;
  checklistState[id] = !checklistState[id];
  saveChecklist();
};

const onTabChange = async (tabId: string) => {
  activeTab.value = tabId;
  if (tabId === "health") {
    await refreshBalances();
  }
};

onMounted(async () => {
  loadChecklist();
  if (address.value) {
    await refreshBalances();
  }
});

watch(address, async (next) => {
  if (next) {
    await refreshBalances();
  } else {
    balances.neo = 0n;
    balances.gas = 0n;
  }
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./wallet-health-theme.scss";

:global(page) {
  background: linear-gradient(135deg, var(--health-bg-start) 0%, var(--health-bg-end) 100%);
  color: var(--health-text);
}

.tab-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.health-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.balance-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.balance-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.balance-item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
}

.balance-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--health-muted);
}

.balance-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--health-accent-strong);
}

.risk-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.risk-pill.risk-low {
  background: rgba(34, 197, 94, 0.2);
  color: var(--health-success);
}

.risk-pill.risk-medium {
  background: rgba(251, 191, 36, 0.2);
  color: var(--health-warning);
}

.risk-pill.risk-high {
  background: rgba(248, 113, 113, 0.2);
  color: var(--health-danger);
}

.recommendation-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommendation-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.recommendation-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--health-accent-strong);
  margin-top: 6px;
}

.recommendation-text {
  font-size: 12px;
  color: var(--health-muted);
  line-height: 1.5;
}

.score-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--health-accent-strong);
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--health-accent), var(--health-accent-strong));
}

.checklist-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.checklist-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.checklist-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.checklist-title {
  font-size: 14px;
  font-weight: 700;
}

.checklist-desc {
  font-size: 11px;
  color: var(--health-muted);
  line-height: 1.4;
}

.checklist-action {
  margin-left: 6px;
  font-size: 11px;
}

/* Mobile-specific styles */
@media (max-width: 767px) {
  .tab-content {
    padding: 12px;
    gap: 12px;
  }
  .section-title {
    font-size: 16px;
  }
  .balance-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .checklist-item {
    flex-direction: column;
    gap: 12px;
  }
  .balance-value {
    font-size: 16px;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .tab-content {
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
  }
  .health-stack {
    gap: 20px;
  }
}


// Desktop sidebar
.desktop-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3, 12px);
}

.sidebar-title {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  color: var(--text-secondary, rgba(248, 250, 252, 0.7));
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
