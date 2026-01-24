<template>
  <AppLayout  :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <view class="theme-ex-files">
      <view v-if="activeTab === 'files' || activeTab === 'upload' || activeTab === 'stats'" class="app-container">
        <view v-if="chainType === 'evm'" class="mb-4">
          <NeoCard variant="danger">
            <view class="flex flex-col items-center gap-2 py-1">
              <text class="text-center font-bold noir-warning-title">{{ t("wrongChain") }}</text>
              <text class="text-xs text-center opacity-80 noir-warning-desc">{{ t("wrongChainMessage") }}</text>
              <NeoButton size="sm" variant="secondary" class="mt-2" @click="() => switchToAppChain()">{{ t("switchToNeo") }}</NeoButton>
            </view>
          </NeoCard>
        </view>

        <StatusMessage :status="status" />

        <!-- Files Archive Tab -->
        <view v-if="activeTab === 'files'" class="tab-content">
          <QueryRecordForm
            v-model:queryInput="queryInput"
            :query-result="queryResult"
            :is-loading="isLoading"
            :t="t as any"
            @query="queryRecord"
          />

          <!-- Memory Archive -->
          <MemoryArchive :sorted-records="sortedRecords" :t="t as any" @view="viewRecord" />
        </view>

        <!-- Upload Tab -->
        <view v-if="activeTab === 'upload'" class="tab-content">
          <UploadForm
            v-model:recordContent="recordContent"
            v-model:recordRating="recordRating"
            v-model:recordCategory="recordCategory"
            :is-loading="isLoading"
            :can-create="canCreate"
            :t="t as any"
            @create="createRecord"
          />
        </view>

        <!-- Stats Tab -->
        <view v-if="activeTab === 'stats'" class="tab-content">
          <NeoCard variant="erobo">
            <NeoStats :stats="statsData" />
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
    </view>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useWallet, usePayments, useEvents} from "@neo/uniapp-sdk";
import { useI18n } from "@/composables/useI18n";
import { parseInvokeResult, parseStackItem } from "@shared/utils/neo";
import { sha256Hex } from "@shared/utils/hash";
import { formatHash } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { AppLayout, NeoDoc, NeoCard, NeoStats } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import type { StatItem } from "@shared/components/NeoStats.vue";

import StatusMessage from "./components/StatusMessage.vue";
import QueryRecordForm, { type RecordItem } from "./components/QueryRecordForm.vue";
import MemoryArchive from "./components/MemoryArchive.vue";
import UploadForm from "./components/UploadForm.vue";


const { t } = useI18n();

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
]);

const APP_ID = "miniapp-exfiles";
const CREATE_FEE = "0.1";
const QUERY_FEE = "0.05";

const { address, connect, invokeRead, invokeContract, chainType, getContractAddress, switchToAppChain } = useWallet() as any;
const { payGAS, isLoading } = usePayments(APP_ID);
const { list: listEvents } = useEvents();

