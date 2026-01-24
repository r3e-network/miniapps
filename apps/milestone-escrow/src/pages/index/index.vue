<template>
  <AppLayout class="theme-milestone-escrow" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <view v-if="activeTab === 'create'" class="tab-content">
      <view v-if="chainType === 'evm'" class="mb-4">
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

      <NeoCard variant="erobo-neo">
        <view class="form-group">
          <NeoInput v-model="form.name" :label="t('escrowName')" :placeholder="t('escrowNamePlaceholder')" />
          <NeoInput v-model="form.beneficiary" :label="t('beneficiary')" :placeholder="t('beneficiaryPlaceholder')" />

          <view class="input-group">
            <text class="input-label">{{ t("assetType") }}</text>
            <view class="asset-toggle">
              <NeoButton size="sm" variant="primary" disabled>
                {{ t("assetGas") }}
              </NeoButton>
            </view>
          </view>

          <view class="milestone-section">
            <view class="milestone-header">
              <text class="section-title">{{ t("milestones") }}</text>
              <NeoButton size="sm" variant="secondary" :disabled="milestones.length >= 12" @click="addMilestone">
                {{ t("addMilestone") }}
              </NeoButton>
            </view>

            <view v-for="(milestone, index) in milestones" :key="`milestone-${index}`" class="milestone-row">
              <NeoInput
                v-model="milestone.amount"
                type="number"
                :label="`${t('milestoneAmount')} #${index + 1}`"
                :suffix="form.asset"
                placeholder="1.5"
              />
              <NeoButton
                size="sm"
                variant="secondary"
                class="milestone-remove"
                :disabled="milestones.length <= 1"
                @click="removeMilestone(index)"
              >
                {{ t("remove") }}
              </NeoButton>
            </view>
          </view>

          <view class="total-row">
            <text class="total-label">{{ t("totalAmount") }}</text>
            <text class="total-value">{{ totalDisplay }} {{ form.asset }}</text>
            <text class="total-hint">{{ t("totalHint") }}</text>
          </view>

          <NeoInput
            v-model="form.notes"
            type="textarea"
            :label="t('notes')"
            :placeholder="t('notesPlaceholder')"
          />

          <NeoButton
            variant="primary"
            size="lg"
            block
            :loading="isLoading"
            :disabled="isLoading"
            @click="createEscrow"
          >
            {{ isLoading ? t("creating") : t("createEscrow") }}
          </NeoButton>
        </view>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'escrows'" class="tab-content scrollable">
      <view class="escrows-header">
        <text class="section-title">{{ t("escrowsTab") }}</text>
        <NeoButton size="sm" variant="secondary" :loading="isRefreshing" @click="refreshEscrows">
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

      <view v-else class="escrow-list">
        <view class="section-header">
          <text class="section-label">{{ t("createdByYou") }}</text>
          <text class="count-badge">{{ creatorEscrows.length }}</text>
        </view>
        <view v-if="creatorEscrows.length === 0" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center opacity-70">
            <text class="text-xs">{{ t("emptyEscrows") }}</text>
          </NeoCard>
        </view>
        <view v-for="escrow in creatorEscrows" :key="`creator-${escrow.id}`" class="escrow-card">
          <view class="escrow-card__header">
            <view>
              <text class="escrow-title">{{ escrow.title || `#${escrow.id}` }}</text>
              <text class="escrow-subtitle">{{ formatAddress(escrow.beneficiary) }}</text>
            </view>
            <text :class="['status-pill', escrow.status]">{{ statusLabel(escrow.status) }}</text>
          </view>
          <view class="escrow-metrics">
            <view>
              <text class="metric-label">{{ t("totalAmount") }}</text>
              <text class="metric-value">{{ formatAmount(escrow.assetSymbol, escrow.totalAmount) }} {{ escrow.assetSymbol }}</text>
            </view>
            <view>
              <text class="metric-label">{{ t("claimed") }}</text>
              <text class="metric-value">{{ formatAmount(escrow.assetSymbol, escrow.releasedAmount) }} {{ escrow.assetSymbol }}</text>
            </view>
          </view>

          <view class="milestone-list">
            <view v-for="(amount, index) in escrow.milestoneAmounts" :key="`creator-${escrow.id}-${index}`" class="milestone-item">
              <view>
                <text class="milestone-label">#{{ index + 1 }}</text>
                <text class="milestone-amount">{{ formatAmount(escrow.assetSymbol, amount) }} {{ escrow.assetSymbol }}</text>
              </view>
              <view class="milestone-actions">
                <text class="milestone-status">
                  {{ escrow.milestoneClaimed[index] ? t("claimed") : escrow.milestoneApproved[index] ? t("approved") : t("pending") }}
                </text>
                <NeoButton
                  size="sm"
                  variant="secondary"
                  :loading="approvingId === `${escrow.id}-${index + 1}`"
                  :disabled="!escrow.active || escrow.milestoneApproved[index] || escrow.milestoneClaimed[index]"
                  @click="approveMilestone(escrow, index + 1)"
                >
                  {{ approvingId === `${escrow.id}-${index + 1}` ? t("approving") : t("approve") }}
                </NeoButton>
              </view>
            </view>
          </view>

          <view class="escrow-actions">
            <NeoButton
              size="sm"
              variant="secondary"
              :loading="cancellingId === escrow.id"
              :disabled="!escrow.active"
              @click="cancelEscrow(escrow)"
            >
              {{ cancellingId === escrow.id ? t("cancelling") : t("cancel") }}
            </NeoButton>
          </view>
        </view>

        <view class="section-header mt-6">
          <text class="section-label">{{ t("forYou") }}</text>
          <text class="count-badge">{{ beneficiaryEscrows.length }}</text>
        </view>
        <view v-if="beneficiaryEscrows.length === 0" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center opacity-70">
            <text class="text-xs">{{ t("emptyEscrows") }}</text>
          </NeoCard>
        </view>
        <view v-for="escrow in beneficiaryEscrows" :key="`beneficiary-${escrow.id}`" class="escrow-card">
          <view class="escrow-card__header">
            <view>
              <text class="escrow-title">{{ escrow.title || `#${escrow.id}` }}</text>
              <text class="escrow-subtitle">{{ formatAddress(escrow.creator) }}</text>
            </view>
            <text :class="['status-pill', escrow.status]">{{ statusLabel(escrow.status) }}</text>
          </view>
          <view class="milestone-list">
            <view v-for="(amount, index) in escrow.milestoneAmounts" :key="`beneficiary-${escrow.id}-${index}`" class="milestone-item">
              <view>
                <text class="milestone-label">#{{ index + 1 }}</text>
                <text class="milestone-amount">{{ formatAmount(escrow.assetSymbol, amount) }} {{ escrow.assetSymbol }}</text>
              </view>
              <view class="milestone-actions">
                <text class="milestone-status">
                  {{ escrow.milestoneClaimed[index] ? t("claimed") : escrow.milestoneApproved[index] ? t("approved") : t("pending") }}
                </text>
                <NeoButton
                  size="sm"
                  variant="primary"
                  :loading="claimingId === `${escrow.id}-${index + 1}`"
                  :disabled="!escrow.active || !escrow.milestoneApproved[index] || escrow.milestoneClaimed[index]"
                  @click="claimMilestone(escrow, index + 1)"
                >
                  {{ claimingId === `${escrow.id}-${index + 1}` ? t("claiming") : t("claim") }}
                </NeoButton>
              </view>
            </view>
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
          { name: t('feature3Name'), desc: t('feature3Desc') }
        ]"
      />
    </view>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import { useI18n } from "@/composables/useI18n";
