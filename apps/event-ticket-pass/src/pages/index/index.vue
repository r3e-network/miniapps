<template>
  <AppLayout class="theme-event-ticket-pass" :tabs="navTabs" :active-tab="activeTab" @tab-change="onTabChange">
    <view v-if="activeTab === 'create'" class="tab-content">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-4 text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <NeoCard variant="erobo-neo">
        <view class="form-group">
          <NeoInput v-model="form.name" :label="t('eventName')" :placeholder="t('eventNamePlaceholder')" />
          <NeoInput v-model="form.venue" :label="t('eventVenue')" :placeholder="t('eventVenuePlaceholder')" />
          <NeoInput v-model="form.start" :label="t('eventStart')" :placeholder="t('eventStartPlaceholder')" />
          <NeoInput v-model="form.end" :label="t('eventEnd')" :placeholder="t('eventEndPlaceholder')" />
          <NeoInput
            v-model="form.maxSupply"
            type="number"
            :label="t('maxSupply')"
            :placeholder="t('maxSupplyPlaceholder')"
          />
          <NeoInput v-model="form.notes" type="textarea" :label="t('notes')" :placeholder="t('notesPlaceholder')" />

          <NeoButton
            variant="primary"
            size="lg"
            block
            :loading="isCreating"
            :disabled="isCreating"
            @click="createEvent"
          >
            {{ isCreating ? t("creating") : t("createEvent") }}
          </NeoButton>
        </view>
      </NeoCard>

      <NeoCard variant="erobo" class="event-list">
        <view class="events-header">
          <text class="section-title">{{ t("yourEvents") }}</text>
          <NeoButton size="sm" variant="secondary" :loading="isRefreshing" @click="refreshEvents">
            {{ t("refresh") }}
          </NeoButton>
        </view>

        <view v-if="!address" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center">
            <text class="text-sm block mb-3">{{ t("walletNotConnected") }}</text>
            <NeoButton size="sm" variant="primary" @click="connectWallet">
              {{ t("connectWallet") }}
            </NeoButton>
          </NeoCard>
        </view>

        <view v-else-if="events.length === 0" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center opacity-70">
            <text class="text-xs">{{ t("emptyEvents") }}</text>
          </NeoCard>
        </view>

        <view v-else class="event-cards">
          <view v-for="event in events" :key="`event-${event.id}`" class="event-card">
            <view class="event-card__header">
              <view>
                <text class="event-title">{{ event.name || `#${event.id}` }}</text>
                <text class="event-subtitle">{{ event.venue || t("venueFallback") }}</text>
              </view>
              <text :class="['status-pill', event.active ? 'active' : 'inactive']">
                {{ event.active ? t("statusActive") : t("statusInactive") }}
              </text>
            </view>

            <view class="event-meta">
              <text class="meta-label">{{ t("eventSchedule") }}</text>
              <text class="meta-value">{{ formatSchedule(event.startTime, event.endTime) }}</text>
            </view>

            <view class="event-metrics">
              <view>
                <text class="metric-label">{{ t("minted") }}</text>
                <text class="metric-value">{{ event.minted.toString() }}</text>
              </view>
              <view>
                <text class="metric-label">{{ t("maxSupply") }}</text>
                <text class="metric-value">{{ event.maxSupply.toString() }}</text>
              </view>
            </view>

            <view class="event-actions">
              <NeoButton
                size="sm"
                variant="primary"
                :disabled="!event.active || event.minted >= event.maxSupply"
                @click="openIssueModal(event)"
              >
                {{ event.minted >= event.maxSupply ? t("soldOut") : t("issueTicket") }}
              </NeoButton>
              <NeoButton size="sm" variant="secondary" :loading="togglingId === event.id" @click="toggleEvent(event)">
                {{ event.active ? t("deactivate") : t("activate") }}
              </NeoButton>
            </view>
          </view>
        </view>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'tickets'" class="tab-content">
      <view class="tickets-header">
        <text class="section-title">{{ t("ticketsTab") }}</text>
        <NeoButton size="sm" variant="secondary" :loading="isRefreshingTickets" @click="refreshTickets">
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

      <view v-else-if="tickets.length === 0" class="empty-state">
        <NeoCard variant="erobo" class="p-6 text-center opacity-70">
          <text class="text-xs">{{ t("emptyTickets") }}</text>
        </NeoCard>
      </view>

      <view v-else class="ticket-grid">
        <view v-for="ticket in tickets" :key="`ticket-${ticket.tokenId}`" class="ticket-card">
          <view class="ticket-card__header">
            <view>
              <text class="ticket-title">{{ ticket.eventName || `#${ticket.eventId}` }}</text>
              <text class="ticket-subtitle">{{ ticket.venue || t("venueFallback") }}</text>
            </view>
            <text :class="['status-pill', ticket.used ? 'used' : 'active']">
              {{ ticket.used ? t("ticketUsed") : t("ticketValid") }}
            </text>
          </view>

          <view class="ticket-meta">
            <text class="meta-label">{{ t("eventSchedule") }}</text>
            <text class="meta-value">{{ formatSchedule(ticket.startTime, ticket.endTime) }}</text>
          </view>

          <view class="ticket-body">
            <view class="ticket-qr" v-if="ticketQrs[ticket.tokenId]">
              <image :src="ticketQrs[ticket.tokenId]" class="ticket-qr__img" mode="aspectFit" />
            </view>
            <view class="ticket-details">
              <text class="detail-row">{{ t("ticketSeat") }}: {{ ticket.seat || t("seatFallback") }}</text>
              <text class="detail-row">{{ t("ticketTokenId") }}: {{ ticket.tokenId }}</text>
              <NeoButton size="sm" variant="secondary" class="copy-btn" @click="copyTokenId(ticket.tokenId)">
                {{ t("copyTokenId") }}
              </NeoButton>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'checkin'" class="tab-content">
      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <NeoCard variant="erobo-neo">
        <view class="form-group">
          <NeoInput
            v-model="checkin.tokenId"
            :label="t('checkinTokenId')"
            :placeholder="t('checkinTokenIdPlaceholder')"
          />
          <view class="checkin-actions">
            <NeoButton size="sm" variant="secondary" :loading="isLookingUp" @click="lookupTicket">
              {{ isLookingUp ? t("lookingUp") : t("lookup") }}
            </NeoButton>
            <NeoButton size="sm" variant="primary" :loading="isCheckingIn" @click="checkInTicket">
              {{ isCheckingIn ? t("checkingIn") : t("checkIn") }}
            </NeoButton>
          </view>
        </view>
      </NeoCard>

      <NeoCard v-if="lookup" variant="erobo" class="lookup-card">
        <view class="ticket-card__header">
          <view>
            <text class="ticket-title">{{ lookup.eventName || `#${lookup.eventId}` }}</text>
            <text class="ticket-subtitle">{{ lookup.venue || t("venueFallback") }}</text>
          </view>
          <text :class="['status-pill', lookup.used ? 'used' : 'active']">
            {{ lookup.used ? t("ticketUsed") : t("ticketValid") }}
          </text>
        </view>
        <view class="ticket-meta">
          <text class="meta-label">{{ t("eventSchedule") }}</text>
          <text class="meta-value">{{ formatSchedule(lookup.startTime, lookup.endTime) }}</text>
        </view>
        <text class="detail-row">{{ t("ticketSeat") }}: {{ lookup.seat || t("seatFallback") }}</text>
        <text class="detail-row">{{ t("ticketTokenId") }}: {{ lookup.tokenId }}</text>
      </NeoCard>
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
  </AppLayout>

  <NeoModal :visible="issueModalOpen" :title="t('issueTicketTitle')" :closeable="true" @close="closeIssueModal">
    <view class="form-group">
      <NeoInput
        v-model="issueForm.recipient"
        :label="t('issueRecipient')"
        :placeholder="t('issueRecipientPlaceholder')"
      />
      <NeoInput v-model="issueForm.seat" :label="t('issueSeat')" :placeholder="t('issueSeatPlaceholder')" />
      <NeoInput v-model="issueForm.memo" :label="t('issueMemo')" :placeholder="t('issueMemoPlaceholder')" />
    </view>

    <template #footer>
      <NeoButton size="sm" variant="secondary" @click="closeIssueModal">
        {{ t("cancel") }}
      </NeoButton>
      <NeoButton size="sm" variant="primary" :loading="isIssuing" @click="issueTicket">
        {{ isIssuing ? t("issuing") : t("issue") }}
      </NeoButton>
    </template>
  </NeoModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import QRCode from "qrcode";
