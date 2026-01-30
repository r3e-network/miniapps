<template>
  <view class="theme-social-karma">
    <ResponsiveLayout
      :title="t('title')"
      :nav-items="navItems"
      :active-tab="activeTab"
      :show-sidebar="isDesktop"
      layout="sidebar"
      @navigate="activeTab = $event"
    >
      <!-- Chain Warning -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <!-- Desktop Sidebar Content -->
      <template #desktop-sidebar>
        <view class="sidebar-karma-card">
          <text class="sidebar-karma-label">{{ t("yourKarma") }}</text>
          <text class="sidebar-karma-value">{{ userKarma }}</text>
          <text class="sidebar-karma-rank">{{ t("rank") }} #{{ userRank || "-" }}</text>
        </view>
        
        <view class="sidebar-quick-actions">
          <text class="sidebar-section-title">{{ t("quickActions") }}</text>
          <button 
            class="sidebar-action-btn" 
            :class="{ checked: hasCheckedIn }"
            :disabled="hasCheckedIn || isCheckingIn"
            @click="dailyCheckIn"
          >
            <text class="action-icon">📅</text>
            <text class="action-label">{{ hasCheckedIn ? t("checkedIn") : t("dailyCheckIn") }}</text>
          </button>
        </view>
      </template>

      <!-- Leaderboard Tab -->
      <view v-if="activeTab === 'leaderboard'" class="tab-content">
        <!-- Mobile: Karma Summary Card -->
        <view v-if="!isDesktop" class="karma-summary-card">
          <view class="karma-info">
            <text class="karma-label">{{ t("totalKarma") }}</text>
            <text class="karma-value">{{ userKarma }}</text>
          </view>
          <view class="karma-divider" />
          <view class="karma-info">
            <text class="karma-label">{{ t("yourRank") }}</text>
            <text class="karma-value rank">#{{ userRank || "-" }}</text>
          </view>
        </view>

        <view class="content-card">
          <view class="card-header">
            <text class="card-title">{{ t("topContributors") }}</text>
            <view class="refresh-btn" @click="loadLeaderboard">
              <text>🔄</text>
            </view>
          </view>
          
          <view v-if="leaderboard.length === 0" class="empty-state">
            <text class="empty-icon">🏆</text>
            <text class="empty-text">{{ t("noActivity") }}</text>
            <text class="empty-subtext">{{ t("beFirst") }}</text>
          </view>
          
          <view v-else class="leaderboard-list">
            <view 
              v-for="(entry, index) in leaderboard" 
              :key="entry.address" 
              class="leaderboard-item"
              :class="{ 'is-me': entry.address === address }"
            >
              <view class="rank-badge" :class="{ 'top-3': index < 3 }">
                <text>{{ index + 1 }}</text>
              </view>
              <view class="user-info">
                <text class="user-address">{{ shortenAddress(entry.address) }}</text>
                <text v-if="entry.address === address" class="user-tag">{{ t("you") }}</text>
              </view>
              <view class="karma-badge">
                <text class="karma-amount">{{ entry.karma }}</text>
                <text class="karma-label-small">Karma</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Earn Tab -->
      <view v-if="activeTab === 'earn'" class="tab-content">
        <!-- Mobile: Daily Check-in Card -->
        <view v-if="!isDesktop" class="content-card checkin-card">
          <view class="checkin-header">
            <text class="card-title">{{ t("dailyCheckIn") }}</text>
            <view v-if="checkInStreak > 0" class="streak-badge">
              <text>🔥 {{ checkInStreak }} {{ t("dayStreak") }}</text>
            </view>
          </view>
          
          <view class="checkin-body">
            <view class="reward-display">
              <text class="reward-amount">+{{ calculateCheckInReward() }}</text>
              <text class="reward-label">{{ t("karmaPoints") }}</text>
            </view>
            
            <button 
              class="action-button primary"
              :disabled="hasCheckedIn || isCheckingIn"
              @click="dailyCheckIn"
            >
              <text v-if="isCheckingIn">{{ t("checkingIn") }}...</text>
              <text v-else-if="hasCheckedIn">✓ {{ t("checkedIn") }}</text>
              <text v-else>{{ t("checkInNow") }}</text>
            </button>
            
            <text v-if="hasCheckedIn" class="next-checkin">
              {{ t("nextCheckIn") }}: {{ nextCheckInTime }}
            </text>
          </view>
        </view>

        <!-- Give Karma Card -->
        <view class="content-card">
          <text class="card-title">{{ t("giveKarma") }}</text>
          <text class="card-subtitle">{{ t("appreciateSomeone") }}</text>
          
          <view class="form-group">
            <label>{{ t("recipientAddress") }}</label>
            <input 
              v-model="rewardAddress" 
              class="form-input" 
              :placeholder="t('enterAddress')"
            />
          </view>
          
          <view class="form-row">
            <view class="form-group half">
              <label>{{ t("amount") }}</label>
              <input
                v-model.number="rewardAmount"
                type="number"
                class="form-input"
                :placeholder="t('amount')"
                min="1"
                max="100"
              />
            </view>
            <view class="form-group half">
              <label>&nbsp;</label>
              <view class="amount-presets">
                <button 
                  v-for="amt in [10, 25, 50, 100]" 
                  :key="amt"
                  class="preset-btn"
                  :class="{ active: rewardAmount === amt }"
                  @click="rewardAmount = amt"
                >
                  {{ amt }}
                </button>
              </view>
            </view>
          </view>
          
          <view class="form-group">
            <label>{{ t("reason") }} ({{ t("optional") }})</label>
            <textarea 
              v-model="rewardReason" 
              class="form-textarea" 
              :placeholder="t('enterReason')"
              maxlength="200"
            />
          </view>
          
          <button 
            class="action-button primary"
            :disabled="isGiving || !isValidReward()"
            @click="giveKarma"
          >
            <text v-if="isGiving">{{ t("sending") }}...</text>
            <text v-else>{{ t("giveKarmaBtn") }} (0.1 GAS)</text>
          </button>
        </view>
      </view>

      <!-- Profile Tab -->
      <view v-if="activeTab === 'profile'" class="tab-content">
        <view class="content-card">
          <text class="card-title">{{ t("yourBadges") }}</text>
          <view class="badges-grid">
            <view 
              v-for="badge in userBadges" 
              :key="badge.id" 
              class="badge-item"
              :class="{ unlocked: badge.unlocked, locked: !badge.unlocked }"
            >
              <view class="badge-icon-wrapper">
                <text class="badge-icon">{{ badge.icon }}</text>
                <view v-if="badge.unlocked" class="badge-check">✓</view>
              </view>
              <text class="badge-name">{{ badge.name }}</text>
              <text v-if="!badge.unlocked" class="badge-hint">{{ badge.hint }}</text>
            </view>
          </view>
        </view>

        <view class="content-card">
          <text class="card-title">{{ t("achievements") }}</text>
          <view class="achievements-list">
            <view
              v-for="achievement in achievements"
              :key="achievement.id"
              class="achievement-item"
              :class="{ unlocked: achievement.unlocked }"
            >
              <view class="achievement-left">
                <text class="achievement-icon">{{ achievement.unlocked ? '🏆' : '🔒' }}</text>
                <view class="achievement-info">
                  <text class="achievement-name">{{ achievement.name }}</text>
                  <view class="progress-bar">
                    <view class="progress-fill" :style="{ width: achievement.percent + '%' }" />
                  </view>
                </view>
              </view>
              <text class="achievement-progress">{{ achievement.progress }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Docs Tab -->
      <view v-if="activeTab === 'docs'" class="tab-content">
        <NeoDoc
          :title="t('title')"
          :subtitle="t('docSubtitle')"
          :description="t('docDescription')"
          :steps="docSteps"
          :features="docFeatures"
        />
      </view>

      <!-- Error Toast -->
      <view v-if="errorMessage" class="error-toast">
        <text>{{ errorMessage }}</text>
      </view>
    </ResponsiveLayout>
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
import { ResponsiveLayout, NeoDoc, ChainWarning } from "@shared/components";
import type { NavItem } from "@shared/components/ResponsiveLayout.vue";

const { t } = useI18n();
const APP_ID = "miniapp-social-karma";

const navItems = computed<NavItem[]>(() => [
  { key: "leaderboard", label: t("leaderboard"), icon: "🏆" },
  { key: "earn", label: t("earn"), icon: "✨" },
  { key: "profile", label: t("profile"), icon: "👤" },
  { key: "docs", label: t("docs"), icon: "📖" },
]);

const activeTab = ref("leaderboard");
const { address, invokeContract, invokeRead, chainType, getContractAddress } = useWallet() as WalletSDK;
const { processPayment, waitForEvent } = usePaymentFlow(APP_ID);

const contractAddress = ref<string | null>(null);
const leaderboard = ref<any[]>([]);
const userKarma = ref(0);
const userRank = ref(0);
const checkInStreak = ref(0);
const hasCheckedIn = ref(false);
const nextCheckInTime = ref("-");
const isCheckingIn = ref(false);
const isGiving = ref(false);
const rewardAddress = ref("");
const rewardAmount = ref(10);
const rewardReason = ref("");
const errorMessage = ref<string | null>(null);

const isDesktop = computed(() => {
  try {
    return window.innerWidth >= 768;
  } catch {
    return false;
  }
});

const userBadges = ref([
  { id: "first", icon: "🌟", name: t("earlyAdopter"), unlocked: true, hint: t("joinEarly") },
  { id: "helpful", icon: "🤝", name: t("helpful"), unlocked: false, hint: t("helpHint") },
  { id: "generous", icon: "🎁", name: t("generous"), unlocked: false, hint: t("giveHint") },
  { id: "verified", icon: "✓", name: t("verified"), unlocked: false, hint: t("verifyHint") },
  { id: "contributor", icon: "⭐", name: t("contributor"), unlocked: false, hint: t("contribHint") },
  { id: "champion", icon: "🏆", name: t("champion"), unlocked: false, hint: t("championHint") },
  { id: "legend", icon: "👑", name: t("legend"), unlocked: false, hint: t("legendHint") },
  { id: "streak7", icon: "🔥", name: t("weekStreak"), unlocked: false, hint: t("streak7Hint") },
]);

const achievements = computed(() => [
  { 
    id: "first", 
    name: t("firstKarma"), 
    progress: `${Math.min(userKarma.value, 1)}/1`, 
    percent: Math.min(userKarma.value / 1 * 100, 100),
    unlocked: userKarma.value >= 1 
  },
  { 
    id: "k10", 
    name: t("karma10"), 
    progress: `${Math.min(userKarma.value, 10)}/10`,
    percent: Math.min(userKarma.value / 10 * 100, 100),
    unlocked: userKarma.value >= 10 
  },
  { 
    id: "k100", 
    name: t("karma100"), 
    progress: `${Math.min(userKarma.value, 100)}/100`,
    percent: Math.min(userKarma.value / 100 * 100, 100),
    unlocked: userKarma.value >= 100 
  },
  { 
    id: "k1000", 
    name: t("karma1000"), 
    progress: `${Math.min(userKarma.value, 1000)}/1000`,
    percent: Math.min(userKarma.value / 1000 * 100, 100),
    unlocked: userKarma.value >= 1000 
  },
  { 
    id: "gifter", 
    name: t("gifter"), 
    progress: "0/1", 
    percent: 0,
    unlocked: false 
  },
  { 
    id: "philanthropist", 
    name: t("philanthropist"), 
    progress: "0/100", 
    percent: 0,
    unlocked: false 
  },
]);

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
  { name: t("feature3Name"), desc: t("feature3Desc") },
  { name: t("feature4Name"), desc: t("feature4Desc") },
]);