import { AppLayout, NeoCard, NeoButton, NeoInput, NeoDoc } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import { requireNeoChain } from "@shared/utils/chain";
import { formatGas, formatAddress, toFixed8, toFixedDecimals } from "@shared/utils/format";
import { addressToScriptHash, normalizeScriptHash, parseInvokeResult } from "@shared/utils/neo";

const { t } = useI18n();
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress, switchToAppChain } = useWallet() as any;

const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";
const NEO_HASH_NORMALIZED = normalizeScriptHash(NEO_HASH);

const activeTab = ref("create");
const navTabs = computed<NavTab[]>(() => [
  { id: "create", icon: "plus", label: t("createTab") },
  { id: "escrows", icon: "file", label: t("escrowsTab") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const form = reactive({
  name: "",
  beneficiary: "",
  asset: "GAS",
  notes: "",
});

const milestones = ref<Array<{ amount: string }>>([
  { amount: "1" },
  { amount: "1" },
  { amount: "1" },
]);

const status = ref<{ msg: string; type: string } | null>(null);
const isLoading = ref(false);
const isRefreshing = ref(false);
const contractAddress = ref<string | null>(null);
const approvingId = ref<string | null>(null);
const claimingId = ref<string | null>(null);
const cancellingId = ref<string | null>(null);

interface EscrowItem {
  id: string;
  creator: string;
  beneficiary: string;
  assetSymbol: "NEO" | "GAS";
  totalAmount: bigint;
  releasedAmount: bigint;
  status: "active" | "completed" | "cancelled";
  milestoneAmounts: bigint[];
  milestoneApproved: boolean[];
  milestoneClaimed: boolean[];
  title: string;
  notes: string;
  active: boolean;
}

const creatorEscrows = ref<EscrowItem[]>([]);
const beneficiaryEscrows = ref<EscrowItem[]>([]);

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

const statusLabel = (statusValue: "active" | "completed" | "cancelled") => {
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

const parseBoolArray = (value: unknown, count: number) => {
  if (!Array.isArray(value)) return new Array(count).fill(false);
  return value.map((item) => item === true || item === "true" || item === 1 || item === "1");
};

const parseBigIntArray = (value: unknown, count: number) => {
  if (!Array.isArray(value)) return new Array(count).fill(0n);
  return value.map((item) => parseBigInt(item));
};

const parseEscrow = (raw: any, id: string): EscrowItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const asset = String(raw.asset || "");
  const assetNormalized = normalizeScriptHash(asset);
  const assetSymbol: "NEO" | "GAS" = assetNormalized === NEO_HASH_NORMALIZED ? "NEO" : "GAS";
  const milestoneCount = Number(raw.milestoneCount || 0);

  const milestoneAmounts = parseBigIntArray(raw.milestoneAmounts, milestoneCount);
  const milestoneApproved = parseBoolArray(raw.milestoneApproved, milestoneCount);
  const milestoneClaimed = parseBoolArray(raw.milestoneClaimed, milestoneCount);

  return {
    id,
    creator: String(raw.creator || ""),
    beneficiary: String(raw.beneficiary || ""),
    assetSymbol,
    totalAmount: parseBigInt(raw.totalAmount),
    releasedAmount: parseBigInt(raw.releasedAmount),
    status: String(raw.status || "active") as "active" | "completed" | "cancelled",
    milestoneAmounts,
    milestoneApproved,
    milestoneClaimed,
    title: String(raw.title || ""),
    notes: String(raw.notes || ""),
    active: Boolean(raw.active),
  };
};

const fetchEscrowDetails = async (escrowId: string) => {
  const contract = await ensureContractAddress();
  const details = await invokeRead({
    contractAddress: contract,
    operation: "getEscrowDetails",
    args: [{ type: "Integer", value: escrowId }],
  });
  const parsed = parseInvokeResult(details) as any;
  return parseEscrow(parsed, escrowId);
};

const fetchEscrowIds = async (operation: string, walletAddress: string) => {
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

const refreshEscrows = async () => {
  if (!address.value) return;
  if (isRefreshing.value) return;
  try {
    isRefreshing.value = true;
    const creatorIds = await fetchEscrowIds("getCreatorEscrows", address.value);
    const beneficiaryIds = await fetchEscrowIds("getBeneficiaryEscrows", address.value);

    const creator = await Promise.all(creatorIds.map(fetchEscrowDetails));
    const beneficiary = await Promise.all(beneficiaryIds.map(fetchEscrowDetails));

    creatorEscrows.value = creator.filter(Boolean) as EscrowItem[];
    beneficiaryEscrows.value = beneficiary.filter(Boolean) as EscrowItem[];
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
      await refreshEscrows();
    }
  } catch (e: any) {
    setStatus(e.message || t("walletNotConnected"), "error");
  }
};

const addMilestone = () => {
  if (milestones.value.length >= 12) return;
  milestones.value.push({ amount: form.asset === "NEO" ? "1" : "1" });
};

const removeMilestone = (index: number) => {
  if (milestones.value.length <= 1) return;
  milestones.value.splice(index, 1);
};

const totalFixed = computed(() => {
  const decimals = form.asset === "NEO" ? 0 : 8;
  let total = 0n;
  for (const milestone of milestones.value) {
    const raw = String(milestone.amount || "").trim();
    if (!raw) continue;
    const fixed = decimals === 8 ? toFixed8(raw) : toFixedDecimals(raw, 0);
    total += parseBigInt(fixed);
  }
  return total;
});

const totalDisplay = computed(() => {
  if (form.asset === "NEO") return totalFixed.value.toString();
  return formatGas(totalFixed.value, 4);
});

const createEscrow = async () => {
  if (isLoading.value) return;
  if (!requireNeoChain(chainType, t)) return;

  const beneficiary = form.beneficiary.trim();
  if (!beneficiary || !addressToScriptHash(beneficiary)) {
    setStatus(t("invalidAddress"), "error");
    return;
  }

  if (milestones.value.length < 1 || milestones.value.length > 12) {
    setStatus(t("milestoneLimit"), "error");
    return;
  }

  const decimals = form.asset === "NEO" ? 0 : 8;
  const milestoneValues: string[] = [];
  for (const milestone of milestones.value) {
    const raw = String(milestone.amount || "").trim();
    if (!raw) {
      setStatus(t("invalidAmount"), "error");
      return;
    }
    if (decimals === 0 && raw.includes(".")) {
      setStatus(t("invalidAmount"), "error");
      return;
    }
    const fixed = decimals === 8 ? toFixed8(raw) : toFixedDecimals(raw, 0);
    const amount = parseBigInt(fixed);
    if (amount <= 0n) {
      setStatus(t("invalidAmount"), "error");
      return;
    }
    milestoneValues.push(fixed);
  }

  const totalAmount = totalFixed.value;
  if (totalAmount <= 0n) {
    setStatus(t("invalidAmount"), "error");
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
      operation: "createEscrow",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Hash160", value: beneficiary },
        { type: "Hash160", value: assetHash },
        { type: "Integer", value: totalAmount.toString() },
        {
          type: "Array",
          value: milestoneValues.map((amount) => ({ type: "Integer", value: amount })),
        },
        { type: "String", value: title },
        { type: "String", value: notes },
      ],
    });

    setStatus(t("escrowCreated"), "success");
    form.name = "";
    form.beneficiary = "";
    form.notes = "";
    milestones.value = [{ amount: "1" }, { amount: "1" }, { amount: "1" }];

    await refreshEscrows();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isLoading.value = false;
  }
};

