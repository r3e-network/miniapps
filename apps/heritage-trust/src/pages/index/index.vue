<template>
  <AppLayout class="theme-heritage-trust" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <!-- Main Tab -->
    <view v-if="activeTab === 'main'" class="tab-content">
      <view v-if="chainType === 'evm'" class="mb-4">
        <NeoCard variant="danger">
          <view class="flex flex-col items-center gap-2 py-1">
            <text class="text-center font-bold text-red-400">{{ t("wrongChain") }}</text>
            <text class="text-xs text-center opacity-80 text-white">{{ t("wrongChainMessage") }}</text>
            <NeoButton size="sm" variant="secondary" class="mt-2" @click="() => switchToAppChain()">{{ t("switchToNeo") }}</NeoButton>
          </view>
        </NeoCard>
      </view>

      <view v-if="status" class="mb-4">
        <NeoCard
          :variant="status.type === 'error' ? 'danger' : status.type === 'loading' ? 'warning' : 'success'"
          class="text-center"
        >
          <text class="font-bold">{{ status.msg }}</text>
        </NeoCard>
      </view>

      <!-- Create Trust Form -->
      <CreateTrustForm
        v-model:name="newTrust.name"
        v-model:beneficiary="newTrust.beneficiary"
        v-model:neo-value="newTrust.neoValue"
        v-model:gas-value="newTrust.gasValue"
        v-model:monthly-neo="newTrust.monthlyNeo"
        v-model:monthly-gas="newTrust.monthlyGas"
        v-model:release-mode="newTrust.releaseMode"
        v-model:interval-days="newTrust.intervalDays"
        v-model:notes="newTrust.notes"
        :is-loading="isLoading"
        :t="t as any"
        @create="create"
      />
    </view>

    <!-- Mine Tab -->
    <view v-if="activeTab === 'mine'" class="tab-content scrollable">
      <view class="mine-dashboard">
        <view class="section-header">
          <text class="section-title">{{ t("createdTrusts") }}</text>
          <text class="count-badge">{{ myCreatedTrusts.length }}</text>
        </view>
        <view v-if="myCreatedTrusts.length === 0" class="empty-state">
           <NeoCard variant="erobo" class="p-8 text-center opacity-60">
             <text class="block mb-2">📜</text>
             <text class="text-xs">{{ t("noTrusts") }}</text>
           </NeoCard>
        </view>
        <view v-for="trust in myCreatedTrusts" :key="trust.id">
          <TrustCard
            :trust="trust"
            :t="t as any"
            @heartbeat="heartbeatTrust"
            @claimYield="claimYield"
            @execute="executeTrust"
            @claimReleased="claimReleased"
          />
        </view>

        <view class="section-header mt-8">
          <text class="section-title">{{ t("beneficiaryTrusts") }}</text>
          <text class="count-badge">{{ myBeneficiaryTrusts.length }}</text>
        </view>
        <view v-if="myBeneficiaryTrusts.length === 0" class="empty-state">
           <NeoCard variant="erobo" class="p-8 text-center opacity-60">
             <text class="block mb-2">🎁</text>
             <text class="text-xs">{{ t("noTrusts") }}</text>
           </NeoCard>
        </view>
        <view v-for="trust in myBeneficiaryTrusts" :key="trust.id">
          <TrustCard
            :trust="trust"
            :t="t as any"
            @heartbeat="heartbeatTrust"
            @claimYield="claimYield"
            @execute="executeTrust"
            @claimReleased="claimReleased"
          />
        </view>
      </view>
    </view>

    <!-- Stats Tab -->
    <view v-if="activeTab === 'stats'" class="tab-content scrollable">
      <StatsCard :stats="stats" :t="t as any" />
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
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from "vue";
import { useWallet, useEvents} from "@neo/uniapp-sdk";
import { useI18n } from "@/composables/useI18n";
import { AppLayout, NeoDoc, NeoCard } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import { parseGas, toFixed8, toFixedDecimals, sleep } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { addressToScriptHash, normalizeScriptHash, parseInvokeResult, parseStackItem } from "@shared/utils/neo";

import TrustCard, { type Trust } from "./components/TrustCard.vue";
import CreateTrustForm from "./components/CreateTrustForm.vue";
import StatsCard from "./components/StatsCard.vue";


const { t } = useI18n();

