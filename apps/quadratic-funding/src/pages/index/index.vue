<template>
  <AppLayout class="theme-quadratic-funding" :tabs="navTabs" :active-tab="activeTab" @tab-change="onTabChange">
    <view v-if="activeTab === 'rounds'" class="tab-content">
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
          <NeoInput v-model="roundForm.title" :label="t('roundTitle')" :placeholder="t('roundTitlePlaceholder')" />
          <NeoInput
            v-model="roundForm.description"
            type="textarea"
            :label="t('roundDescription')"
            :placeholder="t('roundDescriptionPlaceholder')"
          />

          <view class="input-group">
            <text class="input-label">{{ t("assetType") }}</text>
            <view class="asset-toggle">
              <NeoButton size="sm" variant="primary" disabled>
                {{ t("assetGas") }}
              </NeoButton>
            </view>
          </view>

          <NeoInput
            v-model="roundForm.matchingPool"
            type="number"
            :label="t('matchingPool')"
            placeholder="50"
            :suffix="roundForm.asset"
            :hint="t('matchingPoolHint')"
          />

          <NeoInput v-model="roundForm.startTime" :label="t('roundStart')" :placeholder="t('roundStartPlaceholder')" />
          <NeoInput v-model="roundForm.endTime" :label="t('roundEnd')" :placeholder="t('roundEndPlaceholder')" />

          <NeoButton
            variant="primary"
            size="lg"
            block
            :loading="isCreatingRound"
            :disabled="isCreatingRound"
            @click="createRound"
          >
            {{ isCreatingRound ? t("creatingRound") : t("createRound") }}
          </NeoButton>
        </view>
      </NeoCard>

      <NeoCard variant="erobo" class="round-list">
        <view class="rounds-header">
          <text class="section-title">{{ t("roundsTitle") }}</text>
          <NeoButton size="sm" variant="secondary" :loading="isRefreshingRounds" @click="refreshRounds">
            {{ t("refresh") }}
          </NeoButton>
        </view>

        <view v-if="rounds.length === 0" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center opacity-70">
            <text class="text-xs">{{ t("emptyRounds") }}</text>
          </NeoCard>
        </view>

        <view v-else class="round-cards">
          <view v-for="round in rounds" :key="`round-${round.id}`" class="round-card">
            <view class="round-card__header">
              <view>
                <text class="round-title">{{ round.title || `#${round.id}` }}</text>
                <text class="round-subtitle">#{{ round.id }} · {{ round.assetSymbol }}</text>
              </view>
              <text :class="['status-pill', round.status]">{{ roundStatusLabel(round.status) }}</text>
            </view>

            <text class="round-desc">{{ round.description || '--' }}</text>

            <view class="round-metrics">
              <view>
                <text class="metric-label">{{ t("matchingPool") }}</text>
                <text class="metric-value">{{ formatAmount(round.assetSymbol, round.matchingPool) }} {{ round.assetSymbol }}</text>
              </view>
              <view>
                <text class="metric-label">{{ t("matchingRemaining") }}</text>
                <text class="metric-value">{{ formatAmount(round.assetSymbol, round.matchingRemaining) }} {{ round.assetSymbol }}</text>
              </view>
              <view>
                <text class="metric-label">{{ t("totalContributed") }}</text>
                <text class="metric-value">{{ formatAmount(round.assetSymbol, round.totalContributed) }} {{ round.assetSymbol }}</text>
              </view>
              <view>
                <text class="metric-label">{{ t("projectCount") }}</text>
                <text class="metric-value">{{ round.projectCount.toString() }}</text>
              </view>
            </view>

            <view class="round-meta">
              <text class="meta-item">{{ t("roundSchedule") }}: {{ formatSchedule(round.startTime, round.endTime) }}</text>
              <text class="meta-item">{{ t("roundCreator") }}: {{ formatAddress(round.creator) }}</text>
            </view>

            <view class="round-actions">
              <NeoButton size="sm" variant="secondary" @click="selectRound(round)">
                {{ selectedRoundId === round.id ? t("selectedRound") : t("selectRound") }}
              </NeoButton>
            </view>
          </view>
        </view>
      </NeoCard>

      <NeoCard v-if="selectedRound" variant="erobo-neo" class="admin-card">
        <view class="admin-header">
          <text class="section-title">{{ t("adminTools") }}</text>
          <text class="admin-subtitle">#{{ selectedRound.id }} · {{ selectedRound.assetSymbol }}</text>
        </view>

        <view class="form-group">
          <NeoInput
            v-model="matchingForm.amount"
            type="number"
            :label="t('addMatching')"
            :placeholder="t('addMatchingPlaceholder')"
            :suffix="selectedRound.assetSymbol"
          />
          <NeoButton
            size="sm"
            variant="secondary"
            :loading="isAddingMatching"
            :disabled="!canManageSelectedRound"
            @click="addMatchingPool"
          >
            {{ isAddingMatching ? t("addingMatching") : t("addMatching") }}
          </NeoButton>
        </view>

        <view class="admin-divider" />

        <view class="form-group">
          <NeoInput
            v-model="finalizeForm.projectIds"
            :label="t('finalizeProjectsJson')"
            :placeholder="t('finalizeProjectsPlaceholder')"
          />
          <NeoInput
            v-model="finalizeForm.matchedAmounts"
            :label="t('finalizeMatchesJson')"
            :placeholder="t('finalizeMatchesPlaceholder')"
          />
          <text class="hint-text">{{ t("finalizeHint") }}</text>
          <NeoButton
            size="sm"
            variant="primary"
            :loading="isFinalizing"
            :disabled="!canFinalizeSelectedRound"
            @click="finalizeRound"
          >
            {{ isFinalizing ? t("finalizing") : t("finalizeRound") }}
          </NeoButton>
        </view>

        <view class="admin-divider" />

        <NeoButton
          size="sm"
          variant="secondary"
          :loading="isClaimingUnused"
          :disabled="!canClaimUnused"
          @click="claimUnusedMatching"
        >
          {{ isClaimingUnused ? t("claimingUnused") : t("claimUnused") }}
        </NeoButton>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'projects'" class="tab-content">
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

      <view v-if="!selectedRound" class="empty-state">
        <NeoCard variant="erobo" class="p-6 text-center">
          <text class="text-sm">{{ t("noSelectedRound") }}</text>
        </NeoCard>
      </view>

      <template v-else>
        <NeoCard variant="erobo-neo">
          <view class="form-group">
            <NeoInput v-model="projectForm.name" :label="t('projectName')" :placeholder="t('projectNamePlaceholder')" />
            <NeoInput
              v-model="projectForm.description"
              type="textarea"
              :label="t('projectDescription')"
              :placeholder="t('projectDescriptionPlaceholder')"
            />
            <NeoInput v-model="projectForm.link" :label="t('projectLink')" :placeholder="t('projectLinkPlaceholder')" />

            <NeoButton
              variant="primary"
              size="lg"
              block
              :loading="isRegisteringProject"
              :disabled="isRegisteringProject"
              @click="registerProject"
            >
              {{ isRegisteringProject ? t("registeringProject") : t("registerProject") }}
            </NeoButton>
          </view>
        </NeoCard>

        <NeoCard variant="erobo" class="project-list">
          <view class="projects-header">
            <text class="section-title">{{ t("tabProjects") }}</text>
            <NeoButton size="sm" variant="secondary" :loading="isRefreshingProjects" @click="refreshProjects">
              {{ t("refresh") }}
            </NeoButton>
          </view>

          <view v-if="projects.length === 0" class="empty-state">
            <NeoCard variant="erobo" class="p-6 text-center opacity-70">
              <text class="text-xs">{{ t("emptyProjects") }}</text>
            </NeoCard>
          </view>

          <view v-else class="project-cards">
            <view v-for="project in projects" :key="`project-${project.id}`" class="project-card">
              <view class="project-card__header">
                <view>
                  <text class="project-title">{{ project.name || `#${project.id}` }}</text>
                  <text class="project-subtitle">{{ formatAddress(project.owner) }}</text>
                </view>
                <text :class="['status-pill', projectStatusClass(project)]">{{ projectStatusLabel(project) }}</text>
              </view>

              <text class="project-desc">{{ project.description || '--' }}</text>
              <text v-if="project.link" class="project-link">{{ project.link }}</text>

              <view class="project-metrics">
                <view>
                  <text class="metric-label">{{ t("totalContributed") }}</text>
                  <text class="metric-value">{{ formatAmount(selectedRound.assetSymbol, project.totalContributed) }} {{ selectedRound.assetSymbol }}</text>
                </view>
                <view>
                  <text class="metric-label">{{ t("matchedAmount") }}</text>
                  <text class="metric-value">{{ formatAmount(selectedRound.assetSymbol, project.matchedAmount) }} {{ selectedRound.assetSymbol }}</text>
                </view>
                <view>
                  <text class="metric-label">{{ t("donors") }}</text>
                  <text class="metric-value">{{ project.contributorCount.toString() }}</text>
                </view>
              </view>

              <view class="project-actions">
                <NeoButton size="sm" variant="secondary" @click="goToContribute(project)">
                  {{ t("contributeNow") }}
                </NeoButton>
                <NeoButton
                  size="sm"
                  variant="primary"
                  :loading="claimingProjectId === project.id"
                  :disabled="!canClaimProject(project)"
                  @click="claimProject(project)"
                >
                  {{ claimingProjectId === project.id ? t("claimingProject") : t("claimProject") }}
                </NeoButton>
              </view>
            </view>
          </view>
        </NeoCard>
      </template>
    </view>

    <view v-if="activeTab === 'contribute'" class="tab-content">
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

      <view v-if="!selectedRound" class="empty-state">
        <NeoCard variant="erobo" class="p-6 text-center">
          <text class="text-sm">{{ t("noSelectedRound") }}</text>
        </NeoCard>
      </view>

      <template v-else>
        <NeoCard variant="erobo" class="project-quicklist">
          <text class="section-title">{{ t("tabProjects") }}</text>
          <view v-if="projects.length === 0" class="empty-state">
            <text class="text-xs opacity-70">{{ t("emptyProjects") }}</text>
          </view>
          <view v-else class="chip-row">
            <NeoButton
              v-for="project in projects"
              :key="`chip-${project.id}`"
              size="sm"
              :variant="contributeForm.projectId === project.id ? 'primary' : 'secondary'"
              @click="selectProject(project)"
            >
              {{ project.name || `#${project.id}` }}
            </NeoButton>
          </view>
        </NeoCard>

        <NeoCard variant="erobo-neo">
          <view class="form-group">
            <NeoInput v-model="contributeForm.roundId" :label="t('contributionRoundId')" disabled />
            <NeoInput v-model="contributeForm.projectId" :label="t('contributionProjectId')" :placeholder="t('selectProjectHint')" />
            <NeoInput
              v-model="contributeForm.amount"
              type="number"
              :label="t('contributionAmount')"
              :placeholder="t('contributionAmountPlaceholder')"
              :suffix="selectedRound.assetSymbol"
            />
            <NeoInput
              v-model="contributeForm.memo"
              type="textarea"
              :label="t('contributionMemo')"
              :placeholder="t('contributionMemoPlaceholder')"
            />

            <NeoButton
              variant="primary"
              size="lg"
              block
              :loading="isContributing"
              :disabled="isContributing"
              @click="contribute"
            >
              {{ isContributing ? t("contributing") : t("contribute") }}
            </NeoButton>
          </view>
        </NeoCard>
      </template>
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
import { formatAddress, formatFixed8, toFixedDecimals } from "@shared/utils/format";
import { parseInvokeResult } from "@shared/utils/neo";