const calculateCheckInReward = () => {
  const base = 10;
  const bonus = Math.min(checkInStreak.value, 7);
  return base + bonus;
};

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
    // Use mock data for demo
    leaderboard.value = [
      { address: "0x1234...5678", karma: 1500 },
      { address: "0xabcd...efgh", karma: 1200 },
      { address: "0x9876...5432", karma: 980 },
    ];
  }
};

const loadUserState = async () => {
  if (!address.value || !(await ensureContractAddress())) return;
  try {
    const state = await invokeRead({
      scriptHash: contractAddress.value as string,
      operation: "getUserCheckInState",
      args: [{ type: "Hash160", value: address.value }],
    });
    if (state) {
      hasCheckedIn.value = (state as any).checkedIn || false;
      checkInStreak.value = Number((state as any).streak || 0);
    }
  } catch (e: any) {
    console.error("Failed to load user state:", e);
  }
};

const dailyCheckIn = async () => {
  if (!address.value) {
    showError(t("connectWallet"));
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
      checkInStreak.value += 1;
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
  if (!addr) return "";
  if (addr.length <= 12) return addr;
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
.theme-social-karma {
  --karma-primary: #f59e0b;
  --karma-secondary: #8b5cf6;
  --karma-success: #10b981;
  --karma-bg: #0f0f23;
  --karma-card-bg: rgba(255, 255, 255, 0.05);
  --karma-text: #ffffff;
  --karma-text-secondary: rgba(255, 255, 255, 0.7);
  --karma-text-muted: rgba(255, 255, 255, 0.5);
  --karma-border: rgba(255, 255, 255, 0.1);
}

// Mobile-first styles (default)
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

// Desktop override
@media (min-width: 768px) {
  .tab-content {
    gap: 24px;
    padding: 0;
  }
}

// Cards
.content-card {
  background: var(--karma-card-bg);
  border: 1px solid var(--karma-border);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
  
  @media (min-width: 768px) {
    padding: 24px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--karma-text);
  
  @media (min-width: 768px) {
    font-size: 20px;
  }
}

.card-subtitle {
  font-size: 14px;
  color: var(--karma-text-secondary);
  margin-bottom: 16px;
  display: block;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

// Mobile Karma Summary
.karma-summary-card {
  display: flex;
  background: linear-gradient(135deg, var(--karma-primary), var(--karma-secondary));
  border-radius: 16px;
  padding: 20px;
  
  .karma-info {
    flex: 1;
    text-align: center;
    
    &:first-child {
      border-right: 1px solid rgba(255, 255, 255, 0.2);
    }
  }
  
  .karma-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 4px;
  }
  
  .karma-value {
    font-size: 28px;
    font-weight: 700;
    color: white;
    
    &.rank {
      font-size: 24px;
    }
  }
}

// Desktop Sidebar
.sidebar-karma-card {
  background: linear-gradient(135deg, var(--karma-primary), var(--karma-secondary));
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  text-align: center;
  
  .sidebar-karma-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
  }
  
  .sidebar-karma-value {
    font-size: 36px;
    font-weight: 700;
    color: white;
    margin: 8px 0;
  }
  
  .sidebar-karma-rank {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
  }
}

.sidebar-quick-actions {
  .sidebar-section-title {
    font-size: 12px;
    color: var(--karma-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    display: block;
  }
}

.sidebar-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--karma-border);
  border-radius: 12px;
  color: var(--karma-text);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--karma-primary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.checked {
    background: rgba(16, 185, 129, 0.2);
    border-color: var(--karma-success);
  }
  
  .action-icon {
    font-size: 20px;
  }
  
  .action-label {
    font-size: 14px;
    font-weight: 500;
  }
}

