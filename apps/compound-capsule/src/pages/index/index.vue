<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-compound-capsule" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <!-- Main Tab -->
    <view v-if="activeTab === 'main'" class="tab-content">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-4 text-center">
        <text class="font-bold status-msg">{{ status.msg }}</text>
      </NeoCard>

      <!-- Lock Period Selector & Deposit -->
      <NeoCard class="deposit-card" variant="erobo-neo">
        <view class="lock-period-selector">
          <text class="selector-label">{{ t("lockPeriod") }}</text>
          <view class="period-options">
            <view
              v-for="period in lockPeriods"
              :key="period.days"
              :class="['period-option-glass', { active: selectedPeriod === period.days }]"
              @click="selectedPeriod = period.days"
            >
              <text class="period-days">{{ period.days }}{{ t("daysShort") }}</text>
            </view>
          </view>
        </view>

        <view class="projected-returns-glass">
          <text class="returns-label">{{ t("unlockDate") }}</text>
          <view class="returns-display">
            <text class="returns-value">{{ unlockDateLabel }}</text>
          </view>
        </view>

        <NeoInput v-model="amount" type="number" :placeholder="t('amountPlaceholder')" suffix="NEO" />
        <NeoButton variant="primary" size="lg" block :loading="isLoading" @click="createCapsule">
          {{ isLoading ? t("processing") : t("deposit") }}
        </NeoButton>
        <text class="note">{{ t("minLock", { days: MIN_LOCK_DAYS }) }}</text>
      </NeoCard>

      <!-- Your Summary -->
      <NeoCard variant="erobo-neo" class="position-card">
        <view class="position-stats">
          <view class="position-row primary">
            <text class="label">{{ t("deposited") }}</text>
            <text class="value">{{ fmt(position.deposited, 0) }} NEO</text>
          </view>
          <view class="position-row earned">
            <text class="label">{{ t("earned") }}</text>
            <text class="value growth">+{{ fmt(position.earned, 4) }} GAS</text>
          </view>
          <view class="position-row projection">
            <text class="label">{{ t("capsulesCount") }}</text>
            <text class="value">{{ position.capsules }}</text>
          </view>
        </view>
      </NeoCard>
    </view>

    <!-- Stats Tab -->
    <view v-if="activeTab === 'stats'" class="tab-content scrollable">
      <!-- Capsule Visualization -->
      <NeoCard variant="erobo" class="vault-card">
        <view class="capsule-container-glass">
          <view class="capsule-visual">
            <view class="capsule-body-glass">
              <view class="capsule-fill-glass" :style="{ height: fillPercentage + '%' }">
                <view class="capsule-shimmer"></view>
              </view>
              <view class="capsule-label">
                <text class="capsule-apy">{{ fmt(vault.totalLocked, 0) }}</text>
                <text class="capsule-apy-label">{{ t("totalLocked") }}</text>
              </view>
            </view>
          </view>
          <view class="vault-stats-grid">
            <view class="stat-item-glass">
              <text class="stat-label">{{ t("totalLocked") }}</text>
              <text class="stat-value tvl">{{ fmt(vault.totalLocked, 0) }}</text>
              <text class="stat-unit">NEO</text>
            </view>
            <view class="stat-item-glass">
              <text class="stat-label">{{ t("totalCapsules") }}</text>
              <text class="stat-value freq">{{ vault.totalCapsules }}</text>
            </view>
          </view>
        </view>
      </NeoCard>

      <!-- Active Capsules -->
      <NeoCard variant="erobo" class="capsules-card">
        <view v-for="(capsule, idx) in activeCapsules" :key="idx" class="capsule-item-glass">
          <view class="capsule-header">
            <view class="capsule-icon">💊</view>
            <view class="capsule-info">
              <text class="capsule-amount">{{ fmt(capsule.amount, 0) }} NEO</text>
              <text class="capsule-period">{{ capsule.unlockDate }}</text>
            </view>
            <view class="capsule-actions">
              <view class="capsule-status">
                <view class="status-badge" :class="capsule.status === 'Ready' ? 'ready' : 'locked'">
                  <text class="status-badge-text">{{ capsule.status === "Ready" ? t("ready") : t("locked") }}</text>
                </view>
              </view>
              <NeoButton
                v-if="capsule.status === 'Ready'"
                size="sm"
                variant="primary"
                :loading="isLoading"
                @click="unlockCapsule(capsule.id)"
              >
                {{ t("unlock") }}
              </NeoButton>
            </view>
          </view>
          <view class="capsule-progress">
            <view class="progress-bar-glass">
              <view class="progress-fill-glass" :style="{ width: capsule.status === 'Ready' ? '100%' : '0%' }"></view>
            </view>
            <text class="progress-text">{{ capsule.status === "Ready" ? t("ready") : t("locked") }}</text>
          </view>
          <view class="capsule-footer">
            <view class="countdown">
              <text class="countdown-label">{{ t("maturesIn") }}</text>
              <text class="countdown-value">{{ capsule.remaining }}</text>
            </view>
            <view class="rewards">
              <text class="rewards-label">{{ t("rewards") }}</text>
              <text class="rewards-value">+{{ fmt(capsule.compound, 4) }} GAS</text>
            </view>
          </view>
        </view>
        <text v-if="activeCapsules.length === 0" class="empty-text">{{ t("noCapsules") }}</text>
      </NeoCard>

      <!-- Statistics -->
      <NeoCard variant="erobo-neo">
        <view class="stats-grid-glass">
          <view class="stat-box-glass">
            <text class="stat-label">{{ t("totalCapsules") }}</text>
            <text class="stat-value">{{ stats.totalCapsules }}</text>
          </view>
          <view class="stat-box-glass">
            <text class="stat-label">{{ t("totalLocked") }}</text>
            <text class="stat-value">{{ fmt(stats.totalLocked, 0) }} NEO</text>
          </view>
          <view class="stat-box-glass">
            <text class="stat-label">{{ t("totalAccrued") }}</text>
            <text class="stat-value">{{ fmt(stats.totalAccrued, 4) }} GAS</text>
          </view>
        </view>
      </NeoCard>
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
import { ref, computed, onMounted, watch } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { formatNumber } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { addressToScriptHash, normalizeScriptHash, parseInvokeResult } from "@shared/utils/neo";
import { useI18n } from "@/composables/useI18n";
import { ResponsiveLayout, NeoDoc, NeoButton, NeoInput, NeoCard, Fireworks, ChainWarning } from "@shared/components";

