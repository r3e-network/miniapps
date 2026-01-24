<template>
  <AppLayout  :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <view class="theme-time-capsule">
      <view v-if="chainType === 'evm'" class="px-4 mb-4">
        <NeoCard variant="danger">
          <view class="flex flex-col items-center gap-2 py-1">
            <text class="text-center font-bold capsule-warning-title">{{ t("wrongChain") }}</text>
            <text class="text-xs text-center opacity-80 capsule-warning-desc">{{ t("wrongChainMessage") }}</text>
            <NeoButton size="sm" variant="secondary" class="mt-2" @click="() => switchToAppChain()">{{
              t("switchToNeo")
            }}</NeoButton>
          </view>
        </NeoCard>
      </view>

      <view v-if="activeTab === 'capsules' || activeTab === 'create'" class="app-container">
        <NeoCard v-if="status" :variant="status.type === 'success' ? 'success' : status.type === 'loading' ? 'accent' : 'danger'" class="mb-4 text-center">
          <text class="status-text font-bold uppercase tracking-wider">{{ status.msg }}</text>
        </NeoCard>

      <!-- Capsules Tab -->
      <view v-if="activeTab === 'capsules'" class="tab-content">
        <NeoCard variant="erobo-neo" class="mb-4">
          <text class="helper-text neutral">{{ t("fishDescription") }}</text>
          <NeoButton
            variant="secondary"
            size="md"
            block
            :loading="isBusy"
            :disabled="isBusy"
            class="mt-3"
            @click="fish"
          >
            {{ t("fishButton") }}
          </NeoButton>
        </NeoCard>
        <CapsuleList :capsules="capsules" :current-time="currentTime" :t="t as any" @open="open" />
      </view>

      <!-- Create Tab -->
      <view v-if="activeTab === 'create'" class="tab-content">
        <CreateCapsuleForm
          v-model:title="newCapsule.title"
          v-model:content="newCapsule.content"
          v-model:days="newCapsule.days"
          v-model:is-public="newCapsule.isPublic"
          v-model:category="newCapsule.category"
          :is-loading="isBusy"
          :can-create="canCreate"
          :t="t as any"
          @create="create"
        />
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
    </view>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useWallet, usePayments, useEvents} from "@neo/uniapp-sdk";
import { useI18n } from "@/composables/useI18n";
import { sha256Hex } from "@shared/utils/hash";
import { requireNeoChain } from "@shared/utils/chain";
import { addressToScriptHash, normalizeScriptHash, parseInvokeResult, parseStackItem } from "@shared/utils/neo";
import { AppLayout, NeoDoc, NeoCard, NeoButton } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";

import CapsuleList, { type Capsule } from "./components/CapsuleList.vue";
import CreateCapsuleForm from "./components/CreateCapsuleForm.vue";


const { t } = useI18n();

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
  { name: t("feature3Name"), desc: t("feature3Desc") },
]);

const APP_ID = "miniapp-time-capsule";
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress, switchToAppChain } = useWallet() as any;
const { payGAS, isLoading } = usePayments(APP_ID);
const { list: listEvents } = useEvents();
const contractAddress = ref<string | null>(null);

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

