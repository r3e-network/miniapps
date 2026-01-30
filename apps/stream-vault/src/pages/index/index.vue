<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-stream-vault" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event"

      <!-- Desktop Sidebar -->
      <template #desktop-sidebar>
        <view class="desktop-sidebar">
          <text class="sidebar-title">{{ t('overview') }}</text>
        </view>
      </template>
>
    <view v-if="activeTab === 'create'" class="tab-content">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-4 text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <view class="app-container">
        <NeoCard variant="erobo-neo">
          <view class="form-group">
            <NeoInput v-model="form.name" :label="t('vaultName')" :placeholder="t('vaultNamePlaceholder')" />
            <NeoInput v-model="form.beneficiary" :label="t('beneficiary')" :placeholder="t('beneficiaryPlaceholder')" />

            <view class="input-group">
              <text class="input-label">{{ t("assetType") }}</text>
              <view class="asset-toggle">
                <NeoButton size="sm" variant="primary" disabled>
                  {{ t("assetGas") }}
                </NeoButton>
              </view>
            </view>

            <NeoInput
              v-model="form.total"
              type="number"
              :label="t('totalAmount')"
              placeholder="20"
              :suffix="form.asset"
              :hint="t('totalAmountHint')"
            />

            <NeoInput
              v-model="form.rate"
              type="number"
              :label="t('rateAmount')"
              placeholder="1.5"
              :suffix="form.asset"
            />

            <NeoInput
              v-model="form.intervalDays"
              type="number"
              :label="t('intervalDays')"
              placeholder="30"
              :hint="t('intervalHint')"
            />

            <NeoInput v-model="form.notes" type="textarea" :label="t('notes')" :placeholder="t('notesPlaceholder')" />

            <NeoButton
              variant="primary"
              size="lg"
              block
              :loading="isLoading"
              :disabled="isLoading"
              @click="createVault"
            >
              {{ isLoading ? t("creating") : t("createVault") }}
            </NeoButton>
          </view>
        </NeoCard>
      </view>
    </view>

    <view v-if="activeTab === 'vaults'" class="tab-content scrollable">
      <view class="vaults-header">
        <text class="section-title">{{ t("vaultsTab") }}</text>
        <NeoButton size="sm" variant="secondary" :loading="isRefreshing" @click="refreshStreams">
          {{ t("refresh") }}
        </NeoButton>
      </view>

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="text-center">
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

      <view v-else class="vaults-list">
        <view class="section-header">
          <text class="section-label">{{ t("myCreated") }}</text>
          <text class="count-badge">{{ createdStreams.length }}</text>
        </view>
        <view v-if="createdStreams.length === 0" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center opacity-70">
            <text class="text-xs">{{ t("emptyVaults") }}</text>
          </NeoCard>
        </view>
        <view v-for="stream in createdStreams" :key="`created-${stream.id}`" class="vault-card">
          <view class="vault-card__header">
            <view>
              <text class="vault-title">{{ stream.title || `#${stream.id}` }}</text>
              <text class="vault-subtitle">{{ formatAddress(stream.beneficiary) }}</text>
            </view>
            <text :class="['status-pill', stream.status]">{{ statusLabel(stream.status) }}</text>
          </view>
          <view class="vault-metrics">
            <view>
              <text class="metric-label">{{ t("totalLocked") }}</text>
              <text class="metric-value"
                >{{ formatAmount(stream.assetSymbol, stream.totalAmount) }} {{ stream.assetSymbol }}</text
              >
            </view>
            <view>
              <text class="metric-label">{{ t("released") }}</text>
              <text class="metric-value"
                >{{ formatAmount(stream.assetSymbol, stream.releasedAmount) }} {{ stream.assetSymbol }}</text
              >
            </view>
            <view>
              <text class="metric-label">{{ t("remaining") }}</text>
              <text class="metric-value"
                >{{ formatAmount(stream.assetSymbol, stream.remainingAmount) }} {{ stream.assetSymbol }}</text
              >
            </view>
          </view>
          <view class="vault-meta">
            <text class="meta-item">{{ t("intervalLabel") }}: {{ stream.intervalDays }}d</text>
            <text class="meta-item"
              >{{ t("rateLabel") }}: {{ formatAmount(stream.assetSymbol, stream.rateAmount) }}
              {{ stream.assetSymbol }}</text
            >
          </view>
          <view class="vault-actions">
            <NeoButton
              size="sm"
              variant="secondary"
              :loading="cancellingId === stream.id"
              :disabled="stream.status !== 'active'"
              @click="cancelStream(stream)"
            >
              {{ cancellingId === stream.id ? t("cancelling") : t("cancel") }}
            </NeoButton>
          </view>
        </view>

        <view class="section-header mt-6">
          <text class="section-label">{{ t("beneficiaryVaults") }}</text>
          <text class="count-badge">{{ beneficiaryStreams.length }}</text>
        </view>
        <view v-if="beneficiaryStreams.length === 0" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center opacity-70">
            <text class="text-xs">{{ t("emptyVaults") }}</text>
          </NeoCard>
        </view>
        <view v-for="stream in beneficiaryStreams" :key="`beneficiary-${stream.id}`" class="vault-card">
          <view class="vault-card__header">
            <view>
              <text class="vault-title">{{ stream.title || `#${stream.id}` }}</text>
              <text class="vault-subtitle">{{ formatAddress(stream.creator) }}</text>
            </view>
            <text :class="['status-pill', stream.status]">{{ statusLabel(stream.status) }}</text>
          </view>
          <view class="vault-metrics">
            <view>
              <text class="metric-label">{{ t("claimable") }}</text>
              <text class="metric-value"
                >{{ formatAmount(stream.assetSymbol, stream.claimable) }} {{ stream.assetSymbol }}</text
              >
            </view>
            <view>
              <text class="metric-label">{{ t("remaining") }}</text>
              <text class="metric-value"
                >{{ formatAmount(stream.assetSymbol, stream.remainingAmount) }} {{ stream.assetSymbol }}</text
              >
            </view>
          </view>
          <view class="vault-meta">
            <text class="meta-item">{{ t("intervalLabel") }}: {{ stream.intervalDays }}d</text>
            <text class="meta-item"
              >{{ t("rateLabel") }}: {{ formatAmount(stream.assetSymbol, stream.rateAmount) }}
              {{ stream.assetSymbol }}</text
            >
          </view>
          <view class="vault-actions">
            <NeoButton
              size="sm"
              variant="primary"
              :loading="claimingId === stream.id"
              :disabled="stream.status !== 'active' || stream.claimable === 0n"
              @click="claimStream(stream)"
            >
              {{ claimingId === stream.id ? t("claiming") : t("claim") }}
            </NeoButton>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'docs'" class="tab-content scrollable">
      <NeoDoc
        :title="t('title')"
        :subtitle="t('docSubtitle')"
        :description="t('docDescription')"
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
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { useI18n } from "@/composables/useI18n";
import { ResponsiveLayout, NeoCard, NeoButton, NeoInput, NeoDoc, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import { requireNeoChain } from "@shared/utils/chain";
import { formatGas, formatAddress, toFixed8, toFixedDecimals } from "@shared/utils/format";
import { addressToScriptHash, normalizeScriptHash, parseInvokeResult } from "@shared/utils/neo";

const { t } = useI18n();
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress } = useWallet() as WalletSDK;