const { t } = useI18n();
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress, switchToAppChain } = useWallet() as any;

const NEO_HASH = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5";
const GAS_HASH = "0xd2a4cff31913016155e38e474a2c06d08be276cf";

const activeTab = ref("rounds");
const navTabs = computed<NavTab[]>(() => [
  { id: "rounds", icon: "target", label: t("tabRounds") },
  { id: "projects", icon: "file", label: t("tabProjects") },
  { id: "contribute", icon: "heart", label: t("tabContribute") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const contractAddress = ref<string | null>(null);
const status = ref<{ msg: string; type: "success" | "error" } | null>(null);

const roundForm = reactive({
  title: "",
  description: "",
  asset: "GAS",
  matchingPool: "",
  startTime: "",
  endTime: "",
});

const projectForm = reactive({
  name: "",
  description: "",
  link: "",
});

const contributeForm = reactive({
  roundId: "",
  projectId: "",
  amount: "",
  memo: "",
});

const matchingForm = reactive({
  amount: "",
});

const finalizeForm = reactive({
  projectIds: "",
  matchedAmounts: "",
});

const rounds = ref<RoundItem[]>([]);
const projects = ref<ProjectItem[]>([]);
const selectedRoundId = ref<string>("");

const isCreatingRound = ref(false);
const isRegisteringProject = ref(false);
const isContributing = ref(false);
const isRefreshingRounds = ref(false);
const isRefreshingProjects = ref(false);
const isAddingMatching = ref(false);
const isFinalizing = ref(false);
const isClaimingUnused = ref(false);
const claimingProjectId = ref<string | null>(null);

interface RoundItem {
  id: string;
  creator: string;
  asset: string;
  assetSymbol: string;
  matchingPool: bigint;
  matchingAllocated: bigint;
  matchingWithdrawn: bigint;
  matchingRemaining: bigint;
  totalContributed: bigint;
  projectCount: bigint;
  startTime: number;
  endTime: number;
  createdTime: number;
  finalized: boolean;
  cancelled: boolean;
  status: string;
  title: string;
  description: string;
}

interface ProjectItem {
  id: string;
  roundId: string;
  owner: string;
  name: string;
  description: string;
  link: string;
  createdTime: number;
  totalContributed: bigint;
  contributorCount: bigint;
  matchedAmount: bigint;
  active: boolean;
  claimed: boolean;
  status: string;
}

const selectedRound = computed(() => rounds.value.find((round) => round.id === selectedRoundId.value) || null);
const canManageSelectedRound = computed(() => {
  if (!selectedRound.value) return false;
  if (!address.value) return false;
  return selectedRound.value.creator === address.value && !selectedRound.value.cancelled && !selectedRound.value.finalized;
});
const canFinalizeSelectedRound = computed(() => {
  if (!selectedRound.value) return false;
  if (!address.value) return false;
  return selectedRound.value.creator === address.value && !selectedRound.value.cancelled && !selectedRound.value.finalized;
});
const canClaimUnused = computed(() => {
  if (!selectedRound.value) return false;
  if (!address.value) return false;
  return selectedRound.value.creator === address.value && selectedRound.value.finalized && !selectedRound.value.cancelled;
});

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t, undefined, { silent: true })) {
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

const setStatus = (msg: string, type: "success" | "error") => {
  status.value = { msg, type };
  setTimeout(() => {
    if (status.value?.msg === msg) status.value = null;
  }, 4000);
};

const parseBigInt = (value: unknown) => {
  try {
    return BigInt(String(value ?? "0"));
  } catch {
    return 0n;
  }
};

const parseBool = (value: unknown) => value === true || value === "true" || value === 1 || value === "1";

const parseDateInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.floor(parsed / 1000);
};

const formatSchedule = (startTime: number, endTime: number) => {
  if (!startTime || !endTime) return t("dateUnknown");
  const start = new Date(startTime * 1000);
  const end = new Date(endTime * 1000);
  return `${start.toLocaleString()} - ${end.toLocaleString()}`;
};

const formatAmount = (assetSymbol: string, amount: bigint) => {
  return assetSymbol === "NEO" ? amount.toString() : formatFixed8(amount, 4);
};

const roundStatusLabel = (statusValue: string) => {
  switch (statusValue) {
    case "upcoming":
      return t("roundStatusUpcoming");
    case "active":
      return t("roundStatusActive");
    case "ended":
      return t("roundStatusEnded");
    case "finalized":
      return t("roundStatusFinalized");
    case "cancelled":
      return t("roundStatusCancelled");
    default:
      return statusValue || t("roundStatusActive");
  }
};

const projectStatusLabel = (project: ProjectItem) => {
  if (project.claimed) return t("projectStatusClaimed");
  return project.active ? t("projectStatusActive") : t("projectStatusInactive");
};

const projectStatusClass = (project: ProjectItem) => {
  if (project.claimed) return "claimed";
  return project.active ? "active" : "inactive";
};

const selectRound = (round: RoundItem) => {
  selectedRoundId.value = round.id;
};

const selectProject = (project: ProjectItem) => {
  contributeForm.projectId = project.id;
  contributeForm.roundId = project.roundId;
};

const goToContribute = (project: ProjectItem) => {
  selectProject(project);
  activeTab.value = "contribute";
};

const parseRound = (raw: any, id: string): RoundItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const matchingPool = parseBigInt(raw.matchingPool);
  const matchingAllocated = parseBigInt(raw.matchingAllocated);
  const matchingWithdrawn = parseBigInt(raw.matchingWithdrawn);
  const matchingRemaining = raw.matchingRemaining !== undefined
    ? parseBigInt(raw.matchingRemaining)
    : matchingPool - matchingAllocated - matchingWithdrawn;

  return {
    id,
    creator: String(raw.creator || ""),
    asset: String(raw.asset || ""),
    assetSymbol: String(raw.assetSymbol || ""),
    matchingPool,
    matchingAllocated,
    matchingWithdrawn,
    matchingRemaining,
    totalContributed: parseBigInt(raw.totalContributed),
    projectCount: parseBigInt(raw.projectCount),
    startTime: Number.parseInt(String(raw.startTime || "0"), 10) || 0,
    endTime: Number.parseInt(String(raw.endTime || "0"), 10) || 0,
    createdTime: Number.parseInt(String(raw.createdTime || "0"), 10) || 0,
    finalized: parseBool(raw.finalized),
    cancelled: parseBool(raw.cancelled),
    status: String(raw.status || ""),
    title: String(raw.title || ""),
    description: String(raw.description || ""),
  };
};

