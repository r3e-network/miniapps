<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-dev-tipping" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <view
      v-if="activeTab === 'developers' || activeTab === 'send' || activeTab === 'stats'"
      class="app-container theme-dev-tipping"
    >
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'erobo-neo'" class="mb-4">
        <text class="text-center font-bold text-glass">{{ status.msg }}</text>
      </NeoCard>

      <view v-if="activeTab === 'developers'" class="tab-content">
        <NeoCard variant="erobo">
          <view v-for="dev in developers" :key="dev.id" class="dev-card-glass" @click="selectDev(dev)">
            <view class="dev-card-header">
              <view class="dev-avatar-glass">
                <text class="avatar-emoji">👨‍💻</text>
                <view class="avatar-badge-glass">{{ dev.rank }}</view>
              </view>
              <view class="dev-info">
                <text class="dev-name-glass">{{ dev.name }}</text>
                <text class="dev-projects-glass">
                  <text class="project-icon">🧩</text>
                  {{ dev.role }}
                </text>
                <text class="dev-contributions-glass">{{ dev.tipCount }} {{ t("tipsCount") }}</text>
              </view>
            </view>
            <view class="dev-card-footer-glass">
              <view class="tip-stats">
                <text class="tip-label-glass">{{ t("totalTips") }}</text>
                <text class="tip-amount-glass">{{ formatNum(dev.totalTips) }} GAS</text>
              </view>
              <view class="tip-action">
                <text class="tip-icon text-glass">💚</text>
              </view>
            </view>
          </view>
        </NeoCard>
      </view>

      <view v-if="activeTab === 'send'" class="tab-content">
        <NeoCard variant="erobo-neo">
          <view class="form-group">
            <!-- Developer Selection -->
            <view class="input-section">
              <text class="input-label-glass">{{ t("selectDeveloper") }}</text>
              <view class="dev-selector">
                <view
                  v-for="dev in developers"
                  :key="dev.id"
                  :class="['dev-select-item-glass', { active: selectedDevId === dev.id }]"
                  @click="selectedDevId = dev.id"
                >
                  <text class="dev-select-name-glass">{{ dev.name }}</text>
                  <text class="dev-select-role-glass">{{ dev.role }}</text>
                </view>
              </view>
            </view>

            <!-- Tip Amount with Presets -->
            <view class="input-section">
              <text class="input-label-glass">{{ t("tipAmount") }}</text>
              <view class="preset-amounts">
                <view
                  v-for="preset in presetAmounts"
                  :key="preset"
                  :class="['preset-btn-glass', { active: tipAmount === preset.toString() }]"
                  @click="tipAmount = preset.toString()"
                >
                  <text class="preset-value-glass">{{ preset }}</text>
                  <text class="preset-unit-glass">GAS</text>
                </view>
              </view>
              <NeoInput v-model="tipAmount" type="number" :placeholder="t('customAmount')" suffix="GAS" />
            </view>

            <!-- Optional Message -->
            <view class="input-section">
              <text class="input-label-glass">{{ t("optionalMessage") }}</text>
              <NeoInput v-model="tipMessage" :placeholder="t('messagePlaceholder')" />
            </view>
            <view class="input-section">
              <text class="input-label-glass">{{ t("tipperName") }}</text>
              <NeoInput v-model="tipperName" :placeholder="t('tipperNamePlaceholder')" :disabled="anonymous" />
            </view>
            <view class="input-section">
              <text class="input-label-glass">{{ t("anonymousLabel") }}</text>
              <view class="toggle-row">
                <NeoButton size="sm" :variant="anonymous ? 'primary' : 'secondary'" @click="anonymous = true">
                  {{ t("anonymousOn") }}
                </NeoButton>
                <NeoButton size="sm" :variant="anonymous ? 'secondary' : 'primary'" @click="anonymous = false">
                  {{ t("anonymousOff") }}
                </NeoButton>
              </view>
            </view>

            <!-- Send Button -->
            <NeoButton variant="primary" size="lg" block :loading="isLoading" @click="sendTip">
              <text v-if="!isLoading">💚 {{ t("sendTipBtn") }}</text>
              <text v-else>{{ t("sending") }}</text>
            </NeoButton>
          </view>
        </NeoCard>
      </view>

      <view v-if="activeTab === 'stats'" class="tab-content">
        <NeoCard variant="erobo">
          <view class="stats-grid-neo">
            <view class="stat-item-neo">
              <text class="stat-label-neo">{{ t("totalDonated") }}</text>
              <text class="stat-value-neo">{{ formatNum(totalDonated) }} GAS</text>
            </view>
          </view>
        </NeoCard>

        <!-- Recent Tips in Stats -->
        <NeoCard v-if="recentTips.length > 0" variant="erobo-neo">
          <view class="recent-tips-glass">
            <view v-for="tip in recentTips" :key="tip.id" class="recent-tip-item-glass">
              <text class="recent-tip-emoji">✨</text>
              <view class="recent-tip-info">
                <text class="recent-tip-to-glass">{{ tip.to }}</text>
                <text class="recent-tip-time-glass">{{ tip.time }}</text>
              </view>
              <text class="recent-tip-amount-glass">{{ tip.amount }} GAS</text>
            </view>
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
    <Fireworks :active="status?.type === 'success'" :duration="3000" />
  </ResponsiveLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useWallet, useEvents } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { formatNumber, parseGas, toFixed8 } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { parseInvokeResult, parseStackItem } from "@shared/utils/neo";
