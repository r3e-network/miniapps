<template>
  <view class="theme-prediction-market">
    <DesktopLayout title="Prediction Market" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <!-- Markets Tab -->
      <view v-if="activeTab === 'markets'" class="tab-content scrollable">
        <!-- Category Filter -->
        <view class="category-filter">
          <view
            v-for="cat in categories"
            :key="cat.id"
            class="category-chip"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            <text>{{ cat.label }}</text>
          </view>
        </view>

        <!-- Market List -->
        <view class="market-list">
          <view v-if="loadingMarkets" class="loading-state">
            <text>{{ t("loading") }}</text>
          </view>
          <view v-else-if="filteredMarkets.length === 0" class="empty-state">
            <text>{{ t("noMarkets") }}</text>
          </view>
          <MarketCard
            v-else
            v-for="market in filteredMarkets"
            :key="market.id"
            :market="market"
            :t="t as (key: string) => string"
            @click="selectMarket(market)"
          />
        </view>
      </view>

      <!-- Trading Tab (Market Detail) -->
      <view v-if="activeTab === 'trading' && selectedMarket" class="tab-content scrollable">
        <MarketDetail
          :market="selectedMarket"
          :your-orders="yourOrders"
          :your-positions="yourPositions"
          :is-trading="isTrading"
          :t="t as (key: string) => string"
          @trade="executeTrade"
          @cancel-order="cancelOrder"
          @back="
            activeTab = 'markets';
            selectedMarket = null;
          "
        />
      </view>

      <!-- Portfolio Tab -->
      <view v-if="activeTab === 'portfolio'" class="tab-content scrollable">
        <PortfolioView
          :positions="yourPositions"
          :orders="yourOrders"
          :total-value="portfolioValue"
          :total-pnl="totalPnL"
          :t="t as (key: string) => string"
          @claim="claimWinnings"
        />
      </view>

      <!-- Create Tab -->
      <view v-if="activeTab === 'create'" class="tab-content scrollable">
        <CreateMarketForm :is-creating="isCreating" :t="t as (key: string) => string" @submit="createMarket" />
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

      <!-- Error Toast -->
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
import MarketCard from "./components/MarketCard.vue";
import MarketDetail from "./components/MarketDetail.vue";
import PortfolioView from "./components/PortfolioView.vue";
import CreateMarketForm from "./components/CreateMarketForm.vue";

const { t } = useI18n();
const APP_ID = "miniapp-prediction-market";

const navTabs = computed<NavTab[]>(() => [
  { id: "markets", icon: "trending", label: t("markets") },
  { id: "portfolio", icon: "wallet", label: t("portfolio") },
  { id: "create", icon: "add", label: t("create") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const activeTab = ref("markets");
const { address, invokeContract, invokeRead, chainType, getContractAddress, connect } = useWallet() as WalletSDK;
const { processPayment, waitForEvent } = usePaymentFlow(APP_ID);

// State
const contractAddress = ref<string | null>(null);
const selectedMarket = ref<PredictionMarket | null>(null);
const markets = ref<PredictionMarket[]>([]);
const yourOrders = ref<MarketOrder[]>([]);
const yourPositions = ref<MarketPosition[]>([]);
const selectedCategory = ref<string>("all");
const loadingMarkets = ref(false);
const isTrading = ref(false);
const isCreating = ref(false);
const errorMessage = ref<string | null>(null);

// Categories
const categories = computed(() => [
  { id: "all", label: t("categoryAll") },
  { id: "crypto", label: t("categoryCrypto") },
  { id: "sports", label: t("categorySports") },
  { id: "politics", label: t("categoryPolitics") },
  { id: "economics", label: t("categoryEconomics") },
  { id: "entertainment", label: t("categoryEntertainment") },
  { id: "other", label: t("categoryOther") },
]);

// Filtered markets
const filteredMarkets = computed(() => {
  if (selectedCategory.value === "all") return markets.value;
  return markets.value.filter((m) => m.category === selectedCategory.value);
});

// Portfolio calculations
const portfolioValue = computed(() => {
  return yourPositions.value.reduce((sum, pos) => {
    const market = markets.value.find((m) => m.id === pos.marketId);
    if (!market) return sum;
    const currentPrice = pos.outcome === "yes" ? market.yesPrice : market.noPrice;
    return sum + pos.shares * currentPrice;
  }, 0);
});

const totalPnL = computed(() => {
  return yourPositions.value.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
});

// Docs content
const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);

const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
  { name: t("feature3Name"), desc: t("feature3Desc") },
  { name: t("feature4Name"), desc: t("feature4Desc") },
]);

// Market interfaces
interface PredictionMarket {
  id: number;
  question: string;
  description: string;
  category: string;
  endTime: number;
  resolutionTime?: number;
  oracle: string;
  creator: string;
  status: "open" | "closed" | "resolved" | "cancelled";
  yesPrice: number;
  noPrice: number;
  totalVolume: number;
  resolution?: boolean; // true = YES, false = NO
}