const parseProject = (raw: any, id: string): ProjectItem | null => {
  if (!raw || typeof raw !== "object") return null;
  return {
    id,
    roundId: String(raw.roundId || ""),
    owner: String(raw.owner || ""),
    name: String(raw.name || ""),
    description: String(raw.description || ""),
    link: String(raw.link || ""),
    createdTime: Number.parseInt(String(raw.createdTime || "0"), 10) || 0,
    totalContributed: parseBigInt(raw.totalContributed),
    contributorCount: parseBigInt(raw.contributorCount),
    matchedAmount: parseBigInt(raw.matchedAmount),
    active: parseBool(raw.active),
    claimed: parseBool(raw.claimed),
    status: String(raw.status || ""),
  };
};

const fetchRoundIds = async () => {
  const contract = await ensureContractAddress();
  const result = await invokeRead({
    contractAddress: contract,
    operation: "getRounds",
    args: [
      { type: "Integer", value: "0" },
      { type: "Integer", value: "30" },
    ],
  });
  const parsed = parseInvokeResult(result);
  if (!Array.isArray(parsed)) return [] as string[];
  return parsed
    .map((value) => Number.parseInt(String(value || "0"), 10))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => String(value));
};

const fetchRoundDetails = async (roundId: string) => {
  const contract = await ensureContractAddress();
  const details = await invokeRead({
    contractAddress: contract,
    operation: "getRoundDetails",
    args: [{ type: "Integer", value: roundId }],
  });
  const parsed = parseInvokeResult(details) as any;
  return parseRound(parsed, roundId);
};