const approveMilestone = async (escrow: EscrowItem, milestoneIndex: number) => {
  if (approvingId.value) return;
  if (!requireNeoChain(chainType, t)) return;
  try {
    approvingId.value = `${escrow.id}-${milestoneIndex}`;
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "approveMilestone",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: escrow.id },
        { type: "Integer", value: String(milestoneIndex) },
      ],
    });
    await refreshEscrows();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    approvingId.value = null;
  }
};

const claimMilestone = async (escrow: EscrowItem, milestoneIndex: number) => {
  if (claimingId.value) return;
  if (!requireNeoChain(chainType, t)) return;
  try {
    claimingId.value = `${escrow.id}-${milestoneIndex}`;
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "claimMilestone",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: escrow.id },
        { type: "Integer", value: String(milestoneIndex) },
      ],
    });
    await refreshEscrows();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    claimingId.value = null;
  }
};

const cancelEscrow = async (escrow: EscrowItem) => {
  if (cancellingId.value) return;
  if (!requireNeoChain(chainType, t)) return;
  try {
    cancellingId.value = escrow.id;
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "cancelEscrow",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: escrow.id },
      ],
    });
    await refreshEscrows();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    cancellingId.value = null;
  }
};

onMounted(() => {
  if (address.value) {
    refreshEscrows();
  }
});