// Leaderboard
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &.is-me {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: var(--karma-text-secondary);
  
  &.top-3 {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: white;
  }
}

.user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-address {
  font-size: 14px;
  color: var(--karma-text);
  font-family: monospace;
}

.user-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--karma-primary);
  color: white;
  border-radius: 99px;
  font-weight: 600;
}

.karma-badge {
  text-align: right;
}

.karma-amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--karma-success);
  display: block;
}

.karma-label-small {
  font-size: 10px;
  color: var(--karma-text-muted);
  text-transform: uppercase;
}

// Empty State
.empty-state {
  text-align: center;
  padding: 48px 24px;
  
  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
  }
  
  .empty-text {
    font-size: 16px;
    color: var(--karma-text);
    font-weight: 600;
    display: block;
    margin-bottom: 8px;
  }
  
  .empty-subtext {
    font-size: 14px;
    color: var(--karma-text-secondary);
  }
}

// Check-in Card
.checkin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.streak-badge {
  padding: 6px 12px;
  background: rgba(245, 158, 11, 0.2);
  border-radius: 99px;
  font-size: 13px;
  color: var(--karma-primary);
  font-weight: 600;
}

.checkin-body {
  text-align: center;
  padding: 20px 0;
}

.reward-display {
  margin-bottom: 20px;
}