const refreshRounds = async () => {
  if (isRefreshingRounds.value) return;
  try {
    isRefreshingRounds.value = true;
    const ids = await fetchRoundIds();
    const details = await Promise.all(ids.map(fetchRoundDetails));
    rounds.value = details.filter(Boolean) as RoundItem[];

    if (!selectedRoundId.value && rounds.value.length > 0) {
      selectedRoundId.value = rounds.value[0].id;
    }
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRefreshingRounds.value = false;
  }
};

const fetchProjectIds = async (roundId: string) => {
  const contract = await ensureContractAddress();
  const result = await invokeRead({
    contractAddress: contract,
    operation: "getRoundProjects",
    args: [
      { type: "Integer", value: roundId },
      { type: "Integer", value: "0" },
      { type: "Integer", value: "50" },
    ],
  });
  const parsed = parseInvokeResult(result);
  if (!Array.isArray(parsed)) return [] as string[];
  return parsed
    .map((value) => Number.parseInt(String(value || "0"), 10))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => String(value));
};

const fetchProjectDetails = async (projectId: string) => {
  const contract = await ensureContractAddress();
  const details = await invokeRead({
    contractAddress: contract,
    operation: "getProjectDetails",
    args: [{ type: "Integer", value: projectId }],
  });
  const parsed = parseInvokeResult(details) as any;
  return parseProject(parsed, projectId);
};

