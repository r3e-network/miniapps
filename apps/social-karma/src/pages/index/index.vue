<template>
  <view class="theme-social-karma">
    <DesktopLayout title="Social Karma" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <!-- Leaderboard Tab -->
      <view v-if="activeTab === 'leaderboard'" class="tab-content scrollable">
        <view class="karma-summary">
          <text class="summary-label">{{ t("totalKarma") }}: {{ userKarma }}</text>
          <text class="summary-rank">{{ t("yourRank") }}: #{{ userRank }}</text>
        </view>

        <view class="leaderboard-section">
          <text class="section-title">{{ t("topContributors") }}</text>
          <view v-if="leaderboard.length === 0" class="empty-state">
            <text>{{ t("noActivity") }}</text>
          </view>
          <view v-else class="leaderboard-list">
            <view v-for="(entry, index) in leaderboard" :key="entry.address" class="leaderboard-item">
              <text class="rank-num">{{ index + 1 }}</text>
              <text class="user-address">{{ shortenAddress(entry.address) }}</text>
              <text class="user-score">{{ entry.karma }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Earn Tab -->
      <view v-if="activeTab === 'earn'" class="tab-content scrollable">
        <view class="earn-section">
          <text class="section-title">{{ t("dailyCheckIn") }}</text>
          <view class="checkin-card">
            <text class="reward-text">{{ t("checkInReward") }}</text>
            <button class="checkin-button" :disabled="hasCheckedIn || isCheckingIn" @click="dailyCheckIn">
              <text>{{ hasCheckedIn ? t("checkedIn") : isCheckingIn ? t("loading") : t("dailyCheckIn") }}</text>
            </button>
            <text v-if="!hasCheckedIn" class="next-time"
              >{{ t("nextCheckIn") }}: {{ nextCheckInTime }} {{ t("hours") }}</text
            >
          </view>
        </view>

        <view class="give-karma-section">
          <text class="section-title">{{ t("giveKarma") }}</text>
          <input v-model="rewardAddress" class="address-input" :placeholder="t('selectUser')" />
          <input
            v-model.number="rewardAmount"
            type="number"
            class="amount-input"
            :placeholder="t('amount')"
            min="1"
            max="100"
          />
          <textarea v-model="rewardReason" class="reason-input" :placeholder="t('reason')" maxlength="200" />
          <button class="give-button" :disabled="isGiving || !isValidReward()" @click="giveKarma">
            <text>{{ isGiving ? t("loading") : t("rewardUser") }}</text>
          </button>
        </view>
      </view>

      <!-- Profile Tab -->
      <view v-if="activeTab === 'profile'" class="tab-content scrollable">
        <view class="profile-section">
          <text class="section-title">{{ t("badgeList") }}</text>
          <view class="badges-grid">
            <view v-for="badge in userBadges" :key="badge.id" class="badge-item" :class="{ unlocked: badge.unlocked }">
              <text class="badge-icon">{{ badge.icon }}</text>
              <text class="badge-name">{{ badge.name }}</text>
            </view>
          </view>
        </view>

        <view class="achievements-section">
          <text class="section-title">{{ t("achievements") }}</text>
          <view class="achievements-list">
            <view
              v-for="achievement in achievements"
              :key="achievement.id"
              class="achievement-item"
              :class="{ unlocked: achievement.unlocked }"
            >
              <text class="achievement-name">{{ achievement.name }}</text>
              <text class="achievement-progress">{{ achievement.progress }}</text>
            </view>
          </view>
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

      <view v-if="errorMessage" class="error-toast">
        <text>{{ errorMessage }}</text>
      </view>
    </DesktopLayout>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { parseInvokeResult } from "@shared/utils/neo";
import { requireNeoChain } from "@shared/utils/chain";
import { usePaymentFlow } from "@shared/composables/usePaymentFlow";
import { useI18n } from "@/composables/useI18n";
import { DesktopLayout, NeoDoc, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";

const { t } = useI18n();
const APP_ID = "miniapp-social-karma";

const navTabs = computed<NavTab[]>(() => [
  { id: "leaderboard", icon: "trophy", label: t("leaderboard") },
  { id: "earn", icon: "star", label: t("earn") },
  { id: "profile", icon: "user", label: t("profile") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const activeTab = ref("leaderboard");
const { address, invokeContract, invokeRead, chainType, getContractAddress } = useWallet() as WalletSDK;
const { processPayment, waitForEvent } = usePaymentFlow(APP_ID);

const contractAddress = ref<string | null>(null);
const leaderboard = ref<any[]>([]);
const userKarma = ref(0);
const userRank = ref(0);
const hasCheckedIn = ref(false);
const nextCheckInTime = ref(0);
const isCheckingIn = ref(false);
const isGiving = ref(false);
const rewardAddress = ref("");
const rewardAmount = ref(10);
const rewardReason = ref("");
const errorMessage = ref<string | null>(null);

const userBadges = ref([
  { id: "early", icon: "🌟", name: t("earlyAdopter"), unlocked: true },
  { id: "helpful", icon: "🤝", name: t("helpful"), unlocked: false },
  { id: "generous", icon: "🎁", name: t("generous"), unlocked: false },
  { id: "verified", icon: "✓", name: t("verified"), unlocked: false },
  { id: "contributor", icon: "⭐", name: t("contributor"), unlocked: false },
  { id: "champion", icon: "🏆", name: t("champion"), unlocked: false },
  { id: "legend", icon: "👑", name: t("legend"), unlocked: false },
]);

const achievements = computed(() => [
  { id: "first", name: t("firstKarma"), progress: "0/1", unlocked: userKarma.value >= 1 },
  { id: "k10", name: t("karma10"), progress: `${Math.min(userKarma.value, 10)}/10`, unlocked: userKarma.value >= 10 },
  {
    id: "k100",
    name: t("karma100"),
    progress: `${Math.min(userKarma.value, 100)}/100`,
    unlocked: userKarma.value >= 100,
  },
  {
    id: "k1000",
    name: t("karma1000"),
    progress: `${Math.min(userKarma.value, 1000)}/1000`,
    unlocked: userKarma.value >= 1000,
  },
  { id: "gifter", name: t("gifter"), progress: "0/1", unlocked: false },
  { id: "receiver", name: t("receiver"), progress: "0/1", unlocked: false },
  { id: "philanthropist", name: t("philanthropist"), progress: "0/100", unlocked: false },
]);

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: "Daily Rewards", desc: "Earn karma every day" },
  { name: "Social Graph", desc: "Reward helpful community members" },
  { name: "Achievements", desc: "Unlock badges as you contribute" },
  { name: "Leaderboard", desc: "Compete with top contributors" },
]);

const ensureContractAddress = async (): Promise<boolean> => {
  if (!requireNeoChain(chainType, t)) return false;
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  return !!contractAddress.value;
};

const loadLeaderboard = async () => {
  if (!(await ensureContractAddress())) return;
  try {
    const result = await invokeRead({
      scriptHash: contractAddress.value as string,
      operation: "getLeaderboard",
      args: [],
    });
    const parsed = parseInvokeResult(result) as unknown[];
    if (Array.isArray(parsed)) {
      leaderboard.value = parsed.map((e: any) => ({
        address: String(e.address || ""),
        karma: Number(e.karma || 0),
      }));
    }
    const userEntry = leaderboard.value.find((e: any) => e.address === address.value);
    if (userEntry) {
      userKarma.value = userEntry.karma;
      userRank.value = leaderboard.value.indexOf(userEntry) + 1;
    }
  } catch (e: any) {
    console.error("Failed to load leaderboard:", e);
  }
};

const loadUserState = async () => {
  if (!address.value || !(await ensureContractAddress())) return;
  try {
    const state = await invokeRead({
      scriptHash: contractAddress.value as string,
      operation: "getUserState",
      args: [{ type: "Hash160", value: address.value }],
    });
    if (state) {
      hasCheckedIn.value = (state as any).checkedIn || false;
    }
  } catch (e: any) {
    console.error("Failed to load user state:", e);
  }
};

const dailyCheckIn = async () => {
  if (!address.value) {
    showError(t("wpTitle"));
    return;
  }
  if (!(await ensureContractAddress())) return;

  try {
    isCheckingIn.value = true;
    const { receiptId, invoke } = await processPayment("0.1", "checkin");

    const tx = (await invoke(
      "dailyCheckIn",
      [{ type: "Integer", value: String(receiptId) }],
      contractAddress.value as string,
    )) as { txid: string };

    if (tx.txid) {
      await waitForEvent(tx.txid, "KarmaEarned");
      hasCheckedIn.value = true;
      await loadLeaderboard();
    }
  } catch (e: any) {
    showError(e.message || t("error"));
  } finally {
    isCheckingIn.value = false;
  }
};

const isValidReward = (): boolean => {
  return rewardAddress.value.trim().length > 0 && rewardAmount.value >= 1 && rewardAmount.value <= 100;
};

const giveKarma = async () => {
  if (!address.value || !isValidReward()) return;
  if (!(await ensureContractAddress())) return;

  try {
    isGiving.value = true;
    const { receiptId, invoke } = await processPayment("0.1", `reward:${rewardAmount.value}`);

    const tx = (await invoke(
      "giveKarma",
      [
        { type: "Hash160", value: rewardAddress.value },
        { type: "Integer", value: rewardAmount.value },
        { type: "String", value: rewardReason.value },
        { type: "Integer", value: String(receiptId) },
      ],
      contractAddress.value as string,
    )) as { txid: string };

    if (tx.txid) {
      await waitForEvent(tx.txid, "KarmaGiven");
      rewardAddress.value = "";
      rewardAmount.value = 10;
      rewardReason.value = "";
      await loadLeaderboard();
    }
  } catch (e: any) {
    showError(e.message || t("error"));
  } finally {
    isGiving.value = false;
  }
};

const shortenAddress = (addr: string): string => {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
};

const showError = (msg: string) => {
  errorMessage.value = msg;
  setTimeout(() => (errorMessage.value = null), 5000);
};

onMounted(async () => {
  await ensureContractAddress();
  await loadLeaderboard();
  await loadUserState();
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/theme-base.scss" as *;
@import "./social-karma-theme.scss";

// Tab content - works with both mobile and desktop layouts
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--karma-text-primary, var(--text-primary));

  // Remove default padding - DesktopLayout provides padding
  // For mobile AppLayout, padding is handled by the layout itself
}

// Card/Section base styling
.karma-summary,
.leaderboard-section,
.earn-section,
.give-karma-section,
.profile-section {
  background: var(--karma-card-bg, var(--bg-card));
  border: 1px solid var(--karma-card-border, var(--border-color));
  border-radius: var(--radius-lg, 16px);
  padding: 24px;

  // Hover effect for interactive cards
  &:where(.leaderboard-section, .profile-section) {
    transition:
      background var(--transition-normal),
      border-color var(--transition-normal);

    &:hover {
      background: var(--bg-hover);
      border-color: var(--border-color-hover);
    }
  }
}

// Karma Summary - Special gradient card
.karma-summary {
  background: linear-gradient(135deg, var(--karma-accent, #f59e0b), var(--karma-primary, #8b5cf6));
  border: none;
  text-align: center;
  padding: 32px 24px;

  .summary-label {
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    display: block;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-rank {
    font-size: 32px;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }
}

// Section titles
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--karma-text-primary, var(--text-primary));
  margin-bottom: 16px;
  letter-spacing: -0.3px;
}

// Empty state
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--karma-text-muted, var(--text-tertiary));
  font-size: 14px;
}

// Leaderboard list
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--karma-bg-secondary, var(--bg-tertiary));
  border-radius: 12px;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-hover);
    transform: translateX(2px);
  }

  .rank-num {
    font-size: 16px;
    font-weight: 700;
    color: var(--karma-accent, #f59e0b);
    width: 32px;
    text-align: center;
  }

  .user-address {
    font-size: 14px;
    color: var(--karma-text-secondary, var(--text-secondary));
    font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
    flex: 1;
    text-align: center;
  }

  .user-score {
    font-size: 16px;
    font-weight: 700;
    color: var(--karma-success, #10b981);
  }
}

// Check-in card
.checkin-card {
  text-align: center;
  padding: 32px 24px;
  background: var(--karma-bg-secondary, var(--bg-tertiary));
  border-radius: 16px;
  margin-bottom: 16px;

  .reward-text {
    font-size: 36px;
    font-weight: 700;
    color: var(--karma-accent, #f59e0b);
    display: block;
    margin-bottom: 20px;
  }
}

// Buttons
.checkin-button,
.give-button {
  width: 100%;
  padding: 16px;
  background: var(--karma-btn-primary, var(--karma-accent, #f59e0b));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--karma-btn-primary-hover, #d97706);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.next-time {
  font-size: 12px;
  color: var(--karma-text-muted, var(--text-tertiary));
  display: block;
  margin-top: 8px;
}

// Form inputs
.address-input,
.amount-input,
.reason-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--karma-input-bg, var(--bg-primary));
  border: 1px solid var(--karma-input-border, var(--border-color));
  border-radius: 12px;
  color: var(--karma-text-primary, var(--text-primary));
  font-size: 14px;
  margin-bottom: 12px;
  transition: border-color var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--karma-input-focus, #f59e0b);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.reason-input {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

// Badges grid
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.badge-item {
  padding: 16px 12px;
  background: var(--karma-bg-secondary, var(--bg-tertiary));
  border: 1px solid var(--karma-input-border, var(--border-color));
  border-radius: 12px;
  text-align: center;
  opacity: 0.5;
  transition: all var(--transition-normal);

  &.unlocked {
    opacity: 1;
    border-color: var(--karma-accent, #f59e0b);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(139, 92, 246, 0.05));
  }

  .badge-icon {
    font-size: 28px;
    display: block;
    margin-bottom: 8px;
  }

  .badge-name {
    font-size: 11px;
    font-weight: 600;
    color: var(--karma-text-secondary, var(--text-secondary));
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
}

// Achievements list
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.achievement-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--karma-bg-secondary, var(--bg-tertiary));
  border-radius: 12px;
  opacity: 0.5;
  transition: all var(--transition-normal);

  &.unlocked {
    opacity: 1;
    border: 1px solid var(--karma-accent, rgba(245, 158, 11, 0.3));
  }

  .achievement-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--karma-text-primary, var(--text-primary));
  }

  .achievement-progress {
    font-size: 12px;
    font-weight: 500;
    color: var(--karma-text-muted, var(--text-tertiary));
    background: var(--bg-tertiary);
    padding: 4px 10px;
    border-radius: 12px;
  }
}

// Error toast
.error-toast {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: white;
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  z-index: 3000;
  box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(-50%) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

// Scrollable utility
.scrollable {
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
}
</style>