interface MarketOrder {
  id: number;
  marketId: number;
  orderType: "buy" | "sell";
  outcome: "yes" | "no";
  price: number;
  shares: number;
  filled: number;
  status: "open" | "filled" | "cancelled";
}

interface MarketPosition {
  marketId: number;
  outcome: "yes" | "no";
  shares: number;
  avgPrice: number;
  currentValue?: number;
  pnl?: number;
}

// Ensure contract address
const ensureContractAddress = async (): Promise<boolean> => {
  if (!requireNeoChain(chainType, t)) return false;
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  return !!contractAddress.value;
};

// Load markets
const loadMarkets = async () => {
  if (!(await ensureContractAddress())) return;

  try {
    loadingMarkets.value = true;
    const result = await invokeRead({
      scriptHash: contractAddress.value as string,
      operation: "getMarkets",
      args: [],
    });

    const parsed = parseInvokeResult(result) as unknown[];
    if (Array.isArray(parsed)) {
      markets.value = parsed.map((m: any) => ({
        id: Number(m.id || 0),
        question: String(m.question || ""),
        description: String(m.description || ""),
        category: String(m.category || "other"),
        endTime: Number(m.endTime || 0) * 1000,
        resolutionTime: m.resolutionTime ? Number(m.resolutionTime) * 1000 : undefined,
        oracle: String(m.oracle || ""),
        creator: String(m.creator || ""),
        status: m.status || "open",
        yesPrice: Number(m.yesPrice || 50) / 100,
        noPrice: Number(m.noPrice || 50) / 100,
        totalVolume: Number(m.totalVolume || 0) / 1e8,
        resolution: m.resolution !== undefined ? Boolean(m.resolution) : undefined,
      }));
    }
  } catch (e: any) {
    showError(e.message || t("failedToLoad"));
  } finally {
    loadingMarkets.value = false;
  }
};

// Load user's orders and positions
const loadUserData = async () => {
  if (!address.value || !(await ensureContractAddress())) return;

  try {
    // Load orders
    const ordersResult = await invokeRead({
      scriptHash: contractAddress.value as string,
      operation: "getUserOrders",
      args: [{ type: "Hash160", value: address.value }],
    });

    const orders = parseInvokeResult(ordersResult) as unknown[];
    if (Array.isArray(orders)) {
      yourOrders.value = orders.map((o: any) => ({
        id: Number(o.id || 0),
        marketId: Number(o.marketId || 0),
        orderType: o.orderType || "buy",
        outcome: o.outcome || "yes",
        price: Number(o.price || 0) / 100,
        shares: Number(o.shares || 0) / 1e8,
        filled: Number(o.filled || 0) / 1e8,
        status: o.status || "open",
      }));
    }

    // Load positions
    const posResult = await invokeRead({
      scriptHash: contractAddress.value as string,
      operation: "getUserPositions",
      args: [{ type: "Hash160", value: address.value }],
    });

    const positions = parseInvokeResult(posResult) as unknown[];
    if (Array.isArray(positions)) {
      yourPositions.value = positions.map((p: any) => ({
        marketId: Number(p.marketId || 0),
        outcome: p.outcome || "yes",
        shares: Number(p.shares || 0) / 1e8,
        avgPrice: Number(p.avgPrice || 0) / 100,
      }));
    }
  } catch (e: any) {
    // Silent fail for user data
  }
};

// Select market
const selectMarket = (market: PredictionMarket) => {
  selectedMarket.value = market;
  activeTab.value = "trading";
};

// Execute trade
const executeTrade = async (trade: {
  outcome: "yes" | "no";
  orderType: "buy" | "sell";
  price: number;
  shares: number;
}) => {
  if (!address.value) {
    showError(t("connectWallet"));
    return;
  }
  if (!(await ensureContractAddress())) return;
  if (!selectedMarket.value) return;

  try {
    isTrading.value = true;

    const cost = trade.price * trade.shares;
    const { receiptId, invoke } = await processPayment(
      cost.toFixed(8),
      `trade:${selectedMarket.value.id}:${trade.outcome}:${trade.orderType}`,
    );

    const tx = (await invoke(
      "placeOrder",
      [
        { type: "Integer", value: selectedMarket.value.id },
        { type: "Boolean", value: trade.outcome === "yes" },
        { type: "Boolean", value: trade.orderType === "buy" },
        { type: "Integer", value: Math.round(trade.price * 100) },
        { type: "Integer", value: Math.round(trade.shares * 1e8) },
        { type: "Integer", value: String(receiptId) },
      ],
      contractAddress.value as string,
    )) as { txid: string };

    if (tx.txid) {
      await waitForEvent(tx.txid, "OrderPlaced");
      await loadMarkets();
      await loadUserData();
    }
  } catch (e: any) {
    showError(e.message || t("error"));
  } finally {
    isTrading.value = false;
  }
};