const navTabs = computed<NavTab[]>(() => [
  { id: "main", icon: "plus-circle", label: t("createTrust") },
  { id: "mine", icon: "wallet", label: t("mine") },
  { id: "stats", icon: "chart", label: t("stats") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const activeTab = ref("main");

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
  { name: t("feature3Name"), desc: t("feature3Desc") },
]);
const APP_ID = "miniapp-heritage-trust";
const { address, connect, invokeContract, invokeRead, getBalance, chainType, getContractAddress, switchToAppChain } = useWallet() as any;
const { list: listEvents } = useEvents();
const isLoading = ref(false);
const contractAddress = ref<string | null>(null);

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) {
    throw new Error(t("error"));
  }
  return contractAddress.value;
};

const TRUST_NAME_KEY = "heritage-trust-names";
const loadTrustNames = () => {
  try {
    const raw = uni.getStorageSync(TRUST_NAME_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const trustNames = ref<Record<string, string>>(loadTrustNames());
const saveTrustName = (id: string, name: string) => {
  if (!id || !name) return;
  trustNames.value = { ...trustNames.value, [id]: name };
  try {
    uni.setStorageSync(TRUST_NAME_KEY, JSON.stringify(trustNames.value));
  } catch {
    // ignore storage errors
  }
};

const trusts = ref<Trust[]>([]);
const newTrust = reactive({
  name: "",
  beneficiary: "",
  neoValue: "10",
  gasValue: "0",
  monthlyNeo: "1",
  monthlyGas: "0",
  releaseMode: "neoRewards",
  intervalDays: "30",
  notes: "",
});
const status = ref<{ msg: string; type: string } | null>(null);
const isLoadingData = ref(false);

const myCreatedTrusts = computed(() => trusts.value.filter((t) => t.role === "owner"));
const myBeneficiaryTrusts = computed(() => trusts.value.filter((t) => t.role === "beneficiary"));

watch(
  [() => newTrust.releaseMode, () => newTrust.neoValue, () => newTrust.gasValue],
  ([mode, neoValue, gasValue]) => {
    const neoAmount = Number.parseFloat(neoValue);
    const gasAmount = Number.parseFloat(gasValue);

    if (mode !== "fixed") {
      newTrust.gasValue = "0";
      newTrust.monthlyGas = "0";
    } else if (!Number.isFinite(gasAmount) || gasAmount <= 0) {
      newTrust.monthlyGas = "0";
    }

    if (mode === "rewardsOnly") {
      newTrust.monthlyNeo = "0";
    } else if (!Number.isFinite(neoAmount) || neoAmount <= 0) {
      newTrust.monthlyNeo = "0";
    } else if (newTrust.monthlyNeo === "0") {
      newTrust.monthlyNeo = "1";
    }
  }
);

const stats = computed(() => ({
  totalTrusts: trusts.value.length,
  totalNeoValue: trusts.value.reduce((sum, t) => sum + (t.neoValue || 0), 0),
  activeTrusts: trusts.value.filter((t) => t.status === "active" || t.status === "triggered").length,
}));

const ownerMatches = (value: unknown) => {
  if (!address.value) return false;
  const val = String(value || "");
  if (val === address.value) return true;
  const normalized = normalizeScriptHash(val);
  const addrHash = addressToScriptHash(address.value);
  return Boolean(normalized && addrHash && normalized === addrHash);
};

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const toTimestampMs = (value: unknown) => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return num > 1e12 ? num : num * 1000;
};

const waitForEvent = async (txid: string, eventName: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await listEvents({ app_id: APP_ID, event_name: eventName, limit: 25 });
    const match = res.events.find((evt) => evt.tx_hash === txid);
    if (match) return match;
    await sleep(1500);
  }
  return null;
};

// Fetch trusts data from smart contract
const fetchData = async () => {
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) return;

    isLoadingData.value = true;
    const contract = await ensureContractAddress();

    // Get total trusts count from contract
    const totalResult = await invokeRead({
      contractAddress: contract,
      operation: "totalTrusts",
      args: [],
    });
    const totalTrusts = Number(parseInvokeResult(totalResult) || 0);
    const userTrusts: Trust[] = [];
    const now = Date.now();

    // Iterate through all trusts and find ones owned by current user
    for (let i = 1; i <= totalTrusts; i++) {
      const trustResult = await invokeRead({
        contractAddress: contract,
        operation: "getTrustDetails",
        args: [{ type: "Integer", value: i.toString() }],
      });
      const parsed = parseInvokeResult(trustResult);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      const trustData = parsed as Record<string, unknown>;
      const owner = trustData.owner;
      const primaryHeir = trustData.primaryHeir;
      const isOwner = ownerMatches(owner);
      const isBeneficiary = ownerMatches(primaryHeir);

      if (!isOwner && !isBeneficiary) continue;

      const deadlineMs = toTimestampMs(trustData.deadline);
      const rawStatus = String(trustData.status || "");
      const rawReleaseMode = String(trustData.releaseMode || "");
      const onlyRewards = Boolean(trustData.onlyRewards);
      const hasGasRelease = toNumber(trustData.monthlyGas) > 0 && toNumber(trustData.gasPrincipal) > 0;
      const derivedReleaseMode: Trust["releaseMode"] = onlyRewards
        ? "rewards_only"
        : hasGasRelease
          ? "fixed"
          : "neo_rewards";
      const releaseMode: Trust["releaseMode"] =
        rawReleaseMode === "fixed" || rawReleaseMode === "neo_rewards" || rawReleaseMode === "rewards_only"
          ? (rawReleaseMode as Trust["releaseMode"])
          : derivedReleaseMode;
      let status: Trust["status"] = "pending";
      if (rawStatus === "active") status = "active";
      else if (rawStatus === "grace_period") status = "pending";
      else if (rawStatus === "executable") status = "triggered";
      else if (rawStatus === "executed") status = "executed";
      else status = "pending";
      const daysRemaining = deadlineMs ? Math.max(0, Math.ceil((deadlineMs - now) / 86400000)) : 0;

      userTrusts.push({
        id: i.toString(),
        name: String(trustData.trustName || trustNames.value?.[String(i)] || t("trustFallback", { id: i })),
        beneficiary: String(trustData.primaryHeir || t("unknown")),
        neoValue: Number(trustData.principal || 0),
        gasPrincipal: parseGas(trustData.gasPrincipal || 0),
        accruedYield: parseGas(trustData.accruedYield || 0),
        claimedYield: parseGas(trustData.claimedYield || 0),
        monthlyNeo: Number(trustData.monthlyNeo || 0),
        monthlyGas: parseGas(trustData.monthlyGas || 0),
        onlyRewards,
        releaseMode,
        totalNeoReleased: Number(trustData.totalNeoReleased || 0),
        totalGasReleased: parseGas(trustData.totalGasReleased || 0),
        createdTime: trustData.createdTime ? new Date(Number(trustData.createdTime) * 1000).toISOString().split("T")[0] : t("unknown"),
        icon: isOwner ? "📜" : "🎁",
        status,
        daysRemaining,
        deadline: deadlineMs ? new Date(deadlineMs).toISOString().split("T")[0] : t("notAvailable"),
        canExecute: status === "triggered",
        role: isOwner ? "owner" : "beneficiary",
        executed: Boolean(trustData.executed),
      });
    }

    trusts.value = userTrusts.sort((a, b) => Number(b.id) - Number(a.id));
  } catch {
  } finally {
    isLoadingData.value = false;
  }
};

