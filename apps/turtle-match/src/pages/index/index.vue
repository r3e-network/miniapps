<template>
  <view class="theme-turtle-match">
    <view class="pond-background" />
    <view class="pond-caustics" />
    <view class="neural-rain" />
    <ResponsiveLayout :desktop-breakpoint="1024" class="pond-theme" :title="t('title')" :show-back="true">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />
      <view class="game-container">
        <!-- Header Stats -->
        <view class="game-header">
          <view class="header-glass">
            <view class="game-header__stat">
              <view class="stat-icon">📅</view>
              <text class="game-header__label">{{ t("totalSessions") }}</text>
              <text class="game-header__value">{{ stats?.totalSessions || 0 }}</text>
            </view>
            <view class="divider" />
            <view class="game-header__stat">
              <view class="stat-icon">💎</view>
              <text class="game-header__label">{{ t("totalRewards") }}</text>
              <text class="game-header__value gold-text">{{ formatGas(stats?.totalPaid || 0n, 3) }} GAS</text>
            </view>
          </view>
        </view>

        <view v-if="error" class="error-banner">
          <text class="error-text">{{ error }}</text>
        </view>

        <!-- Not Connected -->
        <view v-if="!isConnected" class="connect-prompt">
          <GradientCard variant="erobo">
            <view class="connect-prompt__content">
              <view class="hero-turtle">
                <TurtleSprite :color="TurtleColor.Green" matched />
              </view>
              <text class="connect-prompt__title">{{ t("title") }}</text>
              <text class="connect-prompt__desc">{{ t("description") }}</text>
              <NeoButton variant="primary" size="lg" @click="connect" :loading="loading">{{
                t("connectWallet")
              }}</NeoButton>
            </view>
          </GradientCard>
        </view>

        <!-- Purchase Section -->
        <view v-else-if="!hasActiveSession" class="purchase-section">
          <view class="purchase-grid">
            <GradientCard variant="erobo-neo" class="purchase-card">
              <view class="purchase-section__content">
                <text class="purchase-section__title">{{ t("buyBlindbox") }}</text>
                <text class="purchase-section__price">0.1 GAS / {{ t("box") }}</text>

                <view class="purchase-section__counter">
                  <view class="counter-btn" @click="decreaseCount">
                    <text class="btn-icon">-</text>
                  </view>
                  <text class="counter-value">{{ boxCount }}</text>
                  <view class="counter-btn" @click="increaseCount">
                    <text class="btn-icon">+</text>
                  </view>
                </view>

                <view class="purchase-section__total">
                  <text class="total-label">{{ t("totalPrice") }}</text>
                  <text class="total-value">{{ totalCost }} GAS</text>
                </view>

                <NeoButton variant="primary" size="lg" block @click="startGame" :loading="loading">{{
                  t("startGame")
                }}</NeoButton>
              </view>
            </GradientCard>
          </view>
        </view>

        <!-- Active Game -->
        <view v-else class="game-area">
          <view class="game-stats-row">
            <view class="stat-bubble">
              <text class="bubble-label">{{ t("remainingBoxes") }}</text>
              <text class="bubble-value">{{ remainingBoxes }}</text>
            </view>
            <view class="stat-bubble">
              <text class="bubble-label">{{ t("matches") }}</text>
              <text class="bubble-value">{{ currentMatches }}</text>
            </view>
            <view class="stat-bubble highlight">
              <text class="bubble-label">{{ t("won") }}</text>
              <text class="bubble-value gold">{{ formatGas(currentReward || 0n, 3) }} GAS</text>
            </view>
          </view>

          <view class="grid-container">
            <TurtleGrid :gridTurtles="gridTurtles" :matchedPair="matchedPairRef" />
          </view>

          <view class="game-actions">
            <view v-if="gamePhase === 'playing'" class="auto-play-status">
              <view class="auto-play-waves">
                <view class="p-wave" />
                <view class="p-wave" />
              </view>
              <text class="auto-play-text">{{ t("autoOpening") }}</text>
            </view>

            <NeoButton
              v-else-if="gamePhase === 'settling'"
              variant="primary"
              size="lg"
              block
              @click="finishGame"
              :loading="loading"
              >{{ t("settleRewards") }}</NeoButton
            >

            <NeoButton v-else-if="gamePhase === 'complete'" variant="secondary" block @click="newGame">{{
              t("newGame")
            }}</NeoButton>
          </view>
        </view>
      </view>

      <!-- Animations -->
      <BlindboxOpening :visible="showBlindbox" :turtleColor="currentTurtleColor" @complete="onBlindboxComplete" />
      <MatchCelebration
        :visible="showCelebration"
        :turtleColor="matchColor"
        :reward="matchReward"
        @complete="onCelebrationComplete"
      />
      <GameResult
        :visible="showResult"
        :matches="currentMatches"
        :reward="currentReward"
        :boxCount="Number(session?.boxCount || 0)"
        @close="onResultClose"
      />
      <GameSplash :visible="showSplash" @complete="showSplash = false" />
    </ResponsiveLayout>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ResponsiveLayout, GradientCard, NeoButton, ChainWarning } from "@shared/components";