const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const NEO_HASH_NORMALIZED = normalizeScriptHash(NEO_HASH);
const GAS_HASH_NORMALIZED = normalizeScriptHash(GAS_HASH);

const activeTab = ref("create");
const navTabs = computed<NavTab[]>(() => [
  { id: "create", icon: "plus", label: t("createTab") },
  { id: "vaults", icon: "wallet", label: t("vaultsTab") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const form = reactive({
  name: "",
  beneficiary: "",
  asset: "GAS",
  total: "20",
  rate: "1",
  intervalDays: "30",
  notes: "",
});

const status = ref<{ msg: string; type: string } | null>(null);
const isLoading = ref(false);
const isRefreshing = ref(false);
const contractAddress = ref<string | null>(null);
const claimingId = ref<string | null>(null);
const cancellingId = ref<string | null>(null);

type StreamStatus = "active" | "completed" | "cancelled";

interface StreamItem {
  id: string;
  creator: string;
  beneficiary: string;
  asset: string;
  assetSymbol: "NEO" | "GAS";
  totalAmount: bigint;
  releasedAmount: bigint;
  remainingAmount: bigint;
  rateAmount: bigint;
  intervalSeconds: bigint;
  intervalDays: number;
  status: StreamStatus;
  claimable: bigint;
  title: string;
  notes: string;
}

const createdStreams = ref<StreamItem[]>([]);
const beneficiaryStreams = ref<StreamItem[]>([]);

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) {
    throw new Error(t("contractMissing"));
  }
  return contractAddress.value;
};

const setStatus = (msg: string, type: string) => {
  status.value = { msg, type };
  setTimeout(() => {
    if (status.value?.msg === msg) status.value = null;
  }, 4000);
};

const formatAmount = (assetSymbol: "NEO" | "GAS", amount: bigint) => {
  if (assetSymbol === "NEO") return amount.toString();
  return formatGas(amount, 4);
};

const statusLabel = (statusValue: StreamStatus) => {
  if (statusValue === "completed") return t("statusCompleted");
  if (statusValue === "cancelled") return t("statusCancelled");
  return t("statusActive");
};

const parseBigInt = (value: unknown) => {
  try {
    return BigInt(String(value ?? "0"));
  } catch {
    return 0n;
  }
};

const parseStream = (raw: any, id: string): StreamItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const asset = String(raw.asset || "");
  const assetNormalized = normalizeScriptHash(asset);
  const assetSymbol: "NEO" | "GAS" = assetNormalized === NEO_HASH_NORMALIZED ? "NEO" : "GAS";

  const totalAmount = parseBigInt(raw.totalAmount);
  const releasedAmount = parseBigInt(raw.releasedAmount);
  const remainingAmount = parseBigInt(raw.remainingAmount ?? totalAmount - releasedAmount);
  const rateAmount = parseBigInt(raw.rateAmount);
  const intervalSeconds = parseBigInt(raw.intervalSeconds);
  const intervalDays = Number(intervalSeconds / 86400n) || 0;
  const statusValue = String(raw.status || "active") as StreamStatus;

  return {
    id,
    creator: String(raw.creator || ""),
    beneficiary: String(raw.beneficiary || ""),
    asset,
    assetSymbol,
    totalAmount,
    releasedAmount,
    remainingAmount,
    rateAmount,
    intervalSeconds,
    intervalDays,
    status: statusValue,
    claimable: parseBigInt(raw.claimable),
    title: String(raw.title || ""),
    notes: String(raw.notes || ""),
  };
};