const refreshProjects = async () => {
  if (!selectedRoundId.value) return;
  if (isRefreshingProjects.value) return;
  try {
    isRefreshingProjects.value = true;
    const ids = await fetchProjectIds(selectedRoundId.value);
    const details = await Promise.all(ids.map(fetchProjectDetails));
    projects.value = details.filter(Boolean) as ProjectItem[];
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRefreshingProjects.value = false;
  }
};

const createRound = async () => {
  if (!requireNeoChain(chainType, t)) return;
  if (isCreatingRound.value) return;
  const title = roundForm.title.trim().slice(0, 60);
  if (!title) {
    setStatus(t("invalidRound"), "error");
    return;
  }

  const startTime = parseDateInput(roundForm.startTime);
  const endTime = parseDateInput(roundForm.endTime);
  if (!startTime || !endTime || startTime >= endTime) {
    setStatus(t("invalidRound"), "error");
    return;
  }

  const decimals = roundForm.asset === "NEO" ? 0 : 8;
  const matchingPool = toFixedDecimals(roundForm.matchingPool, decimals);
  if (!matchingPool || matchingPool === "0") {
    setStatus(t("invalidMatchingPool"), "error");
    return;
  }

  try {
    isCreatingRound.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    const assetHash = roundForm.asset === "NEO" ? NEO_HASH : GAS_HASH;
    const description = roundForm.description.trim().slice(0, 240);

    await invokeContract({
      scriptHash: contract,
      operation: "createRound",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Hash160", value: assetHash },
        { type: "Integer", value: matchingPool },
        { type: "Integer", value: startTime.toString() },
        { type: "Integer", value: endTime.toString() },
        { type: "String", value: title },
        { type: "String", value: description },
      ],
    });

    setStatus(t("roundCreated"), "success");
    roundForm.title = "";
    roundForm.description = "";
    roundForm.matchingPool = "";
    roundForm.startTime = "";
    roundForm.endTime = "";

    await refreshRounds();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isCreatingRound.value = false;
  }
};

