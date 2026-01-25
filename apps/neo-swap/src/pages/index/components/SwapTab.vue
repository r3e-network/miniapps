<template>
  <view class="swap-container">
    <!-- Animated Background -->
    <view class="animated-bg">
      <view class="glow-orb orb-1"></view>
      <view class="glow-orb orb-2"></view>
      <view class="grid-lines"></view>
    </view>

    <!-- Main Swap Card -->
    <view class="swap-card">
      <!-- From Token Section -->
      <view class="token-section">
        <view class="section-header">
          <text class="section-label">{{ t("from") }}</text>
          <text class="balance-label">{{ t("balance") }}: {{ formatBalance(fromToken.balance) }}</text>
        </view>
        <view class="token-row">
          <view class="token-selector" @click="openFromSelector">
            <image :src="getTokenIcon(fromToken.symbol)" class="token-icon" mode="aspectFit" />
            <text class="token-symbol">{{ fromToken.symbol }}</text>
            <view class="chevron">›</view>
          </view>
          <input 
            type="digit"
            v-model="fromAmount"
            :placeholder="t('enterAmount')"
            class="amount-input"
            @input="onFromAmountChange"
          />
        </view>
        <view class="max-btn" @click="setMaxAmount">{{ t("max") }}</view>
      </view>

      <!-- Swap Direction Button -->
      <view class="swap-direction">
        <view :class="['swap-btn', { rotating: isSwapping }]" @click="swapTokens">
          <text class="swap-icon">↓↑</text>
        </view>
      </view>

      <!-- To Token Section -->
      <view class="token-section">
        <view class="section-header">
          <text class="section-label">{{ t("to") }}</text>
          <text class="balance-label">{{ t("balance") }}: {{ formatBalance(toToken.balance) }}</text>
        </view>
        <view class="token-row">
          <view class="token-selector" @click="openToSelector">
            <image :src="getTokenIcon(toToken.symbol)" class="token-icon" mode="aspectFit" />
            <text class="token-symbol">{{ toToken.symbol }}</text>
            <view class="chevron">›</view>
          </view>
          <input 
            type="digit"
            :value="toAmount"
            :placeholder="t('enterAmount')"
            class="amount-input"
            disabled
          />
        </view>
      </view>
    </view>

    <!-- Rate Info Card -->
    <view class="rate-card" v-if="exchangeRate && !rateLoading">
      <view class="rate-row">
        <text class="rate-label">{{ t("exchangeRate") }}</text>
        <text class="rate-value">1 {{ fromToken.symbol }} = {{ exchangeRate }} {{ toToken.symbol }}</text>
      </view>
      <view class="rate-row">
        <text class="rate-label">{{ t("slippage") }}</text>
        <text class="rate-value slippage">{{ slippage }}</text>
      </view>
      <view class="rate-row">
        <text class="rate-label">{{ t("minReceived") }}</text>
        <text class="rate-value">{{ minReceived }} {{ toToken.symbol }}</text>
      </view>
      <view class="refresh-btn" @click="fetchExchangeRate">
        <text class="refresh-icon">↻</text>
        {{ t("refreshRate") }}
      </view>
    </view>
    <view class="rate-card loading" v-else>
      <text class="rate-loading-text">{{ rateLoading ? t('loadingRate') : t('rateUnavailable') }}</text>
      <view class="refresh-btn" @click="fetchExchangeRate">
        <text class="refresh-icon">↻</text>
        {{ t("refreshRate") }}
      </view>
    </view>

    <!-- Swap Action Button -->
    <view 
      :class="['action-btn', { disabled: !canSwap || loading, loading: loading }]"
      @click="executeSwap"
    >
      <view v-if="loading" class="btn-loader"></view>
      <text class="btn-text">{{ swapButtonText }}</text>
    </view>

    <!-- Status Message -->
    <view v-if="status" :class="['status-card', status.type]">
      <text class="status-text">{{ status.msg }}</text>
    </view>

    <!-- Token Selector Modal -->
    <view v-if="showSelector" class="modal-overlay" @click="closeSelector">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ t("selectToken") }}</text>
          <view class="modal-close" @click="closeSelector">×</view>
        </view>
        <view class="token-list">
          <view 
            v-for="token in availableTokens" 
            :key="token.symbol"
            :class="['token-item', { selected: isCurrentToken(token) }]"
            @click="selectToken(token)"
          >
            <image :src="getTokenIcon(token.symbol)" class="token-list-icon" mode="aspectFit" />
            <view class="token-item-info">
              <text class="token-item-symbol">{{ token.symbol }}</text>
              <text class="token-item-balance">{{ formatBalance(token.balance) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useWallet } from "@neo/uniapp-sdk";
import { toFixedDecimals } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";

const props = defineProps<{
  t: (key: string) => string;
}>();

const { getAddress, invokeContract, balances, getContractAddress, chainType } = useWallet() as any;
const SWAP_ROUTER = ref<string | null>(null);

interface Token {
  symbol: string;
  hash: string;
  balance: number;
  decimals: number;
}

const TOKENS: Token[] = [
  { symbol: "NEO", hash: "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5", balance: 0, decimals: 0 },
  { symbol: "GAS", hash: "0xd2a4cff31913016155e38e474a2c06d08be276cf", balance: 0, decimals: 8 },
];

// State
const fromToken = ref<Token>({ ...TOKENS[0] });
const toToken = ref<Token>({ ...TOKENS[1] });
const fromAmount = ref("");
const toAmount = ref("");
const exchangeRate = ref("");
const rateLoading = ref(false);
const loading = ref(false);
const status = ref<{ msg: string; type: string } | null>(null);
const showSelector = ref(false);
const selectorTarget = ref<"from" | "to">("from");
const isSwapping = ref(false);

// Watch for balance updates
watch(
  balances,
  (newVal) => {
    const neo = newVal["NEO"] || 0;
    const gas = newVal["GAS"] || 0;
    TOKENS[0].balance = Number(neo);
    TOKENS[1].balance = Number(gas);
    if (fromToken.value.symbol === "NEO") fromToken.value.balance = TOKENS[0].balance;
    if (fromToken.value.symbol === "GAS") fromToken.value.balance = TOKENS[1].balance;
    if (toToken.value.symbol === "NEO") toToken.value.balance = TOKENS[0].balance;
    if (toToken.value.symbol === "GAS") toToken.value.balance = TOKENS[1].balance;
  },
  { deep: true, immediate: true },
);

const availableTokens = computed(() => TOKENS);
const hasRate = computed(() => {
  const rate = parseFloat(exchangeRate.value);
  return Number.isFinite(rate) && rate > 0;
});
const canSwap = computed(() => {
  const amount = parseFloat(fromAmount.value);
  return hasRate.value && amount > 0 && amount <= fromToken.value.balance;
});
const swapButtonText = computed(() => {
  if (loading.value) return props.t("swapping");
  if (!fromAmount.value) return props.t("enterAmount");
  if (rateLoading.value) return props.t("loadingRate");
  if (!hasRate.value) return props.t("rateUnavailable");
  if (parseFloat(fromAmount.value) > fromToken.value.balance) return props.t("insufficientBalance");
  return `${props.t("tabSwap")} ${fromToken.value.symbol} → ${toToken.value.symbol}`;
});
const slippage = computed(() => "0.5%");
const minReceived = computed(() => {
  const amount = parseFloat(toAmount.value) || 0;
  return (amount * 0.995).toFixed(4);
});

// Methods
function getTokenIcon(symbol: string): string {
  // Use relative paths that work within the MiniApp's context
  if (symbol === "NEO") return "/neo-token.png";
  if (symbol === "GAS") return "/gas-token.png";
  return "/logo.png";
}

function formatBalance(balance: number): string {
  return balance.toFixed(4);
}

function showStatus(msg: string, type: "success" | "error") {
  status.value = { msg, type };
  setTimeout(() => (status.value = null), 5000);
}

function setMaxAmount() {
  fromAmount.value = fromToken.value.balance.toString();
  onFromAmountChange();
}

async function fetchExchangeRate() {
  if (rateLoading.value) return;
  rateLoading.value = true;
  exchangeRate.value = "";
  try {
    const sdk = await import("@neo/uniapp-sdk").then((m) => m.waitForSDK?.() || null);
    if (sdk?.datafeed?.getPrice) {
      const fromPrice = await sdk.datafeed.getPrice(`${fromToken.value.symbol}-USD`);
      const toPrice = await sdk.datafeed.getPrice(`${toToken.value.symbol}-USD`);
      if (fromPrice?.price && toPrice?.price) {
        const rate = parseFloat(fromPrice.price) / parseFloat(toPrice.price);
        if (Number.isFinite(rate) && rate > 0) {
          exchangeRate.value = rate.toFixed(6);
          onFromAmountChange();
          return;
        }
      }
    }
  } catch {} finally {
    rateLoading.value = false;
  }
}

async function loadRouter() {
  if (SWAP_ROUTER.value) return;
  try {
    SWAP_ROUTER.value = await getContractAddress();
  } catch {}
}

function onFromAmountChange() {
  const amount = parseFloat(fromAmount.value) || 0;
  const rate = parseFloat(exchangeRate.value);
  if (!Number.isFinite(rate) || rate <= 0) {
    toAmount.value = "";
    return;
  }
  toAmount.value = (amount * rate).toFixed(4);
}

function swapTokens() {
  isSwapping.value = true;
  const temp = fromToken.value;
  fromToken.value = toToken.value;
  toToken.value = temp;
  fromAmount.value = "";
  toAmount.value = "";
  fetchExchangeRate();
  setTimeout(() => (isSwapping.value = false), 300);
}

function openFromSelector() {
  selectorTarget.value = "from";
  showSelector.value = true;
}

function openToSelector() {
  selectorTarget.value = "to";
  showSelector.value = true;
}

function closeSelector() {
  showSelector.value = false;
}

function isCurrentToken(token: Token): boolean {
  if (selectorTarget.value === "from") return token.symbol === fromToken.value.symbol;
  return token.symbol === toToken.value.symbol;
}

function selectToken(token: Token) {
  if (selectorTarget.value === "from") {
    if (token.symbol === toToken.value.symbol) swapTokens();
    else fromToken.value = { ...token };
  } else {
    if (token.symbol === fromToken.value.symbol) swapTokens();
    else toToken.value = { ...token };
  }
  closeSelector();
  fetchExchangeRate();
}

async function executeSwap() {
  if (!canSwap.value || loading.value) return;
  if (!requireNeoChain(chainType, props.t)) return;
  loading.value = true;
  try {
    const amount = parseFloat(fromAmount.value);
    const decimals = fromToken.value.decimals;
    const amountInt = toFixedDecimals(fromAmount.value, decimals);
    const expectedOutput = parseFloat(toAmount.value) || 0;
    const slippageTolerance = 0.005;
    const minOutputAmount = expectedOutput * (1 - slippageTolerance);
    const toDecimals = toToken.value.decimals;
    const minOutputInt = toFixedDecimals(minOutputAmount.toString(), toDecimals);
    const routerAddress = SWAP_ROUTER.value || (await getContractAddress());
    if (!routerAddress) throw new Error(props.t("swapRouterUnavailable"));
    const sender = await getAddress();
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const path = [
      { type: "Hash160", value: fromToken.value.hash },
      { type: "Hash160", value: toToken.value.hash },
    ];
    await invokeContract({
      scriptHash: routerAddress,
      operation: "swapTokenInForTokenOut",
      args: [
        { type: "Hash160", value: sender },
        { type: "Integer", value: amountInt },
        { type: "Integer", value: minOutputInt },
        { type: "Array", value: path },
        { type: "Integer", value: deadline },
      ],
    });
    showStatus(`${props.t("swapSuccess")}: ${amount} ${fromToken.value.symbol}`, "success");
    fromAmount.value = "";
    toAmount.value = "";
  } catch (e: any) {
    showStatus(e?.message || props.t("swapFailed"), "error");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadRouter();
  fetchExchangeRate();
});
</script>

<style lang="scss" scoped>
.swap-container {
  position: relative;
  padding: 20px;
  min-height: 100vh;
  background: var(--swap-bg-gradient);
  overflow: hidden;
}

// Animated Background
.animated-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 8s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: var(--swap-orb-one);
  top: -100px;
  right: -100px;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: var(--swap-orb-two);
  bottom: 100px;
  left: -80px;
  animation-delay: -4s;
}