const fetchStreamDetails = async (streamId: string) => {
  const contract = await ensureContractAddress();
  const details = await invokeRead({
    contractAddress: contract,
      operation: "GetStreamDetails",
    args: [{ type: "Integer", value: streamId }],
  });
  const parsed = parseInvokeResult(details) as any;
  return parseStream(parsed, streamId);
};

const fetchStreamIds = async (operation: string, walletAddress: string) => {
  const contract = await ensureContractAddress();
  const result = await invokeRead({
    contractAddress: contract,
    operation,
    args: [
      { type: "Hash160", value: walletAddress },
      { type: "Integer", value: "0" },
      { type: "Integer", value: "20" },
    ],
  });
  const parsed = parseInvokeResult(result);
  if (!Array.isArray(parsed)) return [] as string[];
  return parsed
    .map((value) => String(value || ""))
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => String(value));
};

const refreshStreams = async () => {
  if (!address.value) return;
  if (isRefreshing.value) return;
  try {
    isRefreshing.value = true;
    const createdIds = await fetchStreamIds("getUserStreams", address.value);
    const beneficiaryIds = await fetchStreamIds("getBeneficiaryStreams", address.value);

    const created = await Promise.all(createdIds.map(fetchStreamDetails));
    const beneficiary = await Promise.all(beneficiaryIds.map(fetchStreamDetails));

    createdStreams.value = created.filter(Boolean) as StreamItem[];
    beneficiaryStreams.value = beneficiary.filter(Boolean) as StreamItem[];
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRefreshing.value = false;
  }
};

const connectWallet = async () => {
  try {
    await connect();
    if (address.value) {
      await refreshStreams();
    }
  } catch (e: any) {
    setStatus(e.message || t("walletNotConnected"), "error");
  }
};