import { useWallet } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { useI18n } from "@/composables/useI18n";
import { AppLayout, NeoCard, NeoButton, NeoInput, NeoModal, NeoDoc, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import { requireNeoChain } from "@shared/utils/chain";
import { addressToScriptHash, parseInvokeResult } from "@shared/utils/neo";

const { t } = useI18n();
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress } = useWallet() as WalletSDK;

const activeTab = ref("create");
const navTabs = computed<NavTab[]>(() => [
  { id: "create", icon: "plus", label: t("createTab") },
  { id: "tickets", icon: "ticket", label: t("ticketsTab") },
  { id: "checkin", icon: "check", label: t("checkinTab") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const form = reactive({
  name: "",
  venue: "",
  start: "",
  end: "",
  maxSupply: "100",
  notes: "",
});

const issueForm = reactive({
  eventId: "",
  recipient: "",
  seat: "",
  memo: "",
});

const checkin = reactive({
  tokenId: "",
});

const status = ref<{ msg: string; type: "success" | "error" } | null>(null);
const isCreating = ref(false);
const isRefreshing = ref(false);
const isRefreshingTickets = ref(false);
const isIssuing = ref(false);
const isCheckingIn = ref(false);
const isLookingUp = ref(false);
const issueModalOpen = ref(false);
const togglingId = ref<string | null>(null);
const contractAddress = ref<string | null>(null);

interface EventItem {
  id: string;
  creator: string;
  name: string;
  venue: string;
  startTime: number;
  endTime: number;
  maxSupply: bigint;
  minted: bigint;
  notes: string;
  active: boolean;
}

interface TicketItem {
  tokenId: string;
  eventId: string;
  eventName: string;
  venue: string;
  startTime: number;
  endTime: number;
  seat: string;
  memo: string;
  issuedTime: number;
  used: boolean;
  usedTime: number;
}

const events = ref<EventItem[]>([]);
const tickets = ref<TicketItem[]>([]);
const ticketQrs = reactive<Record<string, string>>({});
const lookup = ref<TicketItem | null>(null);

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

const encodeTokenId = (tokenId: string) => {
  try {
    const bytes = new TextEncoder().encode(tokenId);
    return btoa(String.fromCharCode(...bytes));
  } catch {
    return tokenId;
  }
};

const parseEvent = (raw: any, id: string): EventItem | null => {
  if (!raw || typeof raw !== "object") return null;
  return {
    id,
    creator: String(raw.creator || ""),
    name: String(raw.name || ""),
    venue: String(raw.venue || ""),
    startTime: Number.parseInt(String(raw.startTime || "0"), 10) || 0,
    endTime: Number.parseInt(String(raw.endTime || "0"), 10) || 0,
    maxSupply: parseBigInt(raw.maxSupply),
    minted: parseBigInt(raw.minted),
    notes: String(raw.notes || ""),
    active: parseBool(raw.active),
  };
};

const parseTicket = (raw: any, tokenId: string): TicketItem | null => {
  if (!raw || typeof raw !== "object") return null;
  return {
    tokenId,
    eventId: String(raw.eventId || ""),
    eventName: String(raw.eventName || ""),
    venue: String(raw.venue || ""),
    startTime: Number.parseInt(String(raw.startTime || "0"), 10) || 0,
    endTime: Number.parseInt(String(raw.endTime || "0"), 10) || 0,
    seat: String(raw.seat || ""),
    memo: String(raw.memo || ""),
    issuedTime: Number.parseInt(String(raw.issuedTime || "0"), 10) || 0,
    used: parseBool(raw.used),
    usedTime: Number.parseInt(String(raw.usedTime || "0"), 10) || 0,
  };
};

const fetchEventIds = async (creatorAddress: string) => {
  const contract = await ensureContractAddress();
  const result = await invokeRead({
    contractAddress: contract,
    operation: "GetCreatorEvents",
    args: [
      { type: "Hash160", value: creatorAddress },
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

const fetchEventDetails = async (eventId: string) => {
  const contract = await ensureContractAddress();
  const details = await invokeRead({
    contractAddress: contract,
    operation: "GetEventDetails",
    args: [{ type: "Integer", value: eventId }],
  });
  const parsed = parseInvokeResult(details) as any;
  return parseEvent(parsed, eventId);
};

const refreshEvents = async () => {
  if (!address.value) return;
  if (isRefreshing.value) return;
  try {
    isRefreshing.value = true;
    const ids = await fetchEventIds(address.value);
    const details = await Promise.all(ids.map(fetchEventDetails));
    events.value = details.filter(Boolean) as EventItem[];
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRefreshing.value = false;
  }
};

const refreshTickets = async () => {
  if (!address.value) return;
  if (isRefreshingTickets.value) return;
  try {
    isRefreshingTickets.value = true;
    const contract = await ensureContractAddress();
    const tokenResult = await invokeRead({
      contractAddress: contract,
      operation: "TokensOf",
      args: [{ type: "Hash160", value: address.value }],
    });
    const parsed = parseInvokeResult(tokenResult);
    if (!Array.isArray(parsed)) {
      tickets.value = [];
      return;
    }
    const tokenIds = parsed.map((value) => String(value || "")).filter(Boolean);

    const details = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const detailResult = await invokeRead({
          contractAddress: contract,
          operation: "GetTicketDetails",
          args: [{ type: "ByteArray", value: encodeTokenId(tokenId) }],
        });
        const detailParsed = parseInvokeResult(detailResult) as any;
        return parseTicket(detailParsed, tokenId);
      }),
    );

    tickets.value = details.filter(Boolean) as TicketItem[];
    await Promise.all(
      tickets.value.map(async (ticket) => {
        if (!ticketQrs[ticket.tokenId]) {
          try {
            ticketQrs[ticket.tokenId] = await QRCode.toDataURL(ticket.tokenId, { margin: 1 });
          } catch {}
        }
      }),
    );
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRefreshingTickets.value = false;
  }
};

const connectWallet = async () => {
  try {
    await connect();
    if (address.value) {
      await refreshEvents();
      await refreshTickets();
    }
  } catch (e: any) {
    setStatus(e.message || t("walletNotConnected"), "error");
  }
};

const createEvent = async () => {
  if (isCreating.value) return;
  if (!requireNeoChain(chainType, t)) return;

  const name = form.name.trim();
  if (!name) {
    setStatus(t("nameRequired"), "error");
    return;
  }

  const startTime = parseDateInput(form.start);
  const endTime = parseDateInput(form.end);
  if (!startTime || !endTime || endTime < startTime) {
    setStatus(t("invalidTime"), "error");
    return;
  }

  const maxSupply = parseBigInt(form.maxSupply);
  if (maxSupply <= 0n) {
    setStatus(t("invalidSupply"), "error");
    return;
  }

  try {
    isCreating.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "CreateEvent",
      args: [
        { type: "Hash160", value: address.value },
        { type: "String", value: name },
        { type: "String", value: form.venue.trim() },
        { type: "Integer", value: String(startTime) },
        { type: "Integer", value: String(endTime) },
        { type: "Integer", value: maxSupply.toString() },
        { type: "String", value: form.notes.trim() },
      ],
    });

    setStatus(t("eventCreated"), "success");
    form.name = "";
    form.venue = "";
    form.start = "";
    form.end = "";
    form.maxSupply = "100";
    form.notes = "";
    await refreshEvents();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isCreating.value = false;
  }
};

const openIssueModal = (event: EventItem) => {
  issueForm.eventId = event.id;
  issueForm.recipient = "";
  issueForm.seat = "";
  issueForm.memo = "";
  issueModalOpen.value = true;
};

const closeIssueModal = () => {
  issueModalOpen.value = false;
};

const issueTicket = async () => {
  if (isIssuing.value) return;
  if (!requireNeoChain(chainType, t)) return;

  const recipient = issueForm.recipient.trim();
  if (!recipient || !addressToScriptHash(recipient)) {
    setStatus(t("invalidRecipient"), "error");
    return;
  }

  try {
    isIssuing.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();

    await invokeContract({
      scriptHash: contract,
      operation: "IssueTicket",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Hash160", value: recipient },
        { type: "Integer", value: issueForm.eventId },
        { type: "String", value: issueForm.seat.trim() },
        { type: "String", value: issueForm.memo.trim() },
      ],
    });

    setStatus(t("ticketIssued"), "success");
    issueModalOpen.value = false;
    await refreshEvents();
    await refreshTickets();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isIssuing.value = false;
  }
};

const toggleEvent = async (event: EventItem) => {
  if (togglingId.value) return;
  if (!requireNeoChain(chainType, t)) return;
  try {
    togglingId.value = event.id;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "SetEventActive",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: event.id },
        { type: "Boolean", value: !event.active },
      ],
    });
    await refreshEvents();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    togglingId.value = null;
  }
};

