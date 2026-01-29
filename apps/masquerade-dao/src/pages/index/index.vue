<template>
  <ResponsiveLayout :desktop-breakpoint="1024" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <view class="theme-masquerade">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <view class="app-container">
        <view v-if="status" :class="['status-msg', status.type]">
          <text>{{ status.msg }}</text>
        </view>

        <view v-if="activeTab === 'identity'" class="tab-content">
          <NeoCard variant="erobo-neo">
            <view class="form-group">
              <view class="input-group">
                <text class="input-label">{{ t("identitySeed") }}</text>
                <NeoInput v-model="identitySeed" :placeholder="t('identityPlaceholder')" />
              </view>
              <view class="input-group">
                <text class="input-label">{{ t("maskTypeLabel") }}</text>
                <view class="mask-type-actions">
                  <NeoButton size="sm" :variant="maskType === 1 ? 'primary' : 'secondary'" @click="maskType = 1">
                    {{ t("maskTypeBasic") }}
                  </NeoButton>
                  <NeoButton size="sm" :variant="maskType === 2 ? 'primary' : 'secondary'" @click="maskType = 2">
                    {{ t("maskTypeCipher") }}
                  </NeoButton>
                  <NeoButton size="sm" :variant="maskType === 3 ? 'primary' : 'secondary'" @click="maskType = 3">
                    {{ t("maskTypePhantom") }}
                  </NeoButton>
                </view>
              </view>

              <view v-if="identityHash" class="hash-preview">
                <text class="hash-label">{{ t("hashPreview") }}</text>
                <text class="hash-value">{{ identityHash }}</text>
              </view>

              <NeoButton
                variant="primary"
                block
                :loading="isLoading"
                :disabled="!canCreateMask || isLoading"
                @click="createMask"
              >
                {{ isLoading ? t("creatingMask") : t("createNewMask") }}
              </NeoButton>
              <text class="helper-text">{{ t("maskFeeNote") }}</text>
            </view>
          </NeoCard>

          <NeoCard variant="erobo">
            <text class="section-title">{{ t("yourMasks") }}</text>
            <view v-if="masks.length === 0" class="empty-state">
              <text class="empty-text">{{ t("noMasks") }}</text>
            </view>
            <view v-else class="mask-list">
              <view
                v-for="mask in masks"
                :key="mask.id"
                :class="['mask-item', selectedMaskId === mask.id && 'active']"
                @click="selectedMaskId = mask.id"
              >
                <view class="mask-header">
                  <text class="mask-id">#{{ mask.id }}</text>
                  <text :class="['mask-status', mask.active ? 'active' : 'inactive']">
                    {{ mask.active ? t("active") : t("inactive") }}
                  </text>
                </view>
                <text class="mask-hash mono">{{ mask.identityHash }}</text>
                <text class="mask-time">{{ mask.createdAt }}</text>
              </view>
            </view>
          </NeoCard>
        </view>

        <view v-if="activeTab === 'vote'" class="tab-content">
          <NeoCard variant="erobo-neo">
            <view class="form-group">
              <view class="input-group">
                <text class="input-label">{{ t("proposalId") }}</text>
                <NeoInput v-model="proposalId" type="number" :placeholder="t('proposalPlaceholder')" />
              </view>

              <view class="input-group">
                <text class="input-label">{{ t("selectMask") }}</text>
                <view class="mask-picker">
                  <view
                    v-for="mask in masks"
                    :key="mask.id"
                    :class="['mask-chip', selectedMaskId === mask.id && 'active']"
                    @click="selectedMaskId = mask.id"
                  >
                    #{{ mask.id }}
                  </view>
                </view>
              </view>

              <view class="vote-actions">
                <NeoButton variant="primary" size="lg" :disabled="!canVote" @click="submitVote(1)">
                  {{ t("for") }}
                </NeoButton>
                <NeoButton variant="danger" size="lg" :disabled="!canVote" @click="submitVote(2)">
                  {{ t("against") }}
                </NeoButton>
                <NeoButton variant="secondary" size="lg" :disabled="!canVote" @click="submitVote(3)">
                  {{ t("abstain") }}
                </NeoButton>
              </view>
            </view>
          </NeoCard>
        </view>
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
    </view>
  </ResponsiveLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useWallet, useEvents } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { useI18n } from "@/composables/useI18n";
import { sha256Hex } from "@shared/utils/hash";
import { addressToScriptHash, normalizeScriptHash, parseInvokeResult, parseStackItem } from "@shared/utils/neo";
import { requireNeoChain } from "@shared/utils/chain";
import { ResponsiveLayout, NeoDoc, NeoButton, NeoCard, NeoInput, ChainWarning } from "@shared/components";
import { usePaymentFlow } from "@shared/composables/usePaymentFlow";

const { t } = useI18n();
const APP_ID = "miniapp-masqueradedao";
const MASK_FEE = 0.1;
const VOTE_FEE = 0.01;

const { address, connect, chainType, invokeContract, invokeRead, getContractAddress } = useWallet() as WalletSDK;
const { processPayment, isLoading } = usePaymentFlow(APP_ID);
const { list: listEvents } = useEvents();