.grid-lines {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(var(--swap-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--swap-grid-line) 1px, transparent 1px);
  background-size: 40px 40px;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -30px) scale(1.1); }
}

// Main Swap Card
.swap-card {
  position: relative;
  background: var(--swap-card-bg);
  border: 1px solid var(--swap-card-border);
  border-radius: 24px;
  padding: 24px;
  backdrop-filter: blur(20px);
  box-shadow: 
    0 0 40px var(--swap-card-glow),
    inset 0 1px 0 var(--swap-card-inset);
}

// Token Section
.token-section {
  position: relative;
  background: var(--swap-panel-bg);
  border: 1px solid var(--swap-panel-border);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: var(--swap-panel-focus-border);
    box-shadow: 0 0 20px var(--swap-panel-focus-glow);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--swap-text-muted);
}

.balance-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--swap-text-subtle);
  font-family: 'JetBrains Mono', monospace;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.token-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--swap-chip-bg);
  padding: 10px 16px;
  border-radius: 16px;
  border: 1px solid var(--swap-chip-border);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--swap-chip-hover-bg);
    border-color: var(--swap-chip-hover-border);
  }
}

.token-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.token-symbol {
  font-size: 18px;
  font-weight: 800;
  color: var(--swap-text);
  letter-spacing: 0.05em;
}