const isLoading = ref(false);

const { t, locale } = useI18n();

const navTabs = computed(() => [
  { id: "main", icon: "wallet", label: t("main") },
  { id: "stats", icon: "chart", label: t("stats") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const activeTab = ref("main");

type StatusType = "success" | "error";
type Status = { msg: string; type: StatusType };
type Vault = { totalLocked: number; totalCapsules: number };
type Position = { deposited: number; earned: number; capsules: number };
type Capsule = {
  id: string;
  amount: number;
  unlockTime: number;
  unlockDate: string;
  remaining: string;
  compound: number;
  status: "Ready" | "Locked";
};

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
]);
const { address, connect, chainType, getContractAddress, invokeContract, invokeRead } = useWallet() as WalletSDK;
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

const MIN_LOCK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const vault = ref<Vault>({ totalLocked: 0, totalCapsules: 0 });
const position = ref<Position>({ deposited: 0, earned: 0, capsules: 0 });
const stats = ref({ totalCapsules: 0, totalLocked: 0, totalAccrued: 0 });
const activeCapsules = ref<Capsule[]>([]);
const amount = ref<string>("");
const status = ref<Status | null>(null);
const selectedPeriod = ref<number>(30);

const lockPeriods = [{ days: 7 }, { days: 30 }, { days: 90 }, { days: 180 }];

const fillPercentage = computed(() => (vault.value.totalLocked > 0 ? 100 : 0));

const resolveDateLocale = () => (locale.value === "zh" ? "zh-CN" : "en-US");
const unlockDateLabel = computed(() => {
  const unlockTime = Date.now() + selectedPeriod.value * DAY_MS;
  return new Date(unlockTime).toLocaleDateString(resolveDateLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
});

const fmt = (n: number, d = 2) => formatNumber(n, d);
const formatCountdown = (ms: number) => {
  if (ms <= 0) return t("ready");
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}${t("daysShort")} ${hours}${t("hoursShort")}`;
  if (hours > 0) return `${hours}${t("hoursShort")} ${minutes}${t("minutesShort")}`;
  return `${minutes}${t("minutesShort")}`;
};
const formatUnlockDate = (ms: number) =>
  new Date(ms).toLocaleDateString(resolveDateLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const toTimestampMs = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1e12 ? value : value * 1000;
};

// Fetch capsules from smart contract
const fetchData = async () => {
  try {
    const contract = await ensureContractAddress();
    const totalResult = await invokeRead({
      contractAddress: contract,
      operation: "TotalCapsules",
      args: [],
    });
    const totalCapsules = Number(parseInvokeResult(totalResult) || 0);
    const lockedResult = await invokeRead({ contractAddress: contract,       operation: "TotalLocked", args: [] });
    const platformLocked = Number(parseInvokeResult(lockedResult) || 0);
    const userCapsules: Capsule[] = [];
    let userLocked = 0;
    let userAccrued = 0;
    const now = Date.now();
    const userScriptHash = address.value ? addressToScriptHash(address.value) : "";

    for (let i = 1; i <= totalCapsules; i++) {
      const capsuleResult = await invokeRead({
        contractAddress: contract,
        operation: "GetCapsuleDetails",
        args: [{ type: "Integer", value: i.toString() }],
      });
      const parsed = parseInvokeResult(capsuleResult);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const data = parsed as Record<string, any>;
        const owner = normalizeScriptHash(String(data?.owner ?? ""));
        const principal = Number(data?.principal || 0);
        const unlockTime = Number(data?.unlockTime || 0);
        const unlockTimeMs = toTimestampMs(unlockTime);
        const isActive = Boolean(data?.active);
        const compoundRaw = Number(data?.compound || 0);

        if (userScriptHash && isActive && owner === userScriptHash) {
          const isReady = unlockTimeMs <= now;
          const compound = compoundRaw / 1e8;
          userCapsules.push({
            id: i.toString(),
            amount: principal,
            unlockTime: unlockTimeMs,
            unlockDate: formatUnlockDate(unlockTimeMs),
            remaining: isReady ? t("ready") : formatCountdown(unlockTimeMs - now),
            compound,
            status: isReady ? "Ready" : "Locked",
          });

          userLocked += principal;
          userAccrued += compound;
        }
      }
    }

    vault.value = { totalLocked: platformLocked, totalCapsules };
    activeCapsules.value = userCapsules;
    position.value = { deposited: userLocked, earned: userAccrued, capsules: userCapsules.length };
    stats.value = { totalCapsules: userCapsules.length, totalLocked: userLocked, totalAccrued: userAccrued };
  } catch (e: any) {
    status.value = { msg: e?.message || t("loadFailed"), type: "error" };
  }
};

onMounted(() => {
  fetchData();
});
watch(address, () => {
  fetchData();
});

const createCapsule = async (): Promise<void> => {
  if (isLoading.value) return;
  const amt = Number(amount.value);
  if (!Number.isFinite(amt) || amt <= 0 || !Number.isInteger(amt)) {
    status.value = { msg: t("enterValidAmount"), type: "error" };
    return;
  }

  if (selectedPeriod.value < MIN_LOCK_DAYS) {
    status.value = { msg: t("minLock", { days: MIN_LOCK_DAYS }), type: "error" };
    return;
  }

  isLoading.value = true;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }

    const contract = await ensureContractAddress();
    // Contract expects lockDays, not unlockTime timestamp
    const lockDays = selectedPeriod.value;

    await invokeContract({
      scriptHash: contract,
      operation: "CreateCapsule",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: String(amt) },
        { type: "Integer", value: String(lockDays) },
      ],
    });

    status.value = { msg: t("capsuleCreated"), type: "success" };
    amount.value = "";
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("contractUnavailable"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

const unlockCapsule = async (capsuleId: string) => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }

    const contract = await ensureContractAddress();
    // Contract only needs capsuleId, owner is verified internally
    await invokeContract({
      scriptHash: contract,
      operation: "UnlockCapsule",
      args: [{ type: "Integer", value: capsuleId }],
    });

    status.value = { msg: t("capsuleUnlocked"), type: "success" };
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("unlockFailed"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./compound-capsule-theme.scss";

:global(page) {
  background: var(--capsule-bg);
}

.tab-content {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background-color: var(--capsule-bg);
  background-image:
    radial-gradient(circle at 10% 20%, var(--capsule-accent-purple) 0%, transparent 20%),
    radial-gradient(circle at 90% 80%, var(--capsule-accent-gold) 0%, transparent 20%);
  min-height: 100vh;
}

/* Alchemy Component Overrides */
:deep(.neo-card) {
  background: var(--capsule-card-bg) !important;
  border: 1px solid var(--capsule-card-border) !important;
  border-radius: 16px !important;
  box-shadow: var(--capsule-card-shadow) !important;
  color: var(--capsule-text) !important;
  position: relative;
  overflow: hidden;

  /* Decorative Corner Accents */
  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 40px;
    height: 40px;
    border: 1px solid var(--capsule-gold);
    opacity: 0.3;
    pointer-events: none;
  }
  &::before {
    top: -20px;
    left: -20px;
    border-radius: 50%;
  }
  &::after {
    bottom: -20px;
    right: -20px;
    border-radius: 50%;
  }
}

:deep(.neo-button) {
  border-radius: 8px !important;
  font-family: "Cinzel", serif !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700 !important;

  &.variant-primary {
    background: var(--capsule-button-gradient) !important;
    color: var(--capsule-button-text) !important;
    border: 1px solid var(--capsule-button-border) !important;
    box-shadow: var(--capsule-button-shadow) !important;

    &:active {
      transform: translateY(1px);
      box-shadow: var(--capsule-button-shadow-press) !important;
    }
  }

  &.variant-secondary {
    background: transparent !important;
    border: 1px solid var(--capsule-text) !important;
    color: var(--capsule-text) !important;
    opacity: 0.8;
  }
}

:deep(input),
:deep(.neo-input input) {
  font-family: "Cinzel", serif !important;
}

/* Custom Elements */

.status-msg {
  font-size: 14px;
  color: var(--capsule-text);
  letter-spacing: 0.05em;
  font-family: "Cinzel", serif;
}

.capsule-container-glass {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px;
}
.capsule-body-glass {
  width: 70px;
  height: 120px;
  background: var(--capsule-body-bg);
  border: 2px solid var(--capsule-body-border);
  border-radius: 40px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--capsule-body-shadow);

  /* Flask Shape approximation */
  &::after {
    content: "";
    position: absolute;
    top: 10%;
    left: 10%;
    width: 20%;
    height: 10%;
    background: var(--capsule-body-highlight);
    border-radius: 50%;
    filter: blur(2px);
  }
}
.capsule-fill-glass {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: var(--capsule-fill-gradient);
  border-top: 1px solid var(--capsule-fill-border);
  transition: height 0.5s ease;

  /* Bubbles */
  background-image: radial-gradient(var(--capsule-fill-bubble) 1px, transparent 1px);
  background-size: 10px 10px;
}
.capsule-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
}
.capsule-apy {
  font-weight: 800;
  font-size: 16px;
  color: var(--capsule-apy-text);
  text-shadow: var(--capsule-apy-shadow);
  font-family: "Cinzel", serif;
}
.capsule-apy-label {
  font-size: 9px;
  font-weight: 700;
  color: var(--capsule-apy-label);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.vault-stats-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stat-item-glass {
  padding: 16px;
  background: var(--capsule-stat-bg);
  border: 1px solid var(--capsule-stat-border);
  border-radius: 12px;
}
.stat-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--capsule-stat-label);
  letter-spacing: 0.1em;
}
.stat-value {
  font-weight: 800;
  font-family: "Cinzel", serif;
  font-size: 18px;
  color: var(--capsule-gold);
}
.stat-unit {
  font-size: 10px;
  color: var(--capsule-stat-unit);
  margin-left: 4px;
}

.period-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 20px 0;
}
.period-option-glass {
  padding: 16px 8px;
  background: var(--capsule-period-bg);
  border: 1px solid var(--capsule-period-border);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: var(--capsule-period-hover);
  }
  &.active {
    background: var(--capsule-period-active-bg);
    border-color: var(--capsule-gold);
    box-shadow: var(--capsule-period-active-shadow);
  }
}
.period-days {
  font-weight: 700;
  font-size: 14px;
  color: var(--capsule-text);
  display: block;
  font-family: "Cinzel", serif;
}

.projected-returns-glass {
  background: var(--capsule-returns-bg);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid var(--capsule-returns-border);
  box-shadow: var(--capsule-returns-shadow);
}
.returns-label {
  font-size: 11px;
  color: var(--capsule-returns-label);
  display: block;
  margin-bottom: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.returns-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--capsule-emerald);
  font-family: "Cinzel", serif;
  text-shadow: var(--capsule-returns-value-shadow);
}

.capsule-item-glass {
  padding: 20px;
  background: var(--capsule-item-bg);
  border: 1px solid var(--capsule-item-border);
  margin-bottom: 20px;
  border-radius: 12px;
  position: relative;

  /* Vintage Paper Texture Overlay (simulated) */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)" opacity="0.05"/%3E%3C/svg%3E');
    opacity: 0.1;
    pointer-events: none;
    border-radius: 12px;
  }
}
.capsule-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.capsule-icon {
  font-size: 28px;
  filter: grayscale(0.5);
}
.capsule-amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--capsule-gold);
  display: block;
  font-family: "Cinzel", serif;
}
.capsule-period {
  font-size: 12px;
  color: var(--capsule-returns-label);
}
.status-badge {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  &.ready {
    background: var(--capsule-status-ready-bg);
    border-color: var(--capsule-emerald);
  }
  &.locked {
    background: var(--capsule-status-locked-bg);
    border-color: var(--capsule-status-locked-border);
  }
}
.status-badge-text {
  font-size: 10px;
  font-weight: 700;
  .ready & {
    color: var(--capsule-emerald);
  }
  .locked & {
    color: var(--capsule-status-locked-text);
  }
}

.capsule-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--capsule-footer-border);
}
.countdown-value,
.rewards-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--capsule-text);
  font-family: "Cinzel", serif;
}
.rewards-value {
  color: var(--capsule-emerald);
  text-shadow: var(--capsule-emerald-glow);
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.empty-text {
  font-size: 14px;
  color: var(--capsule-empty-text);
  text-align: center;
  display: block;
  padding: 32px;
  font-style: italic;
  font-family: "Cinzel", serif;
}
</style>