import { formatGas } from "@shared/utils/format";
import { useTurtleMatch, TurtleColor } from "@/shared/composables/useTurtleMatch";
import { useI18n } from "@/composables/useI18n";
import TurtleGrid from "./components/TurtleGrid.vue";
import BlindboxOpening from "./components/BlindboxOpening.vue";
import MatchCelebration from "./components/MatchCelebration.vue";
import GameResult from "./components/GameResult.vue";
import GameSplash from "./components/GameSplash.vue";
import TurtleSprite from "./components/TurtleSprite.vue";

// Composables
const { t } = useI18n();
const {
  loading,
  error,
  session,
  localGame,
  stats,
  isConnected,
  hasActiveSession,
  gridTurtles,
  connect,
  startGame: contractStartGame,
  settleGame,
  processGameStep,
  resetLocalGame,
} = useTurtleMatch();

// Animation state
const matchedPairRef = ref<number[]>([]);

// Local state
const boxCount = ref(5);
const showSplash = ref(true);
const showBlindbox = ref(false);
const showCelebration = ref(false);
const showResult = ref(false);
const currentTurtleColor = ref<TurtleColor>(TurtleColor.Green);
const matchColor = ref<TurtleColor>(TurtleColor.Green);
const matchReward = ref<bigint>(BigInt(0));
const isAutoPlaying = ref(false);
const gamePhase = ref<"idle" | "playing" | "settling" | "complete">("idle");

// Computed
const totalCost = computed(() => {
  const price = 0.1;
  return (price * boxCount.value).toFixed(1);
});

const remainingBoxes = computed(() => {
  if (!localGame.value || !session.value) return 0;
  return Number(session.value.boxCount) - localGame.value.currentBoxIndex;
});

const currentReward = computed(() => {
  if (!localGame.value) return 0n;
  return localGame.value.totalReward;
});

const currentMatches = computed(() => {
  if (!localGame.value) return 0;
  return localGame.value.totalMatches;
});

// Methods
function increaseCount() {
  if (boxCount.value < 20) boxCount.value++;
}

function decreaseCount() {
  if (boxCount.value > 3) boxCount.value--;
}

async function startGame() {
  gamePhase.value = "playing";
  const sessionId = await contractStartGame(boxCount.value);
  if (sessionId) {
    setTimeout(() => autoPlay(), 500);
  } else {
    gamePhase.value = "idle";
  }
}