const activeTab = ref("capsules");
const navTabs = computed<NavTab[]>(() => [
  { id: "capsules", icon: "lock", label: t("tabCapsules") },
  { id: "create", icon: "plus", label: t("tabCreate") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const capsules = ref<Capsule[]>([]);
const isLoadingData = ref(false);

const BURY_FEE = "0.2";
const FISH_FEE = "0.05";
const MIN_LOCK_DAYS = 1;
const MAX_LOCK_DAYS = 3650;
const CONTENT_STORE_KEY = "time-capsule-content";

const loadLocalContent = () => {
  try {
    const raw = uni.getStorageSync(CONTENT_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        normalized[key] = value;
      } else if (value && typeof value === "object") {
        const legacy = value as { hash?: string; content?: string };
        const hashKey = String(legacy.hash || key);
        if (legacy.content) {
          normalized[hashKey] = String(legacy.content);
        }
      }
    }
    return normalized;
  } catch {
    return {};
  }
};

const localContent = ref<Record<string, string>>(loadLocalContent());
const saveLocalContent = (hash: string, content: string) => {
  if (!hash) return;
  localContent.value = { ...localContent.value, [hash]: content };
  try {
    uni.setStorageSync(CONTENT_STORE_KEY, JSON.stringify(localContent.value));
  } catch {
    // ignore storage errors
  }
};

const newCapsule = ref({ title: "", content: "", days: "30", isPublic: false, category: 1 });
const status = ref<{ msg: string; type: string } | null>(null);
const currentTime = ref(Date.now());
const isProcessing = ref(false);
const isBusy = computed(() => isLoading.value || isProcessing.value);

// Countdown timer
let countdownInterval: number | null = null;

onMounted(() => {
  fetchData();
  countdownInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000) as unknown as number;
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

watch(address, () => {
  fetchData();
});

const canCreate = computed(() => {
  const daysValue = Number.parseInt(newCapsule.value.days, 10);
  return (
    newCapsule.value.title.trim() !== "" &&
    newCapsule.value.content.trim() !== "" &&
    Number.isFinite(daysValue) &&
    daysValue >= MIN_LOCK_DAYS &&
    daysValue <= MAX_LOCK_DAYS
  );
});

const ownerMatches = (value: unknown) => {
  if (!address.value) return false;
  const val = String(value || "");
  if (val === address.value) return true;
  const normalized = normalizeScriptHash(val);
  const addrHash = addressToScriptHash(address.value);
  return Boolean(normalized && addrHash && normalized === addrHash);
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

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const buildCapsuleFromDetails = (
  id: string,
  data: Record<string, unknown>,
  fallback?: { unlockTime?: number; isPublic?: boolean },
) => {
  const contentHash = String(data.contentHash || "");
  const unlockTime = toNumber(data.unlockTime ?? fallback?.unlockTime ?? 0);
  const isPublic = typeof data.isPublic === "boolean" ? data.isPublic : Boolean(data.isPublic ?? fallback?.isPublic);
  const revealed = Boolean(data.isRevealed);
  const title = String(data.title || "");
  const unlockDate = unlockTime ? new Date(unlockTime * 1000).toISOString().split("T")[0] : "N/A";
  const content = contentHash ? localContent.value[contentHash] : "";

  return {
    id,
    title,
    contentHash,
    unlockDate,
    unlockTime,
    locked: !revealed && Date.now() < unlockTime * 1000,
    revealed,
    isPublic,
    content,
  } as Capsule;
};

// Fetch capsules from smart contract
const fetchData = async () => {
  if (!address.value) return;

  isLoadingData.value = true;
  try {
    const contract = await ensureContractAddress();
    const buriedEvents = await listAllEvents("CapsuleBuried");

    const userCapsules = await Promise.all(
      buriedEvents.map(async (evt) => {
        const values = Array.isArray(evt?.state) ? evt.state.map(parseStackItem) : [];
        const owner = values[0];
        const id = String(values[1] || "");
        const unlockTimeEvent = toNumber(values[2] || 0);
        const isPublicEvent = Boolean(values[3]);
        if (!id || !ownerMatches(owner)) return null;

        try {
          const capsuleRes = await invokeRead({
            contractAddress: contract,
            operation: "getCapsuleDetails",
            args: [{ type: "Integer", value: id }],
          });
          const parsed = parseInvokeResult(capsuleRes);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const data = parsed as Record<string, unknown>;
            return buildCapsuleFromDetails(id, data, { unlockTime: unlockTimeEvent, isPublic: isPublicEvent });
          }
        } catch {
          // fallback to event values
        }

        return buildCapsuleFromDetails(
          id,
          { contentHash: "", title: "", unlockTime: unlockTimeEvent, isPublic: isPublicEvent, isRevealed: false },
          { unlockTime: unlockTimeEvent, isPublic: isPublicEvent },
        );
      })
    );

    let resolvedCapsules = userCapsules.filter(Boolean) as Capsule[];

    if (resolvedCapsules.length === 0) {
      const totalRes = await invokeRead({
        contractAddress: contract,
        operation: "totalCapsules",
        args: [],
      });
      const totalCapsules = Number(parseInvokeResult(totalRes) || 0);
      const discovered: Capsule[] = [];
      for (let i = 1; i <= totalCapsules; i++) {
        const capsuleRes = await invokeRead({
          contractAddress: contract,
          operation: "getCapsuleDetails",
          args: [{ type: "Integer", value: String(i) }],
        });
        const parsed = parseInvokeResult(capsuleRes);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
        const data = parsed as Record<string, unknown>;
        if (!ownerMatches(data.owner)) continue;
        discovered.push(buildCapsuleFromDetails(String(i), data));
      }
      resolvedCapsules = discovered;
    }

    capsules.value = resolvedCapsules.sort((a, b) => Number(b.id) - Number(a.id));
  } catch {
  } finally {
    isLoadingData.value = false;
  }
};

const create = async () => {
  if (isBusy.value || !canCreate.value) return;

  try {
    status.value = { msg: t("creatingCapsule"), type: "loading" };
    isProcessing.value = true;

    // Ensure wallet is connected
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }

    const contract = await ensureContractAddress();

    // Pay the creation fee
    const payment = await payGAS(BURY_FEE, `time-capsule:bury:${Date.now()}`);
    const receiptId = payment.receipt_id;
    if (!receiptId) {
      throw new Error(t("receiptMissing"));
    }

    const daysValue = Number.parseInt(newCapsule.value.days, 10);
    if (!Number.isFinite(daysValue) || daysValue < MIN_LOCK_DAYS || daysValue > MAX_LOCK_DAYS) {
      throw new Error(t("invalidLockDuration"));
    }

    // Calculate unlock timestamp
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + daysValue);
    const unlockTimestamp = Math.floor(unlockDate.getTime() / 1000);
    const content = newCapsule.value.content.trim();
    const contentHash = await sha256Hex(content);

    // Create capsule on-chain
    await invokeContract({
      scriptHash: contract,
      operation: "bury",
      args: [
        { type: "Hash160", value: address.value },
        { type: "String", value: contentHash },
        { type: "String", value: newCapsule.value.title.trim().slice(0, 100) },
        { type: "Integer", value: String(unlockTimestamp) },
        { type: "Boolean", value: newCapsule.value.isPublic },
        { type: "Integer", value: String(newCapsule.value.category) },
        { type: "Integer", value: String(receiptId) },
      ],
    });

    saveLocalContent(contentHash, content);

    status.value = { msg: t("capsuleCreated"), type: "success" };
    newCapsule.value = { title: "", content: "", days: "30", isPublic: false, category: 1 };
    activeTab.value = "capsules";
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isProcessing.value = false;
  }
};

const open = async (cap: Capsule) => {
  if (cap.locked) {
    status.value = { msg: t("notUnlocked"), type: "error" };
    return;
  }
  if (isBusy.value) return;

  try {
    isProcessing.value = true;
    const contract = await ensureContractAddress();

    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }

    if (!cap.revealed) {
      status.value = { msg: t("revealing"), type: "loading" };
      await invokeContract({
        scriptHash: contract,
        operation: "reveal",
        args: [
          { type: "Hash160", value: address.value },
          { type: "Integer", value: cap.id },
        ],
      });
      await fetchData();
    }

    const content = cap.contentHash ? localContent.value[cap.contentHash] : "";
    if (content) {
      status.value = { msg: `${t("message")} ${content}`, type: "success" };
    } else if (cap.contentHash) {
      status.value = { msg: `${t("contentUnavailable")} ${cap.contentHash}`, type: "success" };
    } else {
      status.value = { msg: t("capsuleRevealed"), type: "success" };
    }
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isProcessing.value = false;
  }
};