const registerProject = async () => {
  if (!requireNeoChain(chainType, t)) return;
  if (isRegisteringProject.value) return;
  if (!selectedRoundId.value) {
    setStatus(t("noSelectedRound"), "error");
    return;
  }

  const name = projectForm.name.trim().slice(0, 60);
  if (!name) {
    setStatus(t("invalidProject"), "error");
    return;
  }

  try {
    isRegisteringProject.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    const description = projectForm.description.trim().slice(0, 300);
    const link = projectForm.link.trim().slice(0, 200);

    await invokeContract({
      scriptHash: contract,
      operation: "registerProject",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: selectedRoundId.value },
        { type: "String", value: name },
        { type: "String", value: description },
        { type: "String", value: link },
      ],
    });

    setStatus(t("projectRegistered"), "success");
    projectForm.name = "";
    projectForm.description = "";
    projectForm.link = "";

    await refreshProjects();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRegisteringProject.value = false;
  }
};

const contribute = async () => {
  if (!requireNeoChain(chainType, t)) return;
  if (isContributing.value) return;
  if (!selectedRound.value) {
    setStatus(t("noSelectedRound"), "error");
    return;
  }

  const parsedProjectId = Number.parseInt(contributeForm.projectId.trim(), 10);
  if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
    setStatus(t("invalidContribution"), "error");
    return;
  }

  const decimals = selectedRound.value.assetSymbol === "NEO" ? 0 : 8;
  const amount = toFixedDecimals(contributeForm.amount, decimals);
  if (!amount || amount === "0") {
    setStatus(t("invalidContribution"), "error");
    return;
  }

  try {
    isContributing.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    const memo = contributeForm.memo.trim().slice(0, 160);

    await invokeContract({
      scriptHash: contract,
      operation: "contribute",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: selectedRoundId.value },
        { type: "Integer", value: String(parsedProjectId) },
        { type: "Integer", value: amount },
        { type: "String", value: memo },
      ],
    });

    setStatus(t("contributionSent"), "success");
    contributeForm.amount = "";
    contributeForm.memo = "";

    await refreshProjects();
    await refreshRounds();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isContributing.value = false;
  }
};