async function autoPlay() {
  if (!localGame.value || isAutoPlaying.value) return;

  isAutoPlaying.value = true;

  while (!localGame.value.isComplete) {
    showBlindbox.value = true;
    const result = await processGameStep();

    if (result.turtle) {
      currentTurtleColor.value = result.turtle.color;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    showBlindbox.value = false;

    if (result.matches > 0) {
      matchColor.value = currentTurtleColor.value;
      matchReward.value = result.reward;
      showCelebration.value = true;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      showCelebration.value = false;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  isAutoPlaying.value = false;
  gamePhase.value = "settling";
  showResult.value = true;
}

async function finishGame() {
  const success = await settleGame();
  if (success) {
    gamePhase.value = "complete";
  }
}

function onResultClose() {
  showResult.value = false;
}

function newGame() {
  resetLocalGame();
  gamePhase.value = "idle";
}

function onBlindboxComplete() {
  showBlindbox.value = false;
}

function onCelebrationComplete() {
  showCelebration.value = false;
}
</script>

<style lang="scss" scoped>
@import "@shared/styles/variables.scss";
@import "@shared/styles/tokens.scss";
@import "../../static/game.css";

.pond-theme {
  --nav-bg: transparent;
  --nav-text: var(--turtle-text);
}

.game-container {
  padding-top: 20px;
  position: relative;
  overflow: hidden;
}

.header-glass {
  background: var(--turtle-glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--turtle-border);
  border-radius: 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 16px;
  margin: 0 20px 30px;
}

.divider {
  width: 1px;
  height: 30px;
  background: var(--turtle-border);
}

.game-header__stat {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 16px;
  margin-bottom: 2px;
  filter: drop-shadow(0 0 5px var(--turtle-icon-glow));
}

.game-header__label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--turtle-text-muted);
  display: block;
}

.game-header__value {
  font-size: 20px;
  font-weight: 800;
  color: var(--turtle-primary);

  &.gold-text {
    color: var(--turtle-accent);
  }
}

.hero-turtle {
  width: 180px;
  height: 180px;
  margin-bottom: 30px;
  filter: drop-shadow(0 20px 40px var(--turtle-primary-glow-strong));
  animation: hero-float 4s ease-in-out infinite;
}

@keyframes hero-float {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

.connect-prompt__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
}

.connect-prompt__title {
  font-size: 28px;
  font-weight: 900;
  color: var(--turtle-text);
  text-shadow: 0 2px 10px var(--turtle-title-shadow);
}

.connect-prompt__desc {
  font-size: 14px;
  color: var(--turtle-text-subtle);
  text-align: center;
  line-height: 1.6;
}

.purchase-grid {
  padding: 0 20px;
}

.purchase-card {
  border: 1px solid var(--turtle-primary-border);
}

.purchase-section__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 20px 0;
}

.purchase-section__title {
  font-size: 20px;
  font-weight: 800;
  color: var(--turtle-text);
  letter-spacing: 1px;
}

.purchase-section__price {
  font-size: 12px;
  font-weight: 700;
  color: var(--turtle-primary);
  background: var(--turtle-primary-soft);
  padding: 4px 12px;
  border-radius: 20px;
}

.purchase-section__counter {
  display: flex;
  align-items: center;
  gap: 30px;
  background: var(--turtle-panel-bg);
  padding: 8px 16px;
  border-radius: 40px;
  border: 1px solid var(--turtle-panel-border);
}

.counter-btn {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background: linear-gradient(135deg, var(--turtle-primary) 0%, var(--turtle-primary-strong) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px var(--turtle-primary-glow-strong);

  &:active {
    transform: scale(0.95);
  }
}

.btn-icon {
  color: var(--turtle-text);
  font-size: 24px;
  font-weight: 800;
}

.counter-value {
  font-size: 40px;
  font-weight: 900;
  color: var(--turtle-text);
  min-width: 80px;
  text-align: center;
}

.purchase-section__total {
  text-align: center;
}

.total-label {
  font-size: 12px;
  color: var(--turtle-text-muted);
  display: block;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.total-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--turtle-accent);
}

.game-stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-bubble {
  flex: 1;
  background: var(--turtle-glass);
  backdrop-filter: blur(5px);
  border: 1px solid var(--turtle-panel-border);
  padding: 12px;
  border-radius: 16px;
  text-align: center;

  &.highlight {
    background: var(--turtle-accent-soft);
    border-color: var(--turtle-accent-border);
  }
}

.bubble-label {
  font-size: 9px;
  text-transform: uppercase;
  color: var(--turtle-text-muted);
  margin-bottom: 4px;
  display: block;
}

.bubble-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--turtle-text);
  &.gold {
    color: var(--turtle-accent);
  }
}

.grid-container {
  margin-bottom: 30px;
}

.auto-play-status {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 40px;
  background: var(--turtle-primary-soft);
  border: 1px solid var(--turtle-primary-border);
  border-radius: 40px;
  overflow: hidden;
}

.auto-play-text {
  font-size: 14px;
  font-weight: 800;
  color: var(--turtle-primary);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.auto-play-waves {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.p-wave {
  position: absolute;
  inset: 0;
  border: 1px solid var(--turtle-primary-border);
  border-radius: 40px;
  animation: pulse-wave 2s infinite;
  &:last-child {
    animation-delay: 1s;
  }
}

@keyframes pulse-wave {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.5, 2);
    opacity: 0;
  }
}

.error-banner {
  background: var(--turtle-danger-soft);
  border: 1px solid var(--turtle-danger-border);
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 12px;
  text-align: center;
}

.error-text {
  color: var(--turtle-danger-text);
  font-size: 12px;
  font-weight: 600;
}
</style>