const activeTab = ref("files");
const navTabs = computed<NavTab[]>(() => [
  { id: "files", icon: "folder", label: t("tabFiles") },
  { id: "upload", icon: "upload", label: t("tabUpload") },
  { id: "stats", icon: "chart", label: t("tabStats") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const contractAddress = ref<string | null>(null);
const records = ref<RecordItem[]>([]);
const recordContent = ref("");
const recordRating = ref("3");
const recordCategory = ref(0);
const queryInput = ref("");
const queryResult = ref<RecordItem | null>(null);
const status = ref<{ msg: string; type: string } | null>(null);

const statsData = computed<StatItem[]>(() => [
  { label: t("totalRecords"), value: records.value.length, variant: "default" },
  { label: t("averageRating"), value: averageRating.value, variant: "accent" },
  { label: t("totalQueries"), value: totalQueries.value, variant: "default" },
]);

const sortedRecords = computed(() => [...records.value].sort((a, b) => b.createTime - a.createTime));

const averageRating = computed(() => {
  if (!records.value.length) return "0.0";
  const total = records.value.reduce((sum, record) => sum + record.rating, 0);
  return (total / records.value.length).toFixed(1);
});

const totalQueries = computed(() => records.value.reduce((sum, record) => sum + record.queryCount, 0));

const canCreate = computed(() => {
  const rating = Number(recordRating.value);
  return recordContent.value.trim().length > 0 && rating >= 1 && rating <= 5;
});

const showStatus = (msg: string, type: string) => {
  status.value = { msg, type };
  setTimeout(() => (status.value = null), 3000);
};

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) {
    throw new Error(t("missingContract"));
  }
  return contractAddress.value;
};

const formatHashDisplay = (hash: string) => {
  if (!hash) return "--";
  const clean = hash.startsWith("0x") ? hash : `0x${hash}`;
  return formatHash(clean, 10, 6) || clean;
};

const parseRecord = (recordId: number, raw: any): RecordItem => {
  const values = Array.isArray(raw) ? raw : [];
  const dataHash = String(values[1] || "");
  const createTime = Number(values[4] || 0);
  return {
    id: recordId,
    dataHash,
    rating: Number(values[2] || 0),
    queryCount: Number(values[3] || 0),
    createTime,
    active: Boolean(values[5]),
    category: Number(values[6] || 0),
    date: createTime ? new Date(createTime * 1000).toISOString().split("T")[0] : "--",
    hashShort: formatHashDisplay(dataHash),
  };
};

const loadRecords = async () => {
  await ensureContractAddress();
  const res = await listEvents({ app_id: APP_ID, event_name: "RecordCreated", limit: 50 });
  const ids = Array.from(
    new Set(
      res.events
        .map((evt: any) => {
          const values = Array.isArray(evt?.state) ? evt.state.map(parseStackItem) : [];
          return Number(values[0] || 0);
        })
        .filter((id: number) => id > 0),
    ),
  );
  const list: RecordItem[] = [];
  for (const id of ids) {
    const recordRes = await invokeRead({
      scriptHash: contractAddress.value as string,
      operation: "getRecord",
      args: [{ type: "Integer", value: id }],
    });
    const data = parseInvokeResult(recordRes);
    list.push(parseRecord(id, data));
  }
  records.value = list;
};

const viewRecord = (record: RecordItem) => {
  queryResult.value = record;
  showStatus(`${t("record")} #${record.id}`, "success");
};

const createRecord = async () => {
  if (!canCreate.value || isLoading.value) return;
  const rating = Number(recordRating.value);
  if (!recordContent.value.trim()) {
    showStatus(t("invalidContent"), "error");
    return;
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    showStatus(t("invalidRating"), "error");
    return;
  }
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }
    await ensureContractAddress();
    const hashHex = await sha256Hex(recordContent.value.trim());
    const payment = await payGAS(CREATE_FEE, `create:${hashHex.slice(0, 8)}`);
    const receiptId = payment.receipt_id;
    if (!receiptId) {
      throw new Error(t("receiptMissing"));
    }
    // Contract signature: CreateRecord(creator, dataHash, rating, category, receiptId)
    await invokeContract({
      scriptHash: contractAddress.value as string,
      operation: "createRecord",
      args: [
        { type: "Hash160", value: address.value as string },
        { type: "ByteArray", value: hashHex },
        { type: "Integer", value: rating },
        { type: "Integer", value: recordCategory.value },
        { type: "Integer", value: String(receiptId) },
      ],
    });
    showStatus(t("recordCreated"), "success");
    recordContent.value = "";
    recordRating.value = "3";
    await loadRecords();
    activeTab.value = "files";
  } catch (e: any) {
    showStatus(e.message || t("error"), "error");
  }
};

const waitForEvent = async (txid: string, eventName: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await listEvents({ app_id: APP_ID, event_name: eventName, limit: 20 });
    const match = res.events.find((evt: any) => evt.tx_hash === txid);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
};