const create = async () => {
  const neoAmount = Number(toFixedDecimals(newTrust.neoValue, 0));
  let gasAmountDisplay = Number.parseFloat(newTrust.gasValue);
  if (!Number.isFinite(gasAmountDisplay)) gasAmountDisplay = 0;

  let monthlyNeoAmount = Number(toFixedDecimals(newTrust.monthlyNeo, 0));
  let monthlyGasDisplay = Number.parseFloat(newTrust.monthlyGas);
  if (!Number.isFinite(monthlyGasDisplay)) monthlyGasDisplay = 0;
  const intervalDays = Number(toFixedDecimals(newTrust.intervalDays, 0));
  const releaseMode = newTrust.releaseMode;

  const onlyRewards = releaseMode === "rewardsOnly";
  if (releaseMode !== "fixed") {
    gasAmountDisplay = 0;
    monthlyGasDisplay = 0;
  }
  if (releaseMode === "rewardsOnly") {
    monthlyNeoAmount = 0;
  }
  if (neoAmount <= 0) {
    monthlyNeoAmount = 0;
  }
  if (gasAmountDisplay <= 0) {
    monthlyGasDisplay = 0;
  }

  if (
    isLoading.value ||
    !newTrust.name.trim() ||
    !newTrust.beneficiary ||
    !(neoAmount > 0 || gasAmountDisplay > 0) ||
    !(intervalDays > 0)
  ) {
    return;
  }

  try {
    isLoading.value = true;
    status.value = { msg: t("creating"), type: "loading" };

    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("error"));
    }

    if (onlyRewards && neoAmount <= 0) {
      throw new Error(t("rewardsRequireNeo"));
    }
    if (!onlyRewards && neoAmount > 0 && monthlyNeoAmount <= 0) {
      throw new Error(t("invalidReleaseSchedule"));
    }
    if (releaseMode === "fixed" && gasAmountDisplay > 0 && monthlyGasDisplay <= 0) {
      throw new Error(t("invalidReleaseSchedule"));
    }

    const neo = await getBalance("NEO");
    const neoBalance = typeof neo === "string" ? parseFloat(neo) || 0 : typeof neo === "number" ? neo : 0;
    if (neoAmount > neoBalance) {
      throw new Error(t("insufficientNeo"));
    }
    if (gasAmountDisplay > 0) {
      const gas = await getBalance("GAS");
      const gasBalance = typeof gas === "string" ? parseFloat(gas) || 0 : typeof gas === "number" ? gas : 0;
      if (gasAmountDisplay > gasBalance) {
        throw new Error(t("insufficientGas"));
      }
    }

    const contract = await ensureContractAddress();
    const tx = await invokeContract({
      scriptHash: contract,
      operation: "createTrust",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Hash160", value: newTrust.beneficiary },
        { type: "Integer", value: neoAmount },
        { type: "Integer", value: toFixed8(gasAmountDisplay) },
        { type: "Integer", value: intervalDays },
        { type: "Integer", value: monthlyNeoAmount },
        { type: "Integer", value: toFixed8(monthlyGasDisplay) },
        { type: "Boolean", value: onlyRewards },
        { type: "String", value: newTrust.name.trim().slice(0, 100) },
        { type: "String", value: newTrust.notes.trim().slice(0, 300) },
        { type: "Integer", value: "0" },
      ],
    });

    const txid = String((tx as any)?.txid || (tx as any)?.txHash || "");
    if (txid) {
      const event = await waitForEvent(txid, "TrustCreated");
      if (event?.state) {
        const values = Array.isArray(event.state) ? event.state.map(parseStackItem) : [];
        const trustId = String(values[0] || "");
        if (trustId) {
          saveTrustName(trustId, newTrust.name);
        }
      }
    }

    status.value = { msg: t("trustCreated"), type: "success" };
    // Reset form
    newTrust.name = "";
    newTrust.beneficiary = "";
    newTrust.neoValue = "10";
    newTrust.gasValue = "0";
    newTrust.monthlyNeo = "1";
    newTrust.monthlyGas = "0";
    newTrust.releaseMode = "neoRewards";
    newTrust.intervalDays = "30";
    newTrust.notes = "";
    
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

