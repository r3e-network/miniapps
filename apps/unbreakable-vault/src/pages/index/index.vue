<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-unbreakable-vault" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event"

      <!-- Desktop Sidebar -->
      <template #desktop-sidebar>
        <view class="desktop-sidebar">
          <text class="sidebar-title">{{ t('overview') }}</text>
        </view>
      </template>
>
    <!-- Chain Warning - Framework Component -->
    <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

    <view v-if="activeTab === 'create'" class="tab-content scrollable">
      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-3 text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <NeoCard variant="erobo-neo">
        <view class="form-group">
          <view class="input-group">
            <text class="input-label">{{ t("bountyLabel") }}</text>
            <NeoInput v-model="bounty" type="number" :placeholder="t('bountyPlaceholder')" suffix="GAS" />
            <text class="helper-text">{{ t("minBountyNote") }}</text>
          </view>

          <view class="input-group">
            <text class="input-label">{{ t("titleLabel") }}</text>
            <NeoInput v-model="vaultTitle" :placeholder="t('titlePlaceholder')" />
          </view>

          <view class="input-group">
            <text class="input-label">{{ t("descriptionLabel") }}</text>
            <NeoInput v-model="vaultDescription" :placeholder="t('descriptionPlaceholder')" type="textarea" />
          </view>

          <view class="input-group">
            <text class="input-label">{{ t("difficultyLabel") }}</text>
            <view class="difficulty-actions">
              <NeoButton
                size="sm"
                :variant="vaultDifficulty === 1 ? 'primary' : 'secondary'"
                @click="vaultDifficulty = 1"
              >
                {{ t("difficultyEasy") }}
              </NeoButton>
              <NeoButton
                size="sm"
                :variant="vaultDifficulty === 2 ? 'primary' : 'secondary'"
                @click="vaultDifficulty = 2"
              >
                {{ t("difficultyMedium") }}
              </NeoButton>
              <NeoButton
                size="sm"
                :variant="vaultDifficulty === 3 ? 'primary' : 'secondary'"
                @click="vaultDifficulty = 3"
              >
                {{ t("difficultyHard") }}
              </NeoButton>
            </view>
          </view>

          <view class="input-group">
            <text class="input-label">{{ t("secretLabel") }}</text>
            <NeoInput v-model="secret" :placeholder="t('secretPlaceholder')" />
          </view>

          <view class="input-group">
            <text class="input-label">{{ t("confirmSecretLabel") }}</text>
            <NeoInput v-model="secretConfirm" :placeholder="t('confirmSecretPlaceholder')" />
            <text v-if="secretMismatch" class="helper-text text-danger">{{ t("secretMismatch") }}</text>
          </view>

          <view v-if="secretHash" class="hash-preview">
            <text class="hash-label">{{ t("hashPreview") }}</text>
            <text class="hash-value">{{ secretHash }}</text>
          </view>

          <NeoButton
            variant="primary"
            size="lg"
            block
            :loading="isLoading"
            :disabled="!canCreate || isLoading"
            @click="createVault"
          >
            {{ isLoading ? t("creating") : t("createVault") }}
          </NeoButton>

          <text class="helper-text">{{ t("secretNote") }}</text>
        </view>
      </NeoCard>

      <NeoCard v-if="createdVaultId" variant="erobo" class="vault-created">
        <text class="vault-created-label">{{ t("vaultCreated") }}</text>
        <text class="vault-created-id">#{{ createdVaultId }}</text>
      </NeoCard>

      <NeoCard v-if="myVaults.length > 0" variant="erobo" class="recent-vaults mt-4">
        <text class="section-title">{{ t("myVaults") }}</text>
        <view class="vault-list">
          <view v-for="vault in myVaults" :key="vault.id" class="vault-item" @click="selectVault(vault.id)">
            <view class="vault-meta">
              <text class="vault-id">#{{ vault.id }}</text>
              <text class="vault-bounty">{{ formatGas(vault.bounty) }} GAS</text>
            </view>
            <text class="vault-creator text-xs opacity-50">{{ new Date(vault.created).toLocaleDateString() }}</text>
          </view>
        </view>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'break'" class="tab-content scrollable">
      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-3 text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <NeoCard variant="erobo-neo">
        <view class="form-group">
          <view class="input-group">
            <text class="input-label">{{ t("vaultIdLabel") }}</text>
            <NeoInput v-model="vaultIdInput" type="number" :placeholder="t('vaultIdPlaceholder')" />
          </view>

          <NeoButton variant="secondary" block :loading="isLoading" @click="loadVault">
            {{ t("loadVault") }}
          </NeoButton>

          <view class="input-group">
            <text class="input-label">{{ t("secretAttemptLabel") }}</text>
            <NeoInput v-model="attemptSecret" :placeholder="t('secretAttemptPlaceholder')" />
          </view>

          <text class="helper-text">{{ t("attemptFeeNote").replace("{fee}", attemptFeeDisplay) }}</text>

          <NeoButton
            variant="primary"
            size="lg"
            block
            :loading="isLoading"
            :disabled="!canAttempt || isLoading"
            @click="attemptBreak"
          >
            {{ isLoading ? t("attempting") : t("attemptBreak") }}
          </NeoButton>
        </view>
      </NeoCard>

      <NeoCard v-if="vaultDetails" variant="erobo" class="vault-details">
        <view class="vault-detail-row">
          <text class="detail-label">{{ t("vaultStatus") }}</text>
          <text class="detail-value">{{ statusLabel(vaultDetails.status) }}</text>
        </view>
        <view class="vault-detail-row">
          <text class="detail-label">{{ t("difficultyLabel") }}</text>
          <text class="detail-value">{{ vaultDetails.difficultyName }}</text>
        </view>
        <view class="vault-detail-row">
          <text class="detail-label">{{ t("creator") }}</text>
          <text class="detail-value mono">{{ formatAddress(vaultDetails.creator) }}</text>
        </view>
        <view class="vault-detail-row">
          <text class="detail-label">{{ t("bountyLabel") }}</text>
          <text class="detail-value">{{ formatGas(vaultDetails.bounty) }} GAS</text>
        </view>
        <view class="vault-detail-row">
          <text class="detail-label">{{ t("expiryLabel") }}</text>
          <text class="detail-value">{{ formatExpiryDate(vaultDetails.expiryTime) }}</text>
        </view>
        <view class="vault-detail-row" v-if="vaultDetails.status === 'active'">
          <text class="detail-label">{{ t("remainingDaysLabel") }}</text>
          <text class="detail-value">{{ vaultDetails.remainingDays }}</text>
        </view>
        <view class="vault-detail-row">
          <text class="detail-label">{{ t("attempts") }}</text>
          <text class="detail-value">{{ vaultDetails.attempts }}</text>
        </view>
        <view class="vault-detail-row" v-if="vaultDetails.broken">
          <text class="detail-label">{{ t("winner") }}</text>
          <text class="detail-value mono">{{ formatAddress(vaultDetails.winner) }}</text>
        </view>
      </NeoCard>

      <NeoCard variant="erobo" class="recent-vaults">
        <text class="section-title">{{ t("recentVaults") }}</text>
        <view v-if="recentVaults.length === 0" class="empty-state">
          <text class="empty-text">{{ t("noRecentVaults") }}</text>
        </view>
        <view v-else class="vault-list">
          <view v-for="vault in recentVaults" :key="vault.id" class="vault-item" @click="selectVault(vault.id)">
            <view class="vault-meta">
              <text class="vault-id">#{{ vault.id }}</text>
              <text class="vault-bounty">{{ formatGas(vault.bounty) }} GAS</text>
            </view>
            <text class="vault-creator mono">{{ formatAddress(vault.creator) }}</text>
          </view>
        </view>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'docs'" class="tab-content scrollable">
      <NeoDoc
        :title="t('title')"
        :subtitle="t('docSubtitle')"
        :description="t('docDescription')"
        :steps="docSteps"
        :features="docFeatures"
      />
    </view>
  </ResponsiveLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useWallet, useEvents } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { useI18n } from "@/composables/useI18n";