const createVault = async () => {
  if (isLoading.value) return;
  if (!requireNeoChain(chainType, t)) return;

  const beneficiary = form.beneficiary.trim();
  if (!beneficiary || !addressToScriptHash(beneficiary)) {
    setStatus(t("invalidAddress"), "error");
    return;
  }

  const intervalDays = Number.parseInt(form.intervalDays, 10);
  if (!Number.isFinite(intervalDays) || intervalDays < 1 || intervalDays > 365) {
    setStatus(t("intervalInvalid"), "error");
    return;
  }

  const decimals = form.asset === "NEO" ? 0 : 8;
  const totalFixed = decimals === 8 ? toFixed8(form.total) : toFixedDecimals(form.total, 0);
  const rateFixed = decimals === 8 ? toFixed8(form.rate) : toFixedDecimals(form.rate, 0);

  const totalAmount = parseBigInt(totalFixed);
  const rateAmount = parseBigInt(rateFixed);

  if (totalAmount <= 0n || rateAmount <= 0n) {
    setStatus(t("invalidAmount"), "error");
    return;
  }
  if (rateAmount > totalAmount) {
    setStatus(t("rateTooHigh"), "error");
    return;
  }

  try {
    isLoading.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    const assetHash = form.asset === "NEO" ? NEO_HASH : GAS_HASH;
    const title = form.name.trim().slice(0, 60);
    const notes = form.notes.trim().slice(0, 240);

    await invokeContract({
      scriptHash: contract,
      operation: "CreateStream",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Hash160", value: beneficiary },
        { type: "Hash160", value: assetHash },
        { type: "Integer", value: totalFixed },
        { type: "Integer", value: rateFixed },
        { type: "Integer", value: String(intervalDays * 86400) },
        { type: "String", value: title },
        { type: "String", value: notes },
      ],
    });

    setStatus(t("vaultCreated"), "success");
    form.name = "";
    form.beneficiary = "";
    form.total = form.asset === "NEO" ? "10" : "20";
    form.rate = "1";
    form.intervalDays = "30";
    form.notes = "";

    await refreshStreams();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isLoading.value = false;
  }
};

const claimStream = async (stream: StreamItem) => {
  if (claimingId.value) return;
  if (!requireNeoChain(chainType, t)) return;
  try {
    claimingId.value = stream.id;
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "ClaimStream",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: stream.id },
      ],
    });
    await refreshStreams();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    claimingId.value = null;
  }
};

const cancelStream = async (stream: StreamItem) => {
  if (cancellingId.value) return;
  if (!requireNeoChain(chainType, t)) return;
  try {
    cancellingId.value = stream.id;
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "CancelStream",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: stream.id },
      ],
    });
    await refreshStreams();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    cancellingId.value = null;
  }
};

onMounted(() => {
  if (address.value) {
    refreshStreams();
  }
});

watch(activeTab, (next) => {
  if (next === "vaults" && address.value) {
    refreshStreams();
  }
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./stream-vault-theme.scss";

:global(page) {
  background: linear-gradient(135deg, var(--stream-bg-start) 0%, var(--stream-bg-end) 100%);
  color: var(--stream-text);
}

.app-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--stream-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.asset-toggle {
  display: flex;
  gap: 10px;
}

.tab-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vaults-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--stream-text);
}

.count-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.18);
  color: var(--stream-accent);
  font-size: 11px;
  font-weight: 700;
}

.vaults-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vault-card {
  background: var(--stream-card-bg);
  border: 1px solid var(--stream-card-border);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vault-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.vault-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--stream-text);
}

.vault-subtitle {
  display: block;
  font-size: 11px;
  color: var(--stream-muted);
  margin-top: 2px;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(56, 189, 248, 0.2);
  color: var(--stream-accent);
}

.status-pill.completed {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-pill.cancelled {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.vault-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.metric-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stream-muted);
}

.metric-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--stream-text);
}

.vault-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  color: var(--stream-muted);
}

.vault-actions {
  display: flex;
  gap: 10px;
}

.empty-state {
  margin-top: 10px;
}

.mt-6 {
  margin-top: 24px;
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