const addMatchingPool = async () => {
  if (!requireNeoChain(chainType, t)) return;
  if (!selectedRound.value) return;
  if (isAddingMatching.value) return;

  const decimals = selectedRound.value.assetSymbol === "NEO" ? 0 : 8;
  const amount = toFixedDecimals(matchingForm.amount, decimals);
  if (!amount || amount === "0") {
    setStatus(t("invalidMatchingPool"), "error");
    return;
  }

  try {
    isAddingMatching.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "addMatchingPool",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: selectedRound.value.id },
        { type: "Integer", value: amount },
      ],
    });

    setStatus(t("matchingAdded"), "success");
    matchingForm.amount = "";

    await refreshRounds();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isAddingMatching.value = false;
  }
};

const parseJsonArray = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const finalizeRound = async () => {
  if (!requireNeoChain(chainType, t)) return;
  if (!selectedRound.value) return;
  if (isFinalizing.value) return;

  const projectIdsRaw = parseJsonArray(finalizeForm.projectIds.trim());
  const matchedRaw = parseJsonArray(finalizeForm.matchedAmounts.trim());
  if (!projectIdsRaw || !matchedRaw || projectIdsRaw.length !== matchedRaw.length || projectIdsRaw.length === 0) {
    setStatus(t("invalidRound"), "error");
    return;
  }

  const projectIds = projectIdsRaw
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => String(value));

  const decimals = selectedRound.value.assetSymbol === "NEO" ? 0 : 8;
  const matchedAmounts = matchedRaw.map((value) => toFixedDecimals(String(value), decimals));

  if (projectIds.length !== matchedAmounts.length || projectIds.length === 0) {
    setStatus(t("invalidRound"), "error");
    return;
  }

  try {
    isFinalizing.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "finalizeRound",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: selectedRound.value.id },
        {
          type: "Array",
          value: projectIds.map((value) => ({ type: "Integer", value })),
        },
        {
          type: "Array",
          value: matchedAmounts.map((value) => ({ type: "Integer", value })),
        },
      ],
    });

    setStatus(t("roundFinalized"), "success");
    finalizeForm.projectIds = "";
    finalizeForm.matchedAmounts = "";

    await refreshRounds();
    await refreshProjects();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isFinalizing.value = false;
  }
};