const lookupTicket = async () => {
  if (isLookingUp.value) return;
  if (!requireNeoChain(chainType, t)) return;
  const tokenId = checkin.tokenId.trim();
  if (!tokenId) {
    setStatus(t("invalidTokenId"), "error");
    return;
  }
  try {
    isLookingUp.value = true;
    const contract = await ensureContractAddress();
    const detailResult = await invokeRead({
      contractAddress: contract,
      operation: "GetTicketDetails",
      args: [{ type: "ByteArray", value: encodeTokenId(tokenId) }],
    });
    const detailParsed = parseInvokeResult(detailResult) as any;
    const parsed = parseTicket(detailParsed, tokenId);
    if (!parsed) {
      setStatus(t("ticketNotFound"), "error");
      lookup.value = null;
      return;
    }
    lookup.value = parsed;
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isLookingUp.value = false;
  }
};

const checkInTicket = async () => {
  if (isCheckingIn.value) return;
  if (!requireNeoChain(chainType, t)) return;
  const tokenId = checkin.tokenId.trim();
  if (!tokenId) {
    setStatus(t("invalidTokenId"), "error");
    return;
  }
  try {
    isCheckingIn.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "CheckIn",
      args: [
        { type: "Hash160", value: address.value },
        { type: "ByteArray", value: encodeTokenId(tokenId) },
      ],
    });
    setStatus(t("checkinSuccess"), "success");
    await lookupTicket();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isCheckingIn.value = false;
  }
};