import { sha256Hex } from "@shared/utils/hash";
import { normalizeScriptHash, parseInvokeResult, parseStackItem, addressToScriptHash } from "@shared/utils/neo";
import { bytesToHex, formatAddress, formatGas, toFixed8 } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { ResponsiveLayout, NeoDoc, NeoButton, NeoInput, NeoCard, ChainWarning } from "@shared/components";
import { usePaymentFlow } from "@shared/composables/usePaymentFlow";

const { t } = useI18n();

const APP_ID = "miniapp-unbreakablevault";
const MIN_BOUNTY = 1;
const ATTEMPT_FEE = 0.1;

const { address, connect, chainType, invokeContract, invokeRead, getContractAddress } = useWallet() as WalletSDK;
const { processPayment, isLoading } = usePaymentFlow(APP_ID);
const { list: listEvents } = useEvents();

const activeTab = ref("create");
const navTabs = computed(() => [
  { id: "create", icon: "lock", label: t("create") },
  { id: "break", icon: "key", label: t("break") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const status = ref<{ msg: string; type: "success" | "error" } | null>(null);

const bounty = ref("");
const vaultTitle = ref("");
const vaultDescription = ref("");
const vaultDifficulty = ref(1);
const secret = ref("");
const secretConfirm = ref("");
const secretHash = ref("");
const createdVaultId = ref<string | null>(null);

const vaultIdInput = ref("");
const attemptSecret = ref("");
const vaultDetails = ref<{
  id: string;
  creator: string;
  bounty: number;
  attempts: number;
  broken: boolean;
  expired: boolean;
  status: string;
  winner: string;
  attemptFee: number;
  difficultyName: string;
  expiryTime: number;
  remainingDays: number;
} | null>(null);

const recentVaults = ref<{ id: string; creator: string; bounty: number }[]>([]);
const myVaults = ref<{ id: string; bounty: number; created: number }[]>([]);

const secretMismatch = computed(() => {
  if (!secretConfirm.value) return false;
  return secret.value !== secretConfirm.value;
});

const canCreate = computed(() => {
  const amount = Number.parseFloat(bounty.value);
  return amount >= MIN_BOUNTY && vaultTitle.value.trim() && secret.value.trim() && !secretMismatch.value;
});

const canAttempt = computed(() => {
  const status = vaultDetails.value?.status;
  return Boolean(
    vaultIdInput.value &&
    attemptSecret.value.trim() &&
    vaultDetails.value &&
    String(vaultDetails.value.id) === String(vaultIdInput.value) &&
    status === "active",
  );
});

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const attemptFeeDisplay = computed(() => {
  const fallback = toFixed8(ATTEMPT_FEE);
  const fee = vaultDetails.value?.attemptFee ?? fallback;
  return formatGas(fee);
});

const statusLabel = (status: string) => {
  if (status === "broken") return t("broken");
  if (status === "expired") return t("expired");
  if (status === "claimable") return t("claimable");
  return t("active");
};

const formatExpiryDate = (expiryTime: number) => {
  if (!expiryTime) return "-";
  return new Date(expiryTime * 1000).toLocaleDateString();
};
const toHex = (value: string) => {
  if (!value) return "";
  if (typeof TextEncoder === "undefined") {
    return Array.from(value)
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");
  }
  return bytesToHex(new TextEncoder().encode(value));
};

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  const contract = await getContractAddress();
  if (!contract) throw new Error(t("contractUnavailable"));
  return contract;
};

const loadRecentVaults = async () => {
  try {
    const res = await listEvents({ app_id: APP_ID, event_name: "VaultCreated", limit: 12 });
    const vaults = res.events
      .map((evt: any) => {
        const values = Array.isArray(evt?.state) ? evt.state.map(parseStackItem) : [];
        const id = String(values[0] ?? "");
        const creator = String(values[1] ?? "");
        const bountyValue = Number(values[2] ?? 0);
        if (!id) return null;
        return { id, creator, bounty: bountyValue };
      })
      .filter(Boolean) as { id: string; creator: string; bounty: number }[];
    recentVaults.value = vaults;
  } catch {}
};

const loadMyVaults = async () => {
  if (!address.value) {
    myVaults.value = [];
    return;
  }
  try {
    const res = await listEvents({ app_id: APP_ID, event_name: "VaultCreated", limit: 50 });
    const myHash = normalizeScriptHash(addressToScriptHash(address.value));

    const vaults = res.events
      .map((evt: any) => {
        const values = Array.isArray(evt?.state) ? evt.state.map(parseStackItem) : [];
        const id = String(values[0] ?? "");
        const creator = String(values[1] ?? "");
        const bountyValue = Number(values[2] ?? 0);

        const creatorHash = normalizeScriptHash(addressToScriptHash(creator));

        if (!id || creatorHash !== myHash) return null;

        return {
          id,
          bounty: bountyValue,
          created: evt.created_at ? new Date(evt.created_at).getTime() : Date.now(),
        };
      })
      .filter(Boolean) as { id: string; bounty: number; created: number }[];

    myVaults.value = vaults.sort((a, b) => b.created - a.created);
  } catch {}
};

const createVault = async () => {
  if (!canCreate.value || isLoading.value) return;
  status.value = null;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) throw new Error(t("connectWallet"));
    const contract = await ensureContractAddress();

    const amount = Number.parseFloat(bounty.value);
    const bountyInt = toFixed8(amount);
    const hash = secretHash.value || (await sha256Hex(secret.value));

    const { receiptId, invoke } = await processPayment(String(amount), `vault:create:${hash.slice(0, 10)}`);
    if (!receiptId) throw new Error(t("receiptMissing"));

    const res = await invoke(
      "createVault",
      [
        { type: "Hash160", value: address.value as string },
        { type: "ByteArray", value: hash },
        { type: "Integer", value: bountyInt },
        { type: "Integer", value: String(vaultDifficulty.value) },
        { type: "String", value: vaultTitle.value.trim().slice(0, 100) },
        { type: "String", value: vaultDescription.value.trim().slice(0, 300) },
        { type: "Integer", value: String(receiptId) },
      ],
      contract,
    );

    const vaultId = String((res as any)?.result || (res as any)?.stack?.[0]?.value || "");
    createdVaultId.value = vaultId || createdVaultId.value;
    status.value = { msg: t("vaultCreated"), type: "success" };
    bounty.value = "";
    vaultTitle.value = "";
    vaultDescription.value = "";
    vaultDifficulty.value = 1;
    secret.value = "";
    secretConfirm.value = "";
    await loadRecentVaults();
    await loadMyVaults();
  } catch (e: any) {
    status.value = { msg: e?.message || t("vaultCreateFailed"), type: "error" };
  }
};