const queryRecord = async () => {
  if (!queryInput.value.trim() || isLoading.value) return;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }
    await ensureContractAddress();
    const input = queryInput.value.trim();
    const isHash = /^(0x)?[0-9a-fA-F]{64}$/.test(input);
    const hashHex = isHash ? input.replace(/^0x/, "") : await sha256Hex(input);
    const payment = await payGAS(QUERY_FEE, `query:${hashHex.slice(0, 8)}`);
    const receiptId = payment.receipt_id;
    if (!receiptId) {
      throw new Error(t("receiptMissing"));
    }
    const tx = await invokeContract({
      scriptHash: contractAddress.value as string,
      operation: "queryByHash",
      args: [
        { type: "Hash160", value: address.value as string },
        { type: "ByteArray", value: hashHex },
        { type: "Integer", value: String(receiptId) },
      ],
    });
    const txid = String((tx as any)?.txid || (tx as any)?.txHash || "");
    if (txid) {
      const evt = await waitForEvent(txid, "RecordQueried");
      if (evt) {
        const values = Array.isArray(evt?.state) ? evt.state.map(parseStackItem) : [];
        const recordId = Number(values[0] || 0);
        if (recordId > 0) {
          const recordRes = await invokeRead({
            scriptHash: contractAddress.value as string,
            operation: "getRecord",
            args: [{ type: "Integer", value: recordId }],
          });
          const data = parseInvokeResult(recordRes);
          queryResult.value = parseRecord(recordId, data);
        }
      }
    }
    showStatus(t("recordQueried"), "success");
    await loadRecords();
  } catch (e: any) {
    showStatus(e.message || t("error"), "error");
  }
};

onMounted(async () => {
  try {
    await loadRecords();
  } catch (e: any) {
    showStatus(e.message || t("failedToLoad"), "error");
  }
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";

@import "./ex-files-theme.scss";
@import url('https://fonts.googleapis.com/css2?family=Special+Elite&display=swap');

:global(page) {
  background: var(--bg-primary);
}

.app-container {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background-color: var(--noir-bg);
  background-image: 
    linear-gradient(var(--noir-grid), var(--noir-grid)),
    radial-gradient(circle at 1px 1px, var(--noir-ink-line) 1px, transparent 0);
  background-size: auto, 4px 4px;
  min-height: 100vh;
  font-family: 'Special Elite', 'Courier Prime', monospace;
}

/* Noir Component Overrides */
:global(.theme-ex-files) :deep(.neo-card) {
  background: var(--noir-paper) !important;
  border: 1px solid var(--noir-border) !important;
  border-radius: 2px !important;
  box-shadow: 4px 4px 8px var(--noir-shadow), inset 0 0 40px var(--noir-card-glow) !important;
  color: var(--noir-text) !important;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; width: 100%; height: 2px;
    background: var(--noir-ink-line);
  }
}

:global(.theme-ex-files) :deep(.neo-button) {
  border-radius: 2px !important;
  font-family: 'Special Elite', monospace !important;
  text-transform: uppercase;
  font-weight: 700 !important;
  letter-spacing: 0.1em;
  box-shadow: var(--noir-button-shadow) !important;
  
  &.variant-primary {
    background: var(--noir-button-primary-bg) !important;
    color: var(--noir-button-primary-text) !important;
    border: 1px solid var(--noir-button-primary-border) !important;
    
    &:active {
      transform: translate(1px, 1px);
      box-shadow: var(--noir-button-shadow-press) !important;
    }
  }
  
  &.variant-secondary {
    background: transparent !important;
    border: 2px solid var(--noir-button-secondary-border) !important;
    color: var(--noir-button-secondary-text) !important;
  }
}

:global(.theme-ex-files) :deep(.neo-input) {
  background: var(--noir-input-bg) !important;
  border: 1px solid var(--noir-input-border) !important;
  border-radius: 0 !important;
  font-family: 'Special Elite', monospace !important;
  color: var(--noir-input-text) !important;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.noir-warning-title {
  color: var(--noir-accent);
}

.noir-warning-desc {
  color: var(--noir-text);
}
</style>