const copyTokenId = (tokenId: string) => {
  // @ts-ignore
  uni.setClipboardData({
    data: tokenId,
    success: () => {
      setStatus(t("copied"), "success");
    },
  });
};

const onTabChange = async (tab: string) => {
  activeTab.value = tab;
  if (tab === "tickets") {
    await refreshTickets();
  }
  if (tab === "create") {
    await refreshEvents();
  }
};

onMounted(async () => {
  await connect();
  if (address.value) {
    await refreshEvents();
    await refreshTickets();
  }
});

watch(address, async (newAddr) => {
  if (newAddr) {
    await refreshEvents();
    await refreshTickets();
  } else {
    events.value = [];
    tickets.value = [];
    lookup.value = null;
  }
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./event-ticket-pass-theme.scss";

:global(page) {
  background: linear-gradient(135deg, var(--ticket-bg-start) 0%, var(--ticket-bg-end) 100%);
  color: var(--ticket-text);
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

.events-header,
.tickets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.event-cards,
.ticket-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.event-card,
.ticket-card,
.lookup-card {
  background: var(--ticket-card-bg);
  border: 1px solid var(--ticket-card-border);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-card__header,
.ticket-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.event-title,
.ticket-title {
  font-size: 15px;
  font-weight: 700;
}

.event-subtitle,
.ticket-subtitle {
  display: block;
  font-size: 11px;
  color: var(--ticket-muted);
  margin-top: 2px;
}

.event-meta,
.ticket-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ticket-muted);
}

.meta-value {
  font-size: 12px;
}

.event-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.metric-label {
  font-size: 10px;
  color: var(--ticket-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--ticket-accent-strong);
}

.event-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.ticket-body {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 14px;
  align-items: center;
}

.ticket-qr {
  width: 110px;
  height: 110px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ticket-qr__img {
  width: 100px;
  height: 100px;
}

.ticket-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  font-size: 12px;
  color: var(--ticket-muted);
}

.copy-btn {
  align-self: flex-start;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(245, 158, 11, 0.2);
  color: var(--ticket-accent);
}

.status-pill.used {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.status-pill.inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.checkin-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
