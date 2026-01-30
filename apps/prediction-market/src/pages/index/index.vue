<template>
  <view class="theme-prediction-market">
    <ResponsiveLayout 
      :title="t('title')"
      :nav-items="navItems"
      :active-tab="activeTab"
      :show-sidebar="isDesktop"
      layout="sidebar"
      @navigate="handleTabChange"
    >
      <!-- Chain Warning -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <!-- Desktop Sidebar - Stats -->
      <template #desktop-sidebar>
        <view class="sidebar-stats">
          <text class="sidebar-title">{{ t("marketStats") }}</text>
          <view class="stat-item">
            <text class="stat-label">{{ t("totalMarkets") }}</text>
            <text class="stat-value">{{ markets.length }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">{{ t("totalVolume") }}</text>
            <text class="stat-value">{{ formatCurrency(totalVolume) }} GAS</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">{{ t("activeTraders") }}</text>
            <text class="stat-value">{{ activeTraders }}</text>
          </view>
        </view>
        
        <view class="sidebar-categories">
          <text class="sidebar-title">{{ t("categories") }}</text>
          <view 
            v-for="cat in categories" 
            :key="cat.id"
            class="category-item"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            <text class="category-name">{{ cat.label }}</text>
            <text class="category-count">{{ getCategoryCount(cat.id) }}</text>
          </view>
        </view>
      </template>

      <!-- Markets Tab -->
      <view v-if="activeTab === 'markets'" class="tab-content">
        <!-- Mobile Category Filter (Horizontal Scroll) -->
        <view v-if="!isDesktop" class="mobile-filter">
          <scroll-view scroll-x class="category-scroll">
            <view
              v-for="cat in categories"
              :key="cat.id"
              class="category-chip"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              <text>{{ cat.label }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- Market List -->
        <view class="content-card">
          <view class="card-header">
            <text class="card-title">{{ t("activeMarkets") }}</text>
            <view class="sort-dropdown" @click="toggleSort">
              <text>{{ sortLabel }}</text>
              <text class="chevron">▼</text>
            </view>
          </view>
          
          <view v-if="loadingMarkets" class="loading-state">
            <view class="spinner" />
            <text>{{ t("loading") }}</text>
          </view>
          
          <view v-else-if="filteredMarkets.length === 0" class="empty-state">
            <text class="empty-icon">📊</text>
            <text class="empty-title">{{ t("noMarkets") }}</text>
            <text class="empty-subtitle">{{ t("checkBackLater") }}</text>
          </view>
          
          <view v-else class="market-grid">
            <MarketCard
              v-for="market in filteredMarkets"
              :key="market.id"
              :market="market"
              :is-compact="!isDesktop"
              @click="selectMarket(market)"
            />
          </view>
        </view>
      </view>

      <!-- Trading Tab (Market Detail) -->
      <view v-if="activeTab === 'trading' && selectedMarket" class="tab-content">
        <MarketDetail
          :market="selectedMarket"
          :your-orders="yourOrders"
          :your-positions="yourPositions"
          :is-trading="isTrading"
          @trade="executeTrade"
          @cancel-order="cancelOrder"
          @back="handleBackToMarkets"
        />
      </view>

      <!-- Portfolio Tab -->
      <view v-if="activeTab === 'portfolio'" class="tab-content">
        <view class="portfolio-summary">
          <view class="summary-card">
            <text class="summary-label">{{ t("portfolioValue") }}</text>
            <text class="summary-value">{{ formatCurrency(portfolioValue) }} GAS</text>
          </view>
          <view class="summary-card" :class="{ positive: totalPnL > 0, negative: totalPnL < 0 }">
            <text class="summary-label">{{ t("totalPnL") }}</text>
            <text class="summary-value">{{ totalPnL > 0 ? '+' : '' }}{{ formatCurrency(totalPnL) }} GAS</text>
          </view>
        </view>
        
        <PortfolioView
          :positions="yourPositions"
          :orders="yourOrders"
          @claim="claimWinnings"
        />
      </view>

      <!-- Create Tab -->
      <view v-if="activeTab === 'create'" class="tab-content">
        <CreateMarketForm :is-creating="isCreating" @submit="createMarket" />
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
import MarketCard from "./components/MarketCard.vue";
import MarketDetail from "./components/MarketDetail.vue";
import PortfolioView from "./components/PortfolioView.vue";
import CreateMarketForm from "./components/CreateMarketForm.vue";

const { t } = useI18n();
const APP_ID = "miniapp-prediction-market";

const navItems = computed<NavItem[]>(() => [
  { key: "markets", label: t("markets"), icon: "📊" },
  { key: "portfolio", label: t("portfolio"), icon: "💼" },
  { key: "create", label: t("create"), icon: "➕" },
  { key: "docs", label: t("docs"), icon: "📖" },
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
const sortBy = ref<'volume' | 'newest' | 'ending'>('volume');

const isDesktop = computed(() => {
  try {
    return window.innerWidth >= 768;
  } catch {
    return false;
  }
});

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

const sortLabel = computed(() => {
  const labels: Record<string, string> = {
    volume: t("sortByVolume"),
    newest: t("sortByNewest"),
    ending: t("sortByEnding")
  };
  return labels[sortBy.value] || t("sortByVolume");
});

// Stats
const totalVolume = computed(() => markets.value.reduce((sum, m) => sum + m.totalVolume, 0));
const activeTraders = ref(0);

const getCategoryCount = (catId: string) => {
  if (catId === 'all') return markets.value.length;
  return markets.value.filter(m => m.category === catId).length;
};

// Filtered and sorted markets
const filteredMarkets = computed(() => {
  let result = markets.value;
  if (selectedCategory.value !== "all") {
    result = result.filter((m) => m.category === selectedCategory.value);
  }
  
  // Sort
  result = [...result].sort((a, b) => {
    switch (sortBy.value) {
      case 'volume': return b.totalVolume - a.totalVolume;
      case 'newest': return b.id - a.id;
      case 'ending': return a.endTime - b.endTime;
      default: return 0;
    }
  });
  
  return result;
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

// Methods
const handleTabChange = (tab: string) => {
  activeTab.value = tab;
  if (tab !== 'trading') {
    selectedMarket.value = null;
  }
};

const handleBackToMarkets = () => {
  activeTab.value = 'markets';
  selectedMarket.value = null;
};

const selectMarket = (market: PredictionMarket) => {
  selectedMarket.value = market;
  activeTab.value = 'trading';
};

const toggleSort = () => {
  const options: Array<'volume' | 'newest' | 'ending'> = ['volume', 'newest', 'ending'];
  const currentIndex = options.indexOf(sortBy.value);
  sortBy.value = options[(currentIndex + 1) % options.length];
};

const formatCurrency = (value: number) => {
  return value.toFixed(2);
};

const executeTrade = async (trade: any) => {
  // Implementation
};

const cancelOrder = async (orderId: number) => {
  // Implementation
};

const claimWinnings = async (marketId: number) => {
  // Implementation
};

const createMarket = async (marketData: any) => {
  // Implementation
};

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
  resolution?: boolean;
}

interface MarketOrder {
  id: number;
  marketId: number;
  orderType: "buy" | "sell";
  outcome: "yes" | "no";
  price: number;
  shares: number;
  filled: number;
}

interface MarketPosition {
  marketId: number;
  outcome: "yes" | "no";
  shares: number;
  avgPrice: number;
  pnl?: number;
}

onMounted(() => {
  // Load mock data
  markets.value = [
    { id: 1, question: t("market1Question"), description: "", category: "crypto", endTime: Date.now() + 86400000, oracle: "", creator: "", status: "open", yesPrice: 0.65, noPrice: 0.35, totalVolume: 1500 },
    { id: 2, question: t("market2Question"), description: "", category: "sports", endTime: Date.now() + 172800000, oracle: "", creator: "", status: "open", yesPrice: 0.42, noPrice: 0.58, totalVolume: 2800 },
    { id: 3, question: t("market3Question"), description: "", category: "politics", endTime: Date.now() + 259200000, oracle: "", creator: "", status: "open", yesPrice: 0.78, noPrice: 0.22, totalVolume: 4200 },
  ];
  activeTraders.value = 156;
});
</script>

<style lang="scss" scoped>
.theme-prediction-market {
  --pm-primary: #6366f1;
  --pm-success: #10b981;
  --pm-danger: #ef4444;
  --pm-bg: #0f0f1a;
  --pm-card-bg: rgba(255, 255, 255, 0.05);
  --pm-text: #ffffff;
  --pm-text-secondary: rgba(255, 255, 255, 0.7);
  --pm-border: rgba(255, 255, 255, 0.1);
}

.tab-content {
  padding: 16px;
  
  @media (min-width: 768px) {
    padding: 0;
  }
}

// Desktop Sidebar
.sidebar-stats {
  margin-bottom: 24px;
}

.sidebar-title {
  font-size: 12px;
  color: var(--pm-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  display: block;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--pm-border);
  
  &:last-child {
    border-bottom: none;
  }
}

.stat-label {
  font-size: 14px;
  color: var(--pm-text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--pm-text);
}

.sidebar-categories {
  .category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    &.active {
      background: rgba(99, 102, 241, 0.2);
      
      .category-name {
        color: var(--pm-primary);
      }
    }
  }
  
  .category-name {
    font-size: 14px;
    color: var(--pm-text);
  }
  
  .category-count {
    font-size: 12px;
    color: var(--pm-text-secondary);
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 99px;
  }
}

// Mobile Filter
.mobile-filter {
  margin-bottom: 16px;
}

.category-scroll {
  white-space: nowrap;
}

.category-chip {
  display: inline-flex;
  padding: 8px 16px;
  margin-right: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--pm-border);
  border-radius: 99px;
  font-size: 13px;
  color: var(--pm-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  
  &.active {
    background: var(--pm-primary);
    border-color: var(--pm-primary);
    color: white;
  }
}

// Content Card
.content-card {
  background: var(--pm-card-bg);
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--pm-text);
}

.sort-dropdown {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 13px;
  color: var(--pm-text-secondary);
  cursor: pointer;
  
  .chevron {
    font-size: 10px;
  }
}

// Market Grid
.market-grid {
  display: grid;
  gap: 16px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

// Portfolio Summary
.portfolio-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

.summary-card {
  background: var(--pm-card-bg);
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  
  &.positive {
    border-color: rgba(16, 185, 129, 0.3);
    .summary-value {
      color: var(--pm-success);
    }
  }
  
  &.negative {
    border-color: rgba(239, 68, 68, 0.3);
    .summary-value {
      color: var(--pm-danger);
    }
  }
}

.summary-label {
  font-size: 12px;
  color: var(--pm-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--pm-text);
}

// Loading & Empty States
.loading-state {
  text-align: center;
  padding: 48px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--pm-primary);
    border-radius: 50%;
    margin: 0 auto 16px;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 48px;
  
  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
  }
  
  .empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--pm-text);
    margin-bottom: 8px;
    display: block;
  }
  
  .empty-subtitle {
    font-size: 14px;
    color: var(--pm-text-secondary);
  }
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
  z-index: 3000;
}
</style>