import { useI18n } from "@/composables/useI18n";
import { ResponsiveLayout, NeoDoc, NeoButton, NeoInput, NeoCard, ChainWarning } from "@shared/components";
import Fireworks from "@shared/components/Fireworks.vue";
import type { NavTab } from "@shared/components/NavBar.vue";
import { usePaymentFlow } from "@shared/composables/usePaymentFlow";

const { t } = useI18n();

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
]);
const APP_ID = "miniapp-dev-tipping";
const MIN_TIP = 0.001;
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress } = useWallet() as WalletSDK;
const { list: listEvents } = useEvents();
const { processPayment } = usePaymentFlow(APP_ID);
const isLoading = ref(false);

const activeTab = ref<string>("send");
const navTabs = computed<NavTab[]>(() => [
  { id: "send", label: t("sendTip"), icon: "💰" },
  { id: "developers", label: t("developers"), icon: "👨‍💻" },
  { id: "stats", label: t("stats"), icon: "chart" },
  { id: "docs", icon: "book", label: t("docs") },
]);

const selectedDevId = ref<number | null>(null);
const tipAmount = ref("1");
const tipMessage = ref("");
const tipperName = ref("");
const anonymous = ref(false);
const status = ref<{ msg: string; type: string } | null>(null);
const totalDonated = ref(0);

// Preset tip amounts
const presetAmounts = [1, 2, 5, 10];

interface Developer {
  id: number;
  name: string;
  role: string;
  wallet: string;
  totalTips: number;
  tipCount: number;
  balance: number;
  rank: string;
}

interface RecentTip {
  id: string;
  to: string;
  amount: string;
  time: string;
}

const developers = ref<Developer[]>([]);
const recentTips = ref<RecentTip[]>([]);

const formatNum = (n: number) => formatNumber(n, 2);
const toNumber = (value: any) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const contractAddress = ref<string | null>(null);
const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) throw new Error(t("contractUnavailable"));
  return contractAddress.value;
};

const loadDevelopers = async () => {
  try {
    const contract = await ensureContractAddress();
    const totalRes = await invokeRead({ contractAddress: contract, operation: "totalDevelopers", args: [] });
    const total = toNumber(parseInvokeResult(totalRes));
    if (!total) {
      developers.value = [];
      totalDonated.value = 0;
      return;
    }
    const ids = Array.from({ length: total }, (_, i) => i + 1);
    const devs = await Promise.all(
      ids.map(async (id) => {
        const detailsRes = await invokeRead({
          contractAddress: contract,
          operation: "getDeveloperDetails",
          args: [{ type: "Integer", value: id }],
        });
        const parsed = parseInvokeResult(detailsRes);
        const details =
          parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
        const name = String(details.name || "").trim();
        const role = String(details.role || "").trim();
        const wallet = String(details.wallet || "").trim();
        const totalReceived = parseGas(details.totalReceived ?? 0);
        const tipCount = toNumber(details.tipCount);
        const balance = parseGas(details.balance ?? 0);
        if (!wallet) return null;
        return {
          id,
          name: name || t("defaultDevName", { id }),
          role: role || t("defaultDevRole"),
          wallet,
          totalTips: totalReceived,
          tipCount,
          balance,
          rank: "",
        };
      }),
    );
    const donatedRes = await invokeRead({ contractAddress: contract, operation: "totalDonated", args: [] });
    totalDonated.value = parseGas(parseInvokeResult(donatedRes));

    // Filter before sorting to avoid null errors
    const validDevs = devs.filter((d): d is Developer => d !== null);

    validDevs.sort((a, b) => b.totalTips - a.totalTips);
    validDevs.forEach((dev, idx) => {
      dev.rank = `#${idx + 1}`;
    });
    developers.value = validDevs;
  } catch {}
};