const activeTab = ref("identity");
const navTabs = computed(() => [
  { id: "identity", label: t("identity"), icon: "👤" },
  { id: "vote", label: t("vote"), icon: "🗳️" },
  { id: "docs", icon: "book", label: t("docs") },
]);

const identitySeed = ref("");
const identityHash = ref("");
const maskType = ref(1);
const proposalId = ref("");
const selectedMaskId = ref<string | null>(null);
const status = ref<{ msg: string; type: "success" | "error" } | null>(null);

const masks = ref<{ id: string; identityHash: string; active: boolean; createdAt: string }[]>([]);

const canCreateMask = computed(() => Boolean(identitySeed.value.trim()));
const canVote = computed(() => Boolean(proposalId.value && selectedMaskId.value));

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
]);

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  const contract = await getContractAddress();
  if (!contract) throw new Error(t("contractUnavailable"));
  return contract;
};

const ownerMatches = (value: unknown) => {
  if (!address.value) return false;
  const val = String(value || "");
  if (val === address.value) return true;
  const normalized = normalizeScriptHash(val);
  const addrHash = addressToScriptHash(address.value);
  return Boolean(normalized && addrHash && normalized === addrHash);
};

const loadMasks = async () => {
  if (!address.value) return;
  try {
    const contract = await ensureContractAddress();
    const events = await listEvents({ app_id: APP_ID, event_name: "MaskCreated", limit: 50 });
    const owned = events.events
      .map((evt) => {
        const values = Array.isArray((evt as any)?.state) ? (evt as any).state.map(parseStackItem) : [];
        const id = String(values[0] ?? "");
        const owner = values[1];
        if (!id || !ownerMatches(owner)) return null;
        return { id, createdAt: evt.created_at };
      })
      .filter(Boolean) as { id: string; createdAt?: string }[];

    const details = await Promise.all(
      owned.map(async (mask) => {
        const res = await invokeRead({
          contractAddress: contract,
          operation: "getMask",
          args: [{ type: "Integer", value: mask.id }],
        });
        const parsed = parseInvokeResult(res);
        const values = Array.isArray(parsed) ? parsed : [];
        const owner = String(values[0] ?? "");
        const identity = String(values[1] ?? "");
        const createdAt = mask.createdAt ? new Date(mask.createdAt).toLocaleString() : "--";
        const active = Boolean(values[9]);
        if (!owner || /^0+$/.test(normalizeScriptHash(owner))) return null;
        return { id: mask.id, identityHash: identity, active, createdAt };
      }),
    );

    masks.value = details.filter(Boolean) as typeof masks.value;
    if (!selectedMaskId.value && masks.value.length > 0) {
      selectedMaskId.value = masks.value[0].id;
    }
  } catch {}
};

const createMask = async () => {
  if (!canCreateMask.value || isLoading.value) return;
  status.value = null;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) throw new Error(t("connectWallet"));
    const contract = await ensureContractAddress();
    const hash = identityHash.value || (await sha256Hex(identitySeed.value));
    const { receiptId, invoke } = await processPayment(String(MASK_FEE), `mask:create:${hash.slice(0, 8)}`);
    if (!receiptId) throw new Error(t("receiptMissing"));

    await invoke(
      "createMask",
      [
        { type: "Hash160", value: address.value as string },
        { type: "ByteArray", value: hash },
        { type: "Integer", value: String(maskType.value) },
        { type: "Integer", value: String(receiptId) },
      ],
      contract,
    );

    status.value = { msg: t("maskCreated"), type: "success" };
    identitySeed.value = "";
    identityHash.value = "";
    await loadMasks();
  } catch (e: any) {
    status.value = { msg: e?.message || t("error"), type: "error" };
  }
};

const submitVote = async (choice: number) => {
  if (!canVote.value) return;
  status.value = null;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) throw new Error(t("connectWallet"));
    if (!selectedMaskId.value) throw new Error(t("selectMaskFirst"));
    const contract = await ensureContractAddress();
    const { receiptId, invoke } = await processPayment(String(VOTE_FEE), `vote:${proposalId.value}`);
    if (!receiptId) throw new Error(t("receiptMissing"));
    await invoke(
      "submitVote",
      [
        { type: "Integer", value: proposalId.value },
        { type: "Integer", value: selectedMaskId.value },
        { type: "Integer", value: String(choice) },
        { type: "Integer", value: String(receiptId) },
      ],
      contract,
    );
    status.value = { msg: t("voteCast"), type: "success" };
  } catch (e: any) {
    status.value = { msg: e?.message || t("error"), type: "error" };
  }
};

watch(identitySeed, async (value) => {
  identityHash.value = value ? await sha256Hex(value) : "";
});

watch(address, (value) => {
  if (value) {
    loadMasks();
  }
});

