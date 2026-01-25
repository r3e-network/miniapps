<template>
  <AppLayout class="theme-neo-multisig" :tabs="tabs" :active-tab="activeTab" @tab-change="handleTabChange">
    <!-- Chain Warning - Framework Component -->
    <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />
    <view class="multisig-container">
      <!-- Animated Background -->
      <view class="bg-effects">
        <view class="glow-orb orb-1"></view>
        <view class="glow-orb orb-2"></view>
        <view class="grid-overlay"></view>
      </view>

      <!-- Hero Section -->
      <view class="hero-section">
        <view class="hero-badge">
          <text class="badge-icon">🔐</text>
          <text class="badge-text">{{ t("appTitle") }}</text>
        </view>
        <text class="hero-title">{{ t("homeTitle") }}</text>
        <text class="hero-subtitle">{{ t("homeSubtitle") }}</text>
      </view>

      <!-- Main Action Card -->
      <view class="main-card">
        <!-- Create Button -->
        <view class="create-section">
          <view class="create-btn" @click="navigateToCreate">
            <view class="create-icon">
              <text class="plus-icon">+</text>
            </view>
            <view class="create-content">
              <text class="create-title">{{ t("createCta") }}</text>
              <text class="create-desc">Start a new multi-signature transaction</text>
            </view>
            <text class="create-arrow">→</text>
          </view>
        </view>

        <!-- Divider -->
        <view class="divider">
          <view class="divider-line"></view>
          <text class="divider-text">OR</text>
          <view class="divider-line"></view>
        </view>

        <!-- Load Existing -->
        <view class="load-section">
          <text class="load-label">{{ t("loadTitle") }}</text>
          <view class="load-input-row">
            <view class="input-wrapper">
              <text class="input-icon">🔗</text>
              <input type="text" class="load-input" :placeholder="t('loadPlaceholder')" v-model="idInput" />
            </view>
            <view :class="['load-btn', { disabled: !idInput }]" @click="loadTransaction">
              <text class="load-btn-text">{{ t("loadButton") }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Recent Activity Section -->
      <view class="activity-section">
        <view class="section-header">
          <text class="section-title">{{ t("recentTitle") }}</text>
          <view v-if="history.length > 0" class="activity-count">
            <text class="count-text">{{ history.length }}</text>
          </view>
        </view>

        <!-- Empty State -->
        <view v-if="history.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-title">No Activity Yet</text>
          <text class="empty-desc">{{ t("recentEmpty") }}</text>
        </view>

        <!-- History List -->
        <view v-else class="history-list">
          <view v-for="item in history" :key="item.id" class="history-card" @click="openHistory(item.id)">
            <view class="history-icon">
              <text class="icon-text">{{ getStatusIcon(item.status) }}</text>
            </view>
            <view class="history-content">
              <text class="history-hash">{{ shorten(item.scriptHash) }}</text>
              <text class="history-time">{{ formatDate(item.createdAt) }}</text>
            </view>
            <view :class="['status-badge', item.status]">
              <text class="status-text">{{ statusLabel(item.status) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Quick Stats -->
      <view class="stats-row">
        <view class="stat-card">
          <text class="stat-value">{{ history.length }}</text>
          <text class="stat-label">Total Txs</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ pendingCount }}</text>
          <text class="stat-label">Pending</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ completedCount }}</text>
          <text class="stat-label">Completed</text>
        </view>
      </view>
    </view>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { AppLayout, ChainWarning } from "@shared/components";
import { useI18n } from "@/composables/useI18n";

const { t } = useI18n();

const tabs = computed(() => [
  { id: "home", label: t("tabHome"), icon: "home" },
  { id: "docs", label: t("tabDocs"), icon: "info" },
]);
const activeTab = ref("home");
const idInput = ref("");
const history = ref<any[]>([]);

const pendingCount = computed(() => history.value.filter((h) => h.status === "pending" || h.status === "ready").length);
const completedCount = computed(() => history.value.filter((h) => h.status === "broadcasted").length);

onMounted(() => {
  const saved = uni.getStorageSync("multisig_history");
  if (saved) {
    try {
      history.value = JSON.parse(saved);
    } catch {}
  }
});

const handleTabChange = (tabId: string) => {
  if (tabId === "docs") {
    uni.navigateTo({ url: "/pages/docs/index" });
    return;
  }
  activeTab.value = tabId;
};

const navigateToCreate = () => {
  uni.navigateTo({ url: "/pages/create/index" });
};

const loadTransaction = () => {
  if (!idInput.value) return;
  uni.navigateTo({ url: `/pages/sign/index?id=${idInput.value}` });
};

const openHistory = (id: string) => {
  uni.navigateTo({ url: `/pages/sign/index?id=${id}` });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return "⏳";
    case "ready":
      return "✅";
    case "broadcasted":
      return "🚀";
    case "cancelled":
      return "❌";
    case "expired":
      return "⏰";
    default:
      return "📄";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return t("statusPending");
    case "ready":
      return t("statusReady");
    case "broadcasted":
      return t("statusBroadcasted");
    case "cancelled":
      return t("statusCancelled");
    case "expired":
      return t("statusExpired");
    default:
      return t("statusUnknown");
  }
};

const shorten = (str: string) => (str ? str.slice(0, 8) + "..." + str.slice(-6) : "");
const formatDate = (ts: string) => {
  const date = new Date(ts);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./neo-multisig-theme.scss";
.multisig-container {
  position: relative;
  min-height: 100vh;
  padding: 20px;
  background: var(--multi-bg-gradient);
  overflow: hidden;
}

// Animated Background
.bg-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  animation: float 10s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: var(--multi-orb-one);
  top: -100px;
  left: -100px;
}