// Cancel order
const cancelOrder = async (orderId: number) => {
  if (!(await ensureContractAddress())) return;

  try {
    const tx = await invokeContract({
      scriptHash: contractAddress.value as string,
      operation: "cancelOrder",
      args: [{ type: "Integer", value: orderId }],
    });

    const txid = String((tx as any)?.txid || (tx as any)?.txHash || "");
    if (txid) {
      await waitForEvent(txid, "OrderCancelled");
      await loadUserData();
    }
  } catch (e: any) {
    showError(e.message || t("error"));
  }
};

// Claim winnings
const claimWinnings = async (marketId: number) => {
  if (!(await ensureContractAddress())) return;

  try {
    const tx = await invokeContract({
      scriptHash: contractAddress.value as string,
      operation: "claimWinnings",
      args: [{ type: "Integer", value: marketId }],
    });

    const txid = String((tx as any)?.txid || (tx as any)?.txHash || "");
    if (txid) {
      await waitForEvent(txid, "WinningsClaimed");
      await loadUserData();
    }
  } catch (e: any) {
    showError(e.message || t("error"));
  }
};

// Create market
const createMarket = async (data: {
  question: string;
  description: string;
  category: string;
  endDate: number;
  oracle: string;
  initialLiquidity: number;
}) => {
  if (!address.value) {
    showError(t("connectWallet"));
    return;
  }
  if (!(await ensureContractAddress())) return;

  try {
    isCreating.value = true;

    const { receiptId, invoke } = await processPayment(
      data.initialLiquidity.toFixed(8),
      `create:${data.category}:${data.question.slice(0, 50)}`,
    );

    const tx = (await invoke(
      "createMarket",
      [
        { type: "String", value: data.question },
        { type: "String", value: data.description },
        { type: "String", value: data.category },
        { type: "Integer", value: Math.floor(data.endDate / 1000) },
        { type: "Hash160", value: data.oracle },
        { type: "Integer", value: String(receiptId) },
      ],
      contractAddress.value as string,
    )) as { txid: string };

    if (tx.txid) {
      await waitForEvent(tx.txid, "MarketCreated");
      await loadMarkets();
      activeTab.value = "markets";
    }
  } catch (e: any) {
    showError(e.message || t("marketCreationFailed"));
  } finally {
    isCreating.value = false;
  }
};

// Show error
const showError = (msg: string) => {
  errorMessage.value = msg;
  setTimeout(() => {
    errorMessage.value = null;
  }, 5000);
};

// Initialize
onMounted(async () => {
  await ensureContractAddress();
  await loadMarkets();
  await loadUserData();
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/theme-base.scss" as *;
@import "./prediction-market-theme.scss";

// Tab content - works with both mobile and desktop layouts
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4, 16px);
  color: var(--predict-text-primary, var(--text-primary, #f8fafc));

  // Remove default padding - DesktopLayout provides padding
  // For mobile AppLayout, padding is handled by the layout itself
}

.category-filter {
  display: flex;
  gap: var(--spacing-2, 8px);
  flex-wrap: wrap;
  padding: var(--spacing-1, 4px) 0;
}

.category-chip {
  padding: var(--spacing-2, 8px) var(--spacing-4, 16px);
  border-radius: var(--radius-xl, 20px);
  background: var(--predict-card-bg, var(--bg-card, rgba(30, 41, 59, 0.8)));
  border: 1px solid var(--predict-card-border, var(--border-color, rgba(255, 255, 255, 0.1)));
  color: var(--predict-text-secondary, var(--text-secondary, rgba(248, 250, 252, 0.7)));
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  transition: all var(--transition-normal, 250ms ease);
  cursor: pointer;

  &:hover {
    background: var(--predict-hover-bg, var(--bg-hover, rgba(255, 255, 255, 0.08)));
    border-color: var(--predict-hover-border, var(--border-color-hover, rgba(255, 255, 255, 0.15)));
  }

  &:active {
    transform: scale(0.98);
  }

  &.active {
    background: var(--predict-accent, #3b82f6);
    border-color: var(--predict-accent, #3b82f6);
    color: white;
  }
}

.market-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3, 12px);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px var(--spacing-4, 16px);
  color: var(--predict-text-muted, var(--text-tertiary, rgba(248, 250, 252, 0.5)));
}

.error-toast {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--predict-danger-bg, rgba(239, 68, 68, 0.9));
  color: var(--predict-danger, white);
  padding: var(--spacing-3, 12px) var(--spacing-6, 24px);
  border-radius: var(--radius-md, 8px);
  font-weight: 600;
  font-size: var(--font-size-md, 14px);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 3000;
  box-shadow: var(--predict-card-shadow, 0 10px 40px rgba(0, 0, 0, 0.3));
  animation: toast-in var(--transition-normal, 300ms ease-out);
}

@keyframes toast-in {
  from {
    transform: translate(-50%, -20px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

// Reduced motion support for accessibility
@media (prefers-reduced-motion: reduce) {
  .category-chip {
    transition: none;

    &:active {
      transform: none;
    }
  }

  .error-toast {
    animation: none;
  }
}
</style>