const loadVault = async () => {
  if (!vaultIdInput.value) return;
  status.value = null;
  try {
    const contract = await ensureContractAddress();
    const res = await invokeRead({
      contractAddress: contract,
      operation: "GetVaultDetails",
      args: [{ type: "Integer", value: vaultIdInput.value }],
    });
    const parsed = parseInvokeResult(res);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(t("vaultNotFound"));
    }
    const data = parsed as Record<string, unknown>;
    const creator = String(data.creator || "");
    const creatorHash = normalizeScriptHash(creator);
    if (!creatorHash || /^0+$/.test(creatorHash)) {
      throw new Error(t("vaultNotFound"));
    }
    const status = String(data.status || "");
    const expired = Boolean(data.expired);
    const broken = Boolean(data.broken);
    const resolvedStatus = status || (broken ? "broken" : expired ? "expired" : "active");
    vaultDetails.value = {
      id: vaultIdInput.value,
      creator,
      bounty: toNumber(data.bounty),
      attempts: toNumber(data.attemptCount),
      broken,
      expired,
      status: resolvedStatus,
      winner: String(data.winner || ""),
      attemptFee: toNumber(data.attemptFee),
      difficultyName: String(data.difficultyName || ""),
      expiryTime: toNumber(data.expiryTime),
      remainingDays: toNumber(data.remainingDays),
    };
  } catch (e: any) {
    status.value = { msg: e?.message || t("loadFailed"), type: "error" };
    vaultDetails.value = null;
  }
};