onMounted(() => {
  loadMasks();
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./masquerade-dao-theme.scss";

:global(page) {
  background: var(--bg-primary);
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  background-color: var(--mask-bg);
  /* Velvet Pattern */
  background-image:
    radial-gradient(circle at 50% 0%, var(--mask-glow), transparent 70%),
    linear-gradient(0deg, var(--mask-overlay), transparent 50%),
    radial-gradient(circle at 1px 1px, var(--mask-dot) 1px, transparent 0);
  background-size:
    auto,
    auto,
    20px 20px;
}

.tab-content {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Mask Component Overrides */
.theme-masquerade :deep(.neo-card) {
  background: var(--mask-card) !important;
  border: 1px solid var(--mask-card-border) !important;
  border-radius: 16px !important;
  box-shadow: var(--mask-card-shadow) !important;
  backdrop-filter: blur(12px);
  color: var(--mask-text) !important;

  /* Gold Trim */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--mask-gold), transparent);
    opacity: 0.3;
  }
}

.theme-masquerade :deep(.neo-button) {
  border-radius: 8px !important;
  font-family: "Cinzel", serif !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700 !important;

  &.variant-primary {
    background: linear-gradient(135deg, var(--mask-purple), var(--mask-velvet)) !important;
    border: 1px solid var(--mask-purple) !important;
    box-shadow: var(--mask-button-shadow) !important;
    color: var(--mask-button-text) !important;

    &:active {
      transform: scale(0.98);
      box-shadow: var(--mask-button-shadow-press) !important;
    }
  }

  &.variant-secondary {
    background: var(--mask-button-secondary-bg) !important;
    border: 1px solid var(--mask-button-secondary-border) !important;
    color: var(--mask-button-secondary-text) !important;
  }

  &.variant-danger {
    background: var(--mask-danger-bg) !important;
    border: 1px solid var(--mask-danger-border) !important;
    color: var(--mask-danger-text) !important;
  }
}

.theme-masquerade :deep(input),
.theme-masquerade :deep(.neo-input) {
  background: var(--mask-input-bg) !important;
  border: 1px solid var(--mask-input-border) !important;
  color: var(--mask-input-text) !important;
  border-radius: 8px !important;

  &:focus {
    border-color: var(--mask-purple) !important;
    box-shadow: 0 0 0 2px var(--mask-input-focus) !important;
  }
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.status-msg {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  margin: 16px 24px 0;
  backdrop-filter: blur(10px);
  letter-spacing: 0.05em;

  &.success {
    background: var(--mask-success-bg);
    border: 1px solid var(--mask-success-border);
    color: var(--mask-success-text);
  }
  &.error {
    background: var(--mask-error-bg);
    border: 1px solid var(--mask-error-border);
    color: var(--mask-error-text);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mask-type-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.input-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--mask-muted);
  margin-left: 4px;
}

.helper-text {
  font-size: 11px;
  color: var(--mask-subtle);
  text-align: center;
  font-style: italic;
}

.hash-preview {
  padding: 16px;
  border: 1px dashed var(--mask-dash-border);
  border-radius: 8px;
  background: var(--mask-highlight-bg);
}

.hash-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 6px;
  color: var(--mask-purple);
}

.hash-value {
  font-family: "Fira Code", monospace;
  font-size: 11px;
  word-break: break-all;
  color: var(--mask-text);
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--mask-gold);
  margin-bottom: 16px;
  display: block;
  text-align: center;
  font-family: "Cinzel", serif;
}

.empty-state {
  text-align: center;
  padding: 32px;
  background: var(--mask-empty-bg);
  border-radius: 8px;
}

.empty-text {
  font-size: 12px;
  opacity: 0.5;
  font-style: italic;
}

.mask-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mask-item {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--mask-list-border);
  background: var(--mask-list-bg);
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    border-color: var(--mask-purple);
    background: var(--mask-active-bg);
    box-shadow: var(--mask-active-shadow);
  }

  &:hover:not(.active) {
    background: var(--mask-list-hover);
  }
}

.mask-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.mask-id {
  font-weight: 700;
  color: var(--mask-gold);
  font-family: "Cinzel", serif;
}

.mask-status {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

.mask-status.active {
  background: var(--mask-success-bg);
  color: var(--mask-success-text);
}

.mask-status.inactive {
  background: var(--mask-error-bg);
  color: var(--mask-error-text);
}

.mask-hash {
  font-size: 10px;
  word-break: break-all;
  color: var(--mask-muted);
}

.mask-time {
  margin-top: 8px;
  font-size: 10px;
  color: var(--mask-subtle);
}

.mask-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: var(--mask-panel-bg);
  border-radius: 8px;
}

.mask-chip {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--mask-chip-border);
  background: var(--mask-chip-bg);
  font-size: 11px;
  cursor: pointer;
  color: var(--mask-chip-text);
  font-family: "Cinzel", serif;

  &.active {
    border-color: var(--mask-purple);
    background: var(--mask-chip-active-bg);
    color: var(--mask-chip-active-text);
    box-shadow: var(--mask-chip-active-shadow);
  }
}

.vote-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.mono {
  font-family: "Fira Code", monospace;
}

.mask-warning-title {
  color: var(--mask-danger-text);
}

.mask-warning-desc {
  color: var(--mask-text);
}
</style>