.reward-amount {
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--karma-primary), var(--karma-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: block;
}

.reward-label {
  font-size: 14px;
  color: var(--karma-text-secondary);
}

.next-checkin {
  font-size: 13px;
  color: var(--karma-text-muted);
  margin-top: 12px;
  display: block;
}

// Form Elements
.form-group {
  margin-bottom: 16px;
  
  label {
    font-size: 13px;
    color: var(--karma-text-secondary);
    margin-bottom: 6px;
    display: block;
  }
  
  &.half {
    flex: 1;
  }
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--karma-border);
  border-radius: 10px;
  color: var(--karma-text);
  font-size: 15px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: var(--karma-primary);
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: var(--karma-text-muted);
  }
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

.amount-presets {
  display: flex;
  gap: 8px;
}

.preset-btn {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--karma-border);
  border-radius: 8px;
  color: var(--karma-text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.active {
    background: var(--karma-primary);
    border-color: var(--karma-primary);
    color: white;
  }
}

// Action Buttons
.action-button {
  width: 100%;
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &.primary {
    background: linear-gradient(135deg, var(--karma-primary), var(--karma-secondary));
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Badges Grid
.badges-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

.badge-item {
  text-align: center;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  transition: all 0.2s;
  
  &.unlocked {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  &.locked {
    opacity: 0.5;
    filter: grayscale(0.5);
  }
}

.badge-icon-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 8px;
}

.badge-icon {
  font-size: 32px;
}

.badge-check {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: var(--karma-success);
  border-radius: 50%;
  font-size: 10px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-name {
  font-size: 11px;
  color: var(--karma-text);
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.badge-hint {
  font-size: 10px;
  color: var(--karma-text-muted);
}

// Achievements
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.achievement-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  transition: all 0.2s;
  
  &.unlocked {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
}

.achievement-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.achievement-icon {
  font-size: 20px;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-size: 14px;
  color: var(--karma-text);
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--karma-primary), var(--karma-secondary));
  transition: width 0.3s ease;
}

.achievement-progress {
  font-size: 13px;
  color: var(--karma-text-secondary);
  font-weight: 600;
}

// Error Toast
.error-toast {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 24px;
  background: #ef4444;
  color: white;
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
</style>
