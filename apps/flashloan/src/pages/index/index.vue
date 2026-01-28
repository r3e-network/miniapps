<template>
  <AppLayout :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <!-- Main Tab -->
    <view v-if="activeTab === 'main'" class="tab-content theme-flashloan">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <!-- Instruction Mode Banner -->
      <NeoCard variant="warning" class="mb-4 text-center">
        <text class="font-bold block text-glass-glow">{{ t("instructionMode") }}</text>
        <text class="text-xs opacity-80 text-glass">{{ t("instructionNote") }}</text>
      </NeoCard>

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'erobo-neo'" class="mb-4 text-center">
        <text class="font-bold text-glass">{{ status.msg }}</text>
      </NeoCard>

      <LoanRequestForm
        v-model:loanId="loanIdInput"
        :loan-details="loanDetails"
        :is-loading="isLoading"
        :t="t as any"
        @lookup="lookupLoan"
        @request-loan="handleRequestLoan"
      />
    </view>

    <!-- Stats Tab -->
    <view v-if="activeTab === 'stats'" class="tab-content scrollable theme-flashloan">
      <NeoCard class="mb-4" variant="erobo">
        <FlowVisualization :t="t as any" />
      </NeoCard>

      <LiquidityPoolCard :pool-balance="poolBalance" :t="t as any" class="mb-4" />

      <SimulationStats :stats="stats" :t="t as any" />

      <RecentLoansTable :recent-loans="recentLoans" :t="t as any" />
    </view>

    <!-- Docs Tab -->
    <view v-if="activeTab === 'docs'" class="tab-content scrollable theme-flashloan">
      <FlashloanDocs :t="t as any" :contract-address="contractAddress" />
    </view>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useWallet, useEvents } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { formatNumber, formatAddress, formatGas } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { parseInvokeResult, parseStackItem } from "@shared/utils/neo";