const heartbeatTrust = async (trust: Trust) => {
  if (isLoading.value) return;
  try {
    isLoading.value = true;
    if (!address.value) {
      await connect();
    }
    if (!address.value) throw new Error(t("error"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "heartbeat",
      args: [{ type: "Integer", value: trust.id }],
    });
    status.value = { msg: t("heartbeat"), type: "success" };
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

const claimYield = async (trust: Trust) => {
  if (isLoading.value) return;
  try {
    isLoading.value = true;
    if (!address.value) {
      await connect();
    }
    if (!address.value) throw new Error(t("error"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "claimYield",
      args: [{ type: "Integer", value: trust.id }],
    });
    status.value = { msg: t("claimYield"), type: "success" };
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

const claimReleased = async (trust: Trust) => {
  if (isLoading.value) return;
  try {
    isLoading.value = true;
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "claimReleasedAssets",
      args: [{ type: "Integer", value: trust.id }],
    });
    status.value = { msg: t("claimReleased"), type: "success" };
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

const executeTrust = async (trust: Trust) => {
  if (isLoading.value) return;
  try {
    isLoading.value = true;
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "executeTrust",
      args: [{ type: "Integer", value: trust.id }],
    });
    status.value = { msg: t("executeTrust"), type: "success" };
    await fetchData();
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./heritage-trust-theme.scss";

:global(page) {
  background: linear-gradient(135deg, var(--heritage-bg-start) 0%, var(--heritage-bg-end) 100%);
  min-height: 100vh;
  color: var(--heritage-text);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  color: var(--heritage-text);
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--heritage-section-title);
}

.count-badge {
  background: var(--heritage-badge-bg);
  color: var(--heritage-badge-text);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
}

.empty-state {
  margin-bottom: 24px;
}

.mt-8 {
  margin-top: 32px;
}

/* Custom transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