const attemptBreak = async () => {
  if (!canAttempt.value || isLoading.value) return;
  status.value = null;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) throw new Error(t("connectWallet"));
    const contract = await ensureContractAddress();

    const feeBase = vaultDetails.value?.attemptFee ?? toFixed8(ATTEMPT_FEE);
    const { receiptId, invoke } = await processPayment(formatGas(feeBase), `vault:attempt:${vaultIdInput.value}`);
    if (!receiptId) throw new Error(t("receiptMissing"));

    const res = await invoke(
      "attemptBreak",
      [
        { type: "Integer", value: vaultIdInput.value },
        { type: "Hash160", value: address.value as string },
        { type: "ByteArray", value: toHex(attemptSecret.value) },
        { type: "Integer", value: String(receiptId) },
      ],
      contract,
    );

    const success = Boolean((res as any)?.stack?.[0]?.value ?? (res as any)?.result);
    status.value = {
      msg: success ? t("broken") : t("vaultAttemptFailed"),
      type: success ? "success" : "error",
    };

    attemptSecret.value = "";
    await loadVault();
    await loadRecentVaults();
  } catch (e: any) {
    status.value = { msg: e?.message || t("vaultAttemptFailed"), type: "error" };
  }
};

const selectVault = (id: string) => {
  vaultIdInput.value = id;
  loadVault();
};