watch(activeTab, (next) => {
  if (next === "escrows" && address.value) {
    refreshEscrows();
  }
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./milestone-escrow-theme.scss";

:global(page) {
  background: linear-gradient(135deg, var(--escrow-bg-start) 0%, var(--escrow-bg-end) 100%);
  color: var(--escrow-text);
}

.tab-content {
  padding: 20px;
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
  color: var(--escrow-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.asset-toggle {
  display: flex;
  gap: 10px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.milestone-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.milestone-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.milestone-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.milestone-remove {
  align-self: flex-end;
}

.total-row {
  background: rgba(251, 191, 36, 0.12);
  border-radius: 16px;
  padding: 12px 16px;
}

.total-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--escrow-muted);
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--escrow-accent-strong);
}

.total-hint {
  display: block;
  font-size: 11px;
  margin-top: 4px;
  color: var(--escrow-muted);
}

.escrows-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

.count-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.2);
  color: var(--escrow-accent);
  font-size: 11px;
  font-weight: 700;
}

.escrow-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.escrow-card {
  background: var(--escrow-card-bg);
  border: 1px solid var(--escrow-card-border);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.escrow-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.escrow-title {
  font-size: 15px;
  font-weight: 700;
}

.escrow-subtitle {
  display: block;
  font-size: 11px;
  color: var(--escrow-muted);
  margin-top: 2px;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(245, 158, 11, 0.2);
  color: var(--escrow-accent);
}

.status-pill.completed {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-pill.cancelled {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.escrow-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.metric-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--escrow-muted);
}

.metric-value {
  font-size: 14px;
  font-weight: 700;
}

.milestone-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.milestone-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
}

.milestone-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--escrow-muted);
}

.milestone-amount {
  font-size: 13px;
  font-weight: 700;
}

.milestone-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.milestone-status {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--escrow-muted);
}

.escrow-actions {
  display: flex;
  gap: 10px;
}

.empty-state {
  margin-top: 10px;
}

.mt-6 {
  margin-top: 24px;
}
</style>