.orb-2 {
  width: 200px;
  height: 200px;
  background: var(--multi-orb-two);
  bottom: 100px;
  right: -50px;
  animation-delay: -5s;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--multi-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--multi-grid-line) 1px, transparent 1px);
  background-size: 50px 50px;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(30px, -20px);
  }
}

// Hero Section
.hero-section {
  position: relative;
  z-index: 10;
  text-align: center;
  margin-bottom: 32px;
  padding-top: 20px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--multi-accent-soft);
  border: 1px solid var(--multi-accent-border);
  border-radius: 20px;
  padding: 6px 16px;
  margin-bottom: 16px;
}

.badge-icon {
  font-size: 16px;
}

.badge-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--multi-accent);
}

.hero-title {
  display: block;
  font-size: 28px;
  font-weight: 800;
  color: var(--multi-text);
  margin-bottom: 12px;
  line-height: 1.2;
}

.hero-subtitle {
  display: block;
  font-size: 14px;
  color: var(--multi-text-muted);
  max-width: 280px;
  margin: 0 auto;
  line-height: 1.5;
}

// Main Card
.main-card {
  position: relative;
  z-index: 10;
  background: var(--multi-card-bg);
  border: 1px solid var(--multi-card-border);
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(20px);
}

.create-section {
  margin-bottom: 20px;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--multi-action-gradient);
  border-radius: 16px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--multi-action-shadow);

  &:active {
    transform: scale(0.98);
    box-shadow: var(--multi-action-shadow-press);
  }
}

.create-icon {
  width: 44px;
  height: 44px;
  background: var(--multi-icon-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plus-icon {
  font-size: 24px;
  font-weight: 700;
  color: var(--multi-text);
}

.create-content {
  flex: 1;
}

.create-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--multi-text);
  margin-bottom: 4px;
}

.create-desc {
  display: block;
  font-size: 12px;
  color: var(--multi-text-muted);
}

.create-arrow {
  font-size: 20px;
  color: var(--multi-text-muted);
}

// Divider
.divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--multi-divider);
}

.divider-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--multi-text-soft);
  letter-spacing: 0.1em;
}

// Load Section
.load-section {
  position: relative;
  z-index: 50;

  .load-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--multi-text-muted);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
}

.load-input-row {
  display: flex;
  gap: 12px;
  position: relative;
  z-index: 60;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--multi-input-bg);
  border: 1px solid var(--multi-input-border);
  border-radius: 12px;
  padding: 0 16px;
  transition: all 0.2s ease;
  position: relative;
  z-index: 100;

  &:focus-within {
    border-color: var(--multi-input-focus-border);
    background: var(--multi-input-focus-bg);
  }
}

.input-icon {
  font-size: 16px;
  opacity: 0.5;
  pointer-events: none;
  flex-shrink: 0;
}

.load-input {
  flex: 1;
  background: transparent !important;
  border: none !important;
  color: var(--multi-text);
  font-size: 14px;
  padding: 14px 0;
  font-family: "JetBrains Mono", monospace;
  outline: none !important;
  min-height: 48px;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;

  &::placeholder {
    color: var(--multi-text-soft);
  }
}

.load-btn {
  background: var(--multi-button-bg);
  border: 1px solid var(--multi-button-border);
  border-radius: 12px;
  padding: 14px 24px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:active:not(.disabled) {
    background: var(--multi-button-active-bg);
    border-color: var(--multi-button-active-border);
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.load-btn-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--multi-text);
}

// Activity Section
.activity-section {
  position: relative;
  z-index: 10;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--multi-text);
}

.activity-count {
  background: var(--multi-accent-soft);
  border-radius: 12px;
  padding: 4px 12px;
}

.count-text {
  font-size: 12px;
  font-weight: 700;
  color: var(--multi-accent);
}

// Empty State
.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: var(--multi-card-soft);
  border: 1px dashed var(--multi-divider);
  border-radius: 16px;
}

.empty-icon {
  display: block;
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--multi-text);
  margin-bottom: 8px;
}

.empty-desc {
  display: block;
  font-size: 13px;
  color: var(--multi-text-dim);
}

// History Card
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--multi-card-soft);
  border: 1px solid var(--multi-border-soft);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:active {
    background: var(--multi-accent-soft);
    border-color: var(--multi-accent-border);
  }
}

.history-icon {
  width: 40px;
  height: 40px;
  background: var(--multi-icon-bg-soft);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-text {
  font-size: 18px;
}

.history-content {
  flex: 1;
}

.history-hash {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--multi-text);
  font-family: "JetBrains Mono", monospace;
  margin-bottom: 4px;
}

.history-time {
  display: block;
  font-size: 11px;
  color: var(--multi-text-dim);
}

// Status Badge
.status-badge {
  padding: 4px 10px;
  border-radius: 8px;

  &.pending {
    background: var(--multi-warning-soft);
  }
  &.ready {
    background: var(--multi-info-soft);
  }
  &.broadcasted {
    background: var(--multi-accent-soft);
  }
  &.cancelled {
    background: var(--multi-error-soft);
  }
  &.expired {
    background: var(--multi-expired-soft);
  }
}

.status-text {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  .pending & {
    color: var(--multi-warning);
  }
  .ready & {
    color: var(--multi-info);
  }
  .broadcasted & {
    color: var(--multi-accent);
  }
  .cancelled & {
    color: var(--multi-error);
  }
  .expired & {
    color: var(--multi-text-dim);
  }
}

// Stats Row
.stats-row {
  position: relative;
  z-index: 10;
  display: flex;
  gap: 12px;
}

.stat-card {
  flex: 1;
  background: var(--multi-card-soft);
  border: 1px solid var(--multi-border-soft);
  border-radius: 14px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: var(--multi-accent);
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: var(--multi-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