watch(secret, async (value) => {
  secretHash.value = value ? await sha256Hex(value) : "";
});

onMounted(() => {
  loadRecentVaults();
  loadMyVaults();
});

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

@import "./unbreakable-vault-theme.scss";

:global(page) {
  background: var(--bg-primary);
  font-family: var(--vault-font);
}

.app-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  gap: 16px;
  background-color: var(--vault-bg);
  font-family: var(--vault-font);
  /* Brushed Metal Texture */
  background-image:
    linear-gradient(90deg, var(--vault-metal-light) 0%, transparent 100%),
    repeating-linear-gradient(
      45deg,
      var(--vault-metal-dark) 0px,
      var(--vault-metal-dark) 1px,
      transparent 1px,
      transparent 10px
    );
}

.tab-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Safe Component Overrides (Neumorphism) */
:deep(.neo-card) {
  background: var(--vault-bg) !important;
  border-radius: 20px !important;
  box-shadow:
    9px 9px 16px var(--vault-shadow-dark),
    -9px -9px 16px var(--vault-shadow-light) !important;
  color: var(--vault-text) !important;
  border: none !important;
  padding: 24px !important;

  &.variant-danger {
    background: var(--vault-danger-bg) !important;
    box-shadow:
      5px 5px 10px var(--vault-danger-shadow-dark),
      -5px -5px 10px var(--vault-danger-shadow-light) !important;
    color: var(--vault-danger-text) !important;
  }
}

:deep(.neo-card.variant-danger .text-white) {
  color: var(--vault-danger-text) !important;
}