const fish = async () => {
  if (isBusy.value) return;

  try {
    isProcessing.value = true;
    status.value = { msg: t("fishing"), type: "loading" };
    const requestStartedAt = Date.now();

    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }

    const contract = await ensureContractAddress();
    const payment = await payGAS(FISH_FEE, `time-capsule:fish:${Date.now()}`);
    const receiptId = payment.receipt_id;
    if (!receiptId) {
      throw new Error(t("receiptMissing"));
    }

    await invokeContract({
      scriptHash: contract,
      operation: "fish",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: String(receiptId) },
      ],
    });

    const fishEvents = await listAllEvents("CapsuleFished");
    const match = fishEvents.find((evt) => {
      const values = Array.isArray(evt?.state) ? evt.state.map(parseStackItem) : [];
      const timestamp = evt?.created_at ? new Date(evt.created_at).getTime() : 0;
      return ownerMatches(values[0]) && timestamp >= requestStartedAt - 1000;
    });

    if (match) {
      const values = Array.isArray(match?.state) ? match.state.map(parseStackItem) : [];
      const fishedId = String(values[1] || "");
      status.value = { msg: t("fishResult").replace("{id}", fishedId || "?"), type: "success" };
    } else {
      status.value = { msg: t("fishNone"), type: "success" };
    }
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isProcessing.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";