const claimProject = async (project: ProjectItem) => {
  if (!requireNeoChain(chainType, t)) return;
  if (claimingProjectId.value) return;
  try {
    claimingProjectId.value = project.id;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "claimProject",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: project.id },
      ],
    });

    setStatus(t("projectClaimed"), "success");
    await refreshProjects();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    claimingProjectId.value = null;
  }
};

const claimUnusedMatching = async () => {
  if (!requireNeoChain(chainType, t)) return;
  if (!selectedRound.value) return;
  if (isClaimingUnused.value) return;
  try {
    isClaimingUnused.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "claimUnusedMatching",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: selectedRound.value.id },
      ],
    });

    setStatus(t("unusedClaimed"), "success");
    await refreshRounds();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isClaimingUnused.value = false;
  }
};

const canClaimProject = (project: ProjectItem) => {
  if (!selectedRound.value) return false;
  if (!address.value) return false;
  return selectedRound.value.finalized && !selectedRound.value.cancelled && !project.claimed && project.owner === address.value;
};

const onTabChange = async (tabId: string) => {
  activeTab.value = tabId;
  if (tabId === "rounds") {
    await refreshRounds();
  }
  if (tabId === "projects" || tabId === "contribute") {
    await refreshProjects();
  }
};

onMounted(async () => {
  await refreshRounds();
});

watch(selectedRoundId, async (roundId) => {
  if (!roundId) return;
  contributeForm.roundId = roundId;
  await refreshProjects();
});

watch(address, async (newAddr) => {
  if (!newAddr) {
    claimingProjectId.value = null;
  }
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./quadratic-funding-theme.scss";

:global(page) {
  background: linear-gradient(135deg, var(--qf-bg-start) 0%, var(--qf-bg-end) 100%);
  color: var(--qf-text);
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

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.rounds-header,
.projects-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.round-list,
.project-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.round-cards,
.project-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.round-card,
.project-card,
.admin-card,
.project-quicklist {
  background: var(--qf-card-bg);
  border: 1px solid var(--qf-card-border);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.round-card__header,
.project-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.round-title,
.project-title {
  font-size: 15px;
  font-weight: 700;
}

.round-subtitle,
.project-subtitle {
  display: block;
  font-size: 11px;
  color: var(--qf-muted);
  margin-top: 2px;
}

.round-desc,
.project-desc {
  font-size: 12px;
  color: var(--qf-muted);
  line-height: 1.5;
}

.project-link {
  font-size: 11px;
  color: var(--qf-accent);
  word-break: break-all;
}

.round-metrics,
.project-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.metric-label {
  font-size: 10px;
  color: var(--qf-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--qf-accent-strong);
}

.round-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  font-size: 11px;
  color: var(--qf-muted);
}

.round-actions,
.project-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(20, 184, 166, 0.2);
  color: var(--qf-accent);
}

.status-pill.upcoming {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.status-pill.ended {
  background: rgba(251, 191, 36, 0.2);
  color: var(--qf-warn);
}

.status-pill.finalized {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-pill.cancelled {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.status-pill.inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.status-pill.claimed {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.admin-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.admin-subtitle {
  font-size: 11px;
  color: var(--qf-muted);
}

.admin-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 0;
}

.hint-text {
  font-size: 11px;
  color: var(--qf-muted);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--qf-muted);
}

.asset-toggle {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.project-quicklist .chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
</style>