.chevron {
  font-size: 20px;
  color: var(--swap-text-subtle);
  margin-left: 4px;
}

.amount-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 32px;
  font-weight: 700;
  color: var(--swap-text);
  text-align: right;
  font-family: 'Inter', sans-serif;
  
  &::placeholder {
    color: var(--swap-text-dim);
  }
  
  &:disabled {
    color: var(--swap-text-disabled);
  }
}

.max-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 10px;
  font-weight: 700;
  color: var(--swap-accent);
  background: var(--swap-accent-soft);
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.1em;
  
  &:hover {
    background: var(--swap-accent-soft-strong);
  }
}

// Swap Direction Button
.swap-direction {
  display: flex;
  justify-content: center;
  margin: -20px 0;
  position: relative;
  z-index: 10;
}

.swap-btn {
  width: 48px;
  height: 48px;
  background: var(--swap-orb-one);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 20px var(--swap-accent-glow);
  
  &:hover {
    transform: scale(1.1) rotate(180deg);
    box-shadow: 0 6px 30px var(--swap-accent-glow-strong);
  }
  
  &.rotating {
    transform: rotate(180deg);
  }
}

.swap-icon {
  font-size: 20px;
  font-weight: 800;
  color: var(--swap-action-text);
}

// Rate Card
.rate-card {
  background: var(--swap-card-soft);
  border: 1px solid var(--swap-panel-border);
  border-radius: 16px;
  padding: 16px;
  margin-top: 16px;
  
  &.loading {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.rate-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--swap-rate-border);
  
  &:last-of-type {
    border-bottom: none;
  }
}