import { useI18n } from "@/composables/useI18n";
import { AppLayout, NeoCard, NeoButton, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";

import FlowVisualization from "./components/FlowVisualization.vue";
import LiquidityPoolCard from "./components/LiquidityPoolCard.vue";
import LoanRequestForm from "./components/LoanRequestForm.vue";
import SimulationStats from "./components/SimulationStats.vue";
import RecentLoansTable from "./components/RecentLoansTable.vue";
import FlashloanDocs from "./components/FlashloanDocs.vue";

const { t } = useI18n();

const navTabs = computed<NavTab[]>(() => [
  { id: "main", icon: "wallet", label: t("main") },
  { id: "stats", icon: "chart", label: t("stats") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const activeTab = ref("main");

type LoanStatus = "pending" | "success" | "failed";

type LoanDetails = {
  id: string;
  borrower: string;
  amount: string;
  fee: string;
  callbackContract: string;
  callbackMethod: string;
  timestamp: string;
  status: LoanStatus;
};

type ExecutedLoan = {
  id: number;
  amount: number;
  fee: number;
  status: "success" | "failed";
  timestamp: string;
};

const APP_ID = "miniapp-flashloan";
const { address, chainType, invokeRead, invokeContract, getContractAddress } = useWallet() as WalletSDK;
const { list: listEvents } = useEvents();

const contractAddress = ref<string | null>(null);
const poolBalance = ref(0);
const loanIdInput = ref("");
const loanDetails = ref<LoanDetails | null>(null);
const stats = ref({ totalLoans: 0, totalVolume: 0, totalFees: 0 });
const recentLoans = ref<ExecutedLoan[]>([]);
const status = ref<{ msg: string; type: "success" | "error" } | null>(null);
const isLoading = ref(false);

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) throw new Error(t("error"));
  return contractAddress.value;
};

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatTimestamp = (value: unknown) => {
  const ts = toNumber(value);
  if (!ts) return t("notAvailable");
  return new Date(ts * 1000).toLocaleString();
};

const listAllEvents = async (eventName: string) => {
  const events: any[] = [];
  let afterId: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const res = await listEvents({ app_id: APP_ID, event_name: eventName, limit: 50, after_id: afterId });
    events.push(...res.events);
    hasMore = Boolean(res.has_more && res.last_id);
    afterId = res.last_id || undefined;
  }
  return events;
};

const buildLoanDetails = (parsed: unknown, loanId: number): LoanDetails | null => {
  if (!Array.isArray(parsed) || parsed.length < 8) return null;
  const [borrower, amount, fee, callbackContract, callbackMethod, timestamp, executed, success] = parsed;
  const amountRaw = toNumber(amount);
  const feeRaw = toNumber(fee);
  const callbackMethodText = String(callbackMethod || "");
  const isEmpty = amountRaw === 0 && feeRaw === 0 && !callbackMethodText && !toNumber(timestamp);
  if (isEmpty) return null;

  const executedFlag = Boolean(executed);
  const statusValue: LoanStatus = executedFlag ? (Boolean(success) ? "success" : "failed") : "pending";

  return {
    id: String(loanId),
    borrower: formatAddress(String(borrower || "")),
    amount: formatGas(amountRaw),
    fee: formatGas(feeRaw),
    callbackContract: formatAddress(String(callbackContract || "")),
    callbackMethod: callbackMethodText || t("notAvailable"),
    timestamp: formatTimestamp(timestamp),
    status: statusValue,
  };
};

const lookupLoan = async () => {
  const loanId = Number(loanIdInput.value);
  if (!Number.isFinite(loanId) || loanId <= 0) {
    status.value = { msg: t("invalidLoanId"), type: "error" };
    return;
  }

  try {
    isLoading.value = true;
    const contract = await ensureContractAddress();
    const res = await invokeRead({
      contractAddress: contract,
      operation: "getLoan",
      args: [{ type: "Integer", value: String(loanId) }],
    });

    const parsed = parseInvokeResult(res);
    const details = buildLoanDetails(parsed, loanId);
    if (!details) {
      loanDetails.value = null;
      status.value = { msg: t("loanNotFound"), type: "error" };
      return;
    }

    loanDetails.value = details;
    status.value = { msg: t("loanStatusLoaded"), type: "success" };
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

const fetchPoolBalance = async () => {
  const contract = await ensureContractAddress();
  const res = await invokeRead({ contractAddress: contract, operation: "getPoolBalance" });
  poolBalance.value = toGas(parseInvokeResult(res));
};

const fetchLoanStats = async () => {
  const executedEvents = await listAllEvents("LoanExecuted");
  const loans: ExecutedLoan[] = executedEvents
    .map((evt) => {
      const values = Array.isArray(evt?.state) ? evt.state.map(parseStackItem) : [];
      const id = Number(values[0] || 0);
      const amount = toGas(values[2]);
      const fee = toGas(values[3]);
      const success = Boolean(values[4]);
      const timestamp = String(evt.created_at || "");
      if (!id) return null;
      return {
        id,
        amount,
        fee,
        status: success ? "success" : "failed",
        timestamp,
      } as ExecutedLoan;
    })
    .filter(Boolean) as ExecutedLoan[];

  const totalVolume = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalFees = loans.reduce((sum, loan) => sum + loan.fee, 0);

  stats.value = {
    totalLoans: loans.length,
    totalVolume,
    totalFees,
  };

  recentLoans.value = loans
    .slice()
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);
};

const fetchData = async () => {
  try {
    await Promise.all([fetchPoolBalance(), fetchLoanStats()]);
  } catch {}
};

const toFixed8 = (value: string | number): string => {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return "0";
  return Math.floor(num * 100000000).toString();
};

const toGas = (value: unknown): number => {
  const num = toNumber(value);
  return num / 100000000;
};

const handleRequestLoan = async (data: { amount: string; callbackContract: string; callbackMethod: string }) => {
  if (!address.value) {
    status.value = { msg: t("connectWallet"), type: "error" };
    return;
  }

  isLoading.value = true;
  status.value = null;

  try {
    const contract = await ensureContractAddress();
    const amountInt = toFixed8(data.amount);

    await invokeContract({
      scriptHash: contract,
      operation: "RequestLoan",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: amountInt },
        { type: "Hash160", value: data.callbackContract },
        { type: "String", value: data.callbackMethod },
      ],
    });

    status.value = { msg: t("loanRequested"), type: "success" };
    await fetchPoolBalance();
    await fetchLoanStats();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => fetchData());
watch(chainType, () => fetchData());
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";

@import "./flashloan-theme.scss";

:global(page) {
  background: var(--bg-primary);
}

.tab-content {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--flash-gradient);
  min-height: 100vh;
  position: relative;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  /* Circuit Line Overlay */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--flash-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--flash-grid) 1px, transparent 1px);
    background-size: 50px 50px;
    z-index: 10;
    pointer-events: none;
  }
}

/* High Voltage Component Overrides */
.theme-flashloan :deep(.neo-card) {
  background: var(--flash-panel) !important;
  border: 1px solid var(--flash-panel-border) !important;
  box-shadow: var(--flash-panel-shadow) !important;
  border-radius: 8px !important;
  color: var(--flash-text) !important;
  backdrop-filter: blur(8px);

  &.variant-warning {
    background: var(--flash-warning-bg) !important;
    border-color: var(--flash-accent-yellow) !important;
    color: var(--flash-warning-text) !important;
    box-shadow: var(--flash-warning-shadow) !important;
  }
}

.theme-flashloan :deep(.neo-button) {
  border-radius: 4px !important;
  font-family: "Consolas", "Monaco", monospace !important;
  text-transform: uppercase;
  font-weight: 700 !important;
  letter-spacing: 0.05em;

  &.variant-primary {
    background: linear-gradient(90deg, var(--flash-accent-blue) 0%, var(--flash-accent-cyan) 100%) !important;
    color: var(--flash-button-text) !important;
    box-shadow: var(--flash-button-shadow) !important;

    &:active {
      transform: scale(0.98);
      box-shadow: var(--flash-button-shadow-pressed) !important;
    }
  }
}

.text-glass-glow {
  text-shadow: 0 0 10px var(--flash-glow);
  color: var(--flash-text);
}

.text-glass {
  color: var(--flash-text-muted);
}

.flash-warning-title {
  color: var(--flash-warning-text);
}

.flash-warning-desc {
  color: var(--flash-text-muted);
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