:deep(.neo-button) {
  border-radius: 50px !important;
  font-weight: 700 !important;
  letter-spacing: 0.05em;
  color: var(--vault-text) !important;
  transition: all 0.2s ease;

  &.variant-primary {
    background: var(--vault-button-bg);
    box-shadow:
      5px 5px 10px var(--vault-shadow-dark),
      -5px -5px 10px var(--vault-shadow-light) !important;
    border: none !important;
    color: var(--vault-button-text) !important;

    &:active {
      box-shadow:
        inset 5px 5px 10px var(--vault-shadow-dark),
        inset -5px -5px 10px var(--vault-shadow-light) !important;
    }
  }

  &.variant-secondary {
    background: var(--vault-bg) !important;
    box-shadow:
      5px 5px 10px var(--vault-shadow-dark),
      -5px -5px 10px var(--vault-shadow-light) !important;
    border: none !important;

    &:active {
      box-shadow:
        inset 5px 5px 10px var(--vault-shadow-dark),
        inset -5px -5px 10px var(--vault-shadow-light) !important;
    }
  }
}

:deep(input),
:deep(.neo-input) {
  background: var(--vault-bg) !important;
  border-radius: 12px !important;
  box-shadow:
    inset 5px 5px 10px var(--vault-shadow-dark),
    inset -5px -5px 10px var(--vault-shadow-light) !important;
  border: none !important;
  color: var(--vault-text-strong) !important;
  padding: 12px 16px !important;

  &:focus {
    box-shadow:
      inset 2px 2px 5px var(--vault-shadow-dark),
      inset -2px -2px 5px var(--vault-shadow-light) !important;
    color: var(--vault-text-strong) !important;
  }
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.difficulty-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
/* Override buttons in difficulty to look like toggles */
.difficulty-actions :deep(.neo-button) {
  flex: 1;
  min-width: 80px;
}

.input-label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--vault-text-muted);
  margin-left: 4px;
  letter-spacing: 0.05em;
}

.helper-text {
  font-size: 12px;
  color: var(--vault-text-subtle);
  margin-left: 8px;
  margin-top: 4px;
}

.hash-preview {
  padding: 16px;
  border-radius: 12px;
  background: var(--vault-bg);
  box-shadow:
    inset 3px 3px 7px var(--vault-shadow-dark),
    inset -3px -3px 7px var(--vault-shadow-light);
}

.hash-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 6px;
  color: var(--vault-text-muted);
}

.hash-value {
  font-family: "Fira Code", monospace;
  font-size: 12px;
  word-break: break-all;
  color: var(--vault-text);
}

.vault-created {
  text-align: center;
}
.vault-created-label {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--vault-text-muted);
}
.vault-created-id {
  font-size: 32px;
  font-weight: 800;
  color: var(--vault-text-strong);
  margin-top: 8px;
}

.vault-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.vault-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--vault-divider);
  padding-bottom: 8px;
}
.vault-detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--vault-text-muted);
}
.detail-value {
  font-weight: 700;
  font-size: 14px;
  color: var(--vault-text-strong);
}

.mono {
  font-family: "Fira Code", monospace;
}

.recent-vaults {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--vault-text);
  margin-bottom: 8px;
}

.vault-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vault-item {
  padding: 16px;
  border-radius: 16px;
  background: var(--vault-bg);
  box-shadow:
    5px 5px 10px var(--vault-shadow-dark),
    -5px -5px 10px var(--vault-shadow-light);
  cursor: pointer;
  transition: transform 0.1s;

  &:active {
    box-shadow:
      inset 3px 3px 7px var(--vault-shadow-dark),
      inset -3px -3px 7px var(--vault-shadow-light);
    transform: scale(0.99);
  }
}

.vault-meta {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
}
.vault-id {
  font-size: 14px;
  color: var(--vault-text-strong);
}
.vault-bounty {
  font-size: 14px;
  color: var(--vault-accent);
}
.vault-creator {
  font-size: 12px;
  color: var(--vault-text-subtle);
  margin-top: 6px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  opacity: 0.5;
}
.empty-text {
  font-size: 13px;
  font-style: italic;
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