const loadRecentTips = async () => {
  const res = await listEvents({ app_id: APP_ID, event_name: "TipSent", limit: 20 });
  const devMap = new Map(developers.value.map((dev) => [dev.id, dev.name]));
  recentTips.value = res.events.map((evt) => {
    const values = Array.isArray((evt as any)?.state) ? (evt as any).state.map(parseStackItem) : [];
    const devId = toNumber(values[1] ?? 0);
    const amount = parseGas(values[2]);
    const to = devMap.get(devId) || t("defaultDevName", { id: devId });
    return {
      id: evt.id,
      to,
      amount: amount.toFixed(2),
      time: new Date(evt.created_at || Date.now()).toLocaleString(),
    };
  });
};

const refreshData = async () => {
  try {
    await loadDevelopers();
    await loadRecentTips();
  } catch {}
};

const selectDev = (dev: Developer) => {
  selectedDevId.value = dev.id;
  status.value = { msg: `${t("selected")} ${dev.name}`, type: "success" };
  activeTab.value = "send";
};

const sendTip = async () => {
  if (!selectedDevId.value || !tipAmount.value || isLoading.value) return;
  isLoading.value = true;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }
    const contract = await ensureContractAddress();
    const amount = Number.parseFloat(tipAmount.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(t("invalidAmount"));
    }
    if (amount < MIN_TIP) {
      throw new Error(t("minTip"));
    }
    const amountInt = toFixed8(tipAmount.value);

    const { receiptId, invoke } = await processPayment(String(amount), `tip:${selectedDevId.value}`);
    if (!receiptId) {
      throw new Error(t("receiptMissing"));
    }

    await invoke(
      "Tip",
      [
        { type: "Hash160", value: address.value as string },
        { type: "Integer", value: String(selectedDevId.value) },
        { type: "Integer", value: amountInt },
        { type: "String", value: tipMessage.value || "" },
        { type: "String", value: tipperName.value || "" },
        { type: "Boolean", value: anonymous.value },
        { type: "Integer", value: String(receiptId) },
      ],
      contract,
    );

    status.value = { msg: t("tipSent"), type: "success" };
    tipAmount.value = "1";
    tipMessage.value = "";
    tipperName.value = "";
    anonymous.value = false;
    await refreshData();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  refreshData();
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";

@import "./dev-tipping-theme.scss";

:global(page) {
  background: var(--bg-primary);
}

.app-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  gap: 16px;
  background-color: var(--cafe-bg);
  /* Cyber Cafe Pattern */
  background-image:
    linear-gradient(var(--cafe-panel-weak), var(--cafe-panel-weak)),
    repeating-linear-gradient(0deg, transparent, transparent 20px, var(--cafe-border) 21px),
    repeating-linear-gradient(90deg, transparent, transparent 20px, var(--cafe-border) 21px);
}

.tab-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Cyber Cafe Component Overrides */
:global(.theme-dev-tipping) :deep(.neo-card) {
  background: linear-gradient(135deg, var(--cafe-glass) 0%, var(--cafe-panel) 100%) !important;
  border: 1px solid var(--cafe-neon) !important;
  border-radius: 16px !important;
  box-shadow: var(--cafe-card-shadow) !important;
  color: var(--cafe-text) !important;
  backdrop-filter: blur(10px);

  &.variant-danger {
    border-color: var(--cafe-error-border) !important;
    background: var(--cafe-error-bg) !important;
  }
}

:global(.theme-dev-tipping) :deep(.neo-button) {
  border-radius: 8px !important;
  font-family: "JetBrains Mono", monospace !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &.variant-primary {
    background: var(--cafe-neon) !important;
    color: var(--cafe-button-text) !important;
    border: none !important;
    box-shadow: var(--cafe-button-shadow) !important;

    &:active {
      transform: scale(0.98);
      box-shadow: var(--cafe-button-shadow-press) !important;
    }
  }

  &.variant-secondary {
    background: transparent !important;
    border: 1px solid var(--cafe-secondary-border) !important;
    color: var(--cafe-secondary-text) !important;
  }
}