.rate-label {
  font-size: 12px;
  color: var(--swap-text-muted);
}

.rate-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--swap-text);
  font-family: 'JetBrains Mono', monospace;
  
  &.slippage {
    color: var(--swap-accent);
  }
}

.rate-loading-text {
  font-size: 12px;
  color: var(--swap-text-subtle);
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--swap-text-muted);
  padding: 8px 12px;
  border: 1px solid var(--swap-panel-border-strong);
  border-radius: 8px;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--swap-accent);
    border-color: var(--swap-chip-hover-border);
  }
}

.refresh-icon {
  font-size: 14px;
}

// Action Button
.action-btn {
  margin-top: 20px;
  padding: 20px;
  background: var(--swap-action-gradient);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px var(--swap-accent-glow);
  
  &:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px var(--swap-accent-glow-strong);
  }
  
  &.disabled {
    background: var(--swap-action-disabled-bg);
    box-shadow: none;
    cursor: not-allowed;
    
    .btn-text {
      color: var(--swap-action-disabled-text);
    }
  }
  
  &.loading {
    background: var(--swap-action-loading-bg);
  }
}

.btn-text {
  font-size: 16px;
  font-weight: 800;
  color: var(--swap-action-text);
  letter-spacing: 0.1em;
}

.btn-loader {
  width: 20px;
  height: 20px;
  border: 2px solid var(--swap-loader-border);
  border-top-color: var(--swap-action-text);
  border-radius: 50%;
  margin-right: 10px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// Status Card
.status-card {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  
  &.success {
    background: var(--swap-status-success-bg);
    border: 1px solid var(--swap-status-success-border);
  }
  
  &.error {
    background: var(--swap-status-error-bg);
    border: 1px solid var(--swap-status-error-border);
  }
}

.status-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--swap-text);
}

// Modal
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--swap-modal-overlay);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 90%;
  max-width: 360px;
  background: var(--swap-modal-bg);
  border: 1px solid var(--swap-modal-border);
  border-radius: 24px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--swap-modal-header-border);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--swap-modal-text);
}

.modal-close {
  font-size: 28px;
  color: var(--swap-modal-text-muted);
  cursor: pointer;
  line-height: 1;
  
  &:hover {
    color: var(--swap-modal-text);
  }
}

.token-list {
  padding: 12px;
}

.token-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--swap-chip-hover-bg);
  }
  
  &.selected {
    background: var(--swap-accent-soft);
    border: 1px solid var(--swap-chip-hover-border);
  }
}

.token-list-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.token-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-item-symbol {
  font-size: 18px;
  font-weight: 700;
  color: var(--swap-modal-text);
}

.token-item-balance {
  font-size: 13px;
  color: var(--swap-modal-text-muted);
  font-family: 'JetBrains Mono', monospace;
}
</style>