@import "./time-capsule-theme.scss";



:global(page) {
  background: var(--bg-primary);
}

.app-container {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--capsule-radial);
  min-height: 100vh;
  position: relative;
  
  /* Tech Grid Background */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(var(--capsule-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--capsule-grid) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }
}

.tab-content {
  flex: 1;
  z-index: 1;
}

.helper-text {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--capsule-cyan);
  opacity: 0.8;
  letter-spacing: 0.05em;
}

/* Sci-fi UI Overrides */
:global(.theme-time-capsule) :deep(.neo-card) {
  background: var(--capsule-card-bg) !important;
  border: 1px solid var(--capsule-card-border) !important;
  box-shadow: var(--capsule-shadow) !important;
  border-radius: 8px !important;
  color: var(--capsule-text) !important;
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
  
  /* Corner accents */
  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 10px; height: 10px;
    border-top: 2px solid var(--capsule-corner);
    border-left: 2px solid var(--capsule-corner);
  }
}

:global(.theme-time-capsule) :deep(.neo-button) {
  border-radius: 4px !important;
  font-family: 'JetBrains Mono', monospace !important;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  
  &.variant-primary {
    background: linear-gradient(90deg, var(--capsule-cyan) 0%, var(--capsule-cyan-strong) 100%) !important;
    color: var(--capsule-button-text) !important;
    box-shadow: var(--capsule-button-primary-shadow) !important;
  }
  
  &.variant-secondary {
    background: transparent !important;
    border: 1px solid var(--capsule-cyan) !important;
    color: var(--capsule-cyan) !important;
    
    &:hover {
      background: var(--capsule-button-hover) !important;
    }
  }
}

:global(.theme-time-capsule) :deep(.neo-input) {
  background: var(--capsule-input-bg) !important;
  border: 1px solid var(--capsule-input-border) !important;
  color: var(--capsule-input-text) !important;
  font-family: monospace !important;
  
  &:focus-within {
    border-color: var(--capsule-cyan) !important;
    box-shadow: 0 0 10px var(--capsule-input-focus) !important;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.capsule-warning-title {
  color: var(--capsule-cyan);
}

.capsule-warning-desc {
  color: var(--capsule-text);
}
</style>