:global(.theme-dev-tipping) :deep(input),
:global(.theme-dev-tipping) :deep(.neo-input) {
  background: var(--cafe-input-bg) !important;
  border: 1px solid var(--cafe-input-border) !important;
  color: var(--cafe-text) !important;
  border-radius: 8px !important;
  font-family: "JetBrains Mono", monospace !important;

  &:focus {
    border-color: var(--cafe-neon) !important;
    box-shadow: 0 0 0 1px var(--cafe-neon) !important;
  }
}

/* Custom Dev Card Styles */
.dev-card-glass {
  background: var(--cafe-panel-weak);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--cafe-panel-border);
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    background: var(--cafe-panel-hover);
  }
}

.dev-card-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.dev-avatar-glass {
  width: 56px;
  height: 56px;
  background: var(--cafe-avatar-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--cafe-neon);
  font-size: 28px;
  position: relative;
}

.avatar-badge-glass {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: var(--cafe-neon);
  color: var(--cafe-badge-text);
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: var(--cafe-badge-shadow);
}

.dev-info {
  flex: 1;
}

.dev-name-glass {
  font-size: 16px;
  font-weight: 800;
  color: var(--cafe-text-strong);
  font-family: "JetBrains Mono", monospace;
  display: block;
}
.dev-projects-glass {
  font-size: 10px;
  color: var(--cafe-neon);
  border: 1px solid var(--cafe-secondary-border);
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 4px;
  font-weight: bold;
  text-transform: uppercase;
}
.dev-contributions-glass {
  font-size: 10px;
  color: var(--cafe-muted);
  display: block;
  margin-top: 4px;
}

.dev-card-footer-glass {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--cafe-dash-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.tip-label-glass {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--cafe-muted);
}
.tip-amount-glass {
  font-family: "JetBrains Mono", monospace;
  font-size: 18px;
  color: var(--cafe-neon);
  font-weight: bold;
  text-shadow: var(--cafe-neon-glow);
}

.dev-select-item-glass {
  padding: 12px;
  background: var(--cafe-input-bg);
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid transparent;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;

  &.active {
    border-color: var(--cafe-neon);
    background: var(--cafe-panel-hover);
  }
}
.dev-select-name-glass {
  color: var(--cafe-text-strong);
  font-weight: bold;
  font-family: "JetBrains Mono", monospace;
}
.dev-select-role-glass {
  color: var(--cafe-muted);
  font-size: 10px;
}

.preset-amounts {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 12px;
}

.preset-btn-glass {
  flex: 1;
  background: var(--cafe-input-bg);
  border: 1px solid var(--cafe-panel-border);
  border-radius: 8px;
  padding: 10px;
  text-align: center;

  &.active {
    background: var(--cafe-neon);
    border-color: var(--cafe-neon);
    color: var(--cafe-preset-active-text);
    box-shadow: var(--cafe-neon-glow);
    .preset-value-glass,
    .preset-unit-glass {
      color: var(--cafe-preset-active-text);
    }
  }
}

.preset-value-glass {
  font-size: 16px;
  font-weight: bold;
  color: var(--cafe-text-strong);
}
.preset-unit-glass {
  font-size: 10px;
  color: var(--cafe-muted);
}

.recent-tip-item-glass {
  background: var(--cafe-input-bg);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 2px solid var(--cafe-neon);
}
.recent-tip-to-glass {
  color: var(--cafe-text-strong);
  font-weight: bold;
  font-size: 14px;
}
.recent-tip-time-glass {
  color: var(--cafe-muted);
  font-size: 10px;
}
.recent-tip-amount-glass {
  margin-left: auto;
  color: var(--cafe-neon);
  font-family: "JetBrains Mono", monospace;
  font-weight: bold;
}

.stat-item-neo {
  text-align: center;
}
.stat-label-neo {
  color: var(--cafe-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.stat-value-neo {
  font-size: 28px;
  color: var(--cafe-neon);
  font-family: "JetBrains Mono", monospace;
  font-weight: bold;
  text-shadow: var(--cafe-neon-glow-strong);
}

.input-label-glass {
  color: var(--cafe-text);
  font-size: 11px;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  display: block;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.input-section {
  display: flex;
  flex-direction: column;
}
.toggle-row {
  display: flex;
  gap: 10px;
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.tip-warning-title {
  color: var(--cafe-error-border);
}

.tip-warning-desc {
  color: var(--cafe-text);
}
</style>
