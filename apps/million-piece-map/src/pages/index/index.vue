<template>
  <ResponsiveLayout :desktop-breakpoint="1024" :tabs="navTabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <view class="theme-million-piece">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <view v-if="activeTab === 'map'" class="tab-content">
        <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-4 text-center">
          <text class="font-bold">{{ status.msg }}</text>
        </NeoCard>

        <!-- Pixel Art Territory Map -->
        <NeoCard variant="erobo" class="map-card">
          <view class="map-container">
            <!-- Coordinate Display -->
            <view class="coordinate-display">
              <text class="coord-label">{{ t("coordinates") }}:</text>
              <text class="coord-value">X: {{ selectedX }} / Y: {{ selectedY }}</text>
            </view>

            <!-- Zoom Controls -->
            <view class="zoom-controls">
              <view class="zoom-btn" @click="zoomOut">
                <text>-</text>
              </view>
              <text class="zoom-level">{{ zoomLevel }}x</text>
              <view class="zoom-btn" @click="zoomIn">
                <text>+</text>
              </view>
            </view>

            <!-- Pixel Grid Map -->
            <view class="pixel-map-wrapper">
              <view class="pixel-map" :style="{ transform: `scale(${zoomLevel})` }">
                <view
                  v-for="(tile, i) in tiles"
                  :key="i"
                  :class="[
                    'pixel',
                    tile.owned && 'pixel-owned',
                    tile.selected && 'pixel-selected',
                    tile.isYours && 'pixel-yours',
                  ]"
                  :style="{ backgroundColor: getTileColor(tile) }"
                  @click="selectTile(i)"
                >
                  <view v-if="tile.selected" class="pixel-cursor"></view>
                </view>
              </view>
            </view>

            <!-- Map Legend -->
            <view class="map-legend">
              <view class="legend-item">
                <view class="legend-color legend-available"></view>
                <text class="legend-text">{{ t("available") }}</text>
              </view>
              <view class="legend-item">
                <view class="legend-color legend-yours"></view>
                <text class="legend-text">{{ t("yourTerritory") }}</text>
              </view>
              <view class="legend-item">
                <view class="legend-color legend-others"></view>
                <text class="legend-text">{{ t("othersTerritory") }}</text>
              </view>
            </view>
          </view>
        </NeoCard>

        <!-- Territory Purchase Panel -->
        <NeoCard variant="erobo-neo">
          <NeoCard variant="erobo-neo" flat class="territory-info">
            <view class="info-row">
              <text class="info-label">{{ t("position") }}:</text>
              <text class="info-value">{{ t("tile") }} #{{ selectedTile }} ({{ selectedX }}, {{ selectedY }})</text>
            </view>
            <view class="info-row">
              <text class="info-label">{{ t("status") }}:</text>
              <text :class="['info-value', tiles[selectedTile].owned ? 'status-owned' : 'status-free']">
                {{ tiles[selectedTile].owned ? t("occupied") : t("available") }}
              </text>
            </view>
            <view class="info-row price-row">
              <text class="info-label">{{ t("price") }}:</text>
              <text class="info-value price-value">{{ tilePrice }} GAS</text>
            </view>
          </NeoCard>
          <NeoButton
            variant="primary"
            size="lg"
            block
            :loading="isPurchasing"
            :disabled="tiles[selectedTile].owned"
            @click="purchaseTile"
          >
            {{ isPurchasing ? t("claiming") : tiles[selectedTile].owned ? t("alreadyClaimed") : t("claimNow") }}
          </NeoButton>
        </NeoCard>
      </view>

      <!-- Stats Tab -->
      <view v-if="activeTab === 'stats'" class="tab-content scrollable">
        <!-- Territory Stats -->
        <NeoCard variant="erobo" class="mb-4">
          <view class="stats-grid">
            <NeoCard flat variant="erobo-neo" class="flex flex-col items-center p-3 text-center">
              <text class="stat-value">{{ ownedTiles }}</text>
              <text class="stat-label">{{ t("tilesOwned") }}</text>
            </NeoCard>
            <NeoCard flat variant="erobo-neo" class="flex flex-col items-center p-3 text-center">
              <text class="stat-value">{{ coverage }}%</text>
              <text class="stat-label">{{ t("mapControl") }}</text>
            </NeoCard>
            <NeoCard flat variant="erobo-neo" class="flex flex-col items-center p-3 text-center">
              <text class="stat-value">{{ formatNum(totalSpent) }}</text>
              <text class="stat-label">{{ t("gasSpent") }}</text>
            </NeoCard>
          </view>
        </NeoCard>

        <NeoCard variant="erobo">
          <NeoStats :stats="statsData" />
        </NeoCard>
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
      <Fireworks :active="status?.type === 'success'" :duration="3000" />
    </view>
  </ResponsiveLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useWallet, useEvents } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { formatNumber } from "@shared/utils/format";
import { requireNeoChain } from "@shared/utils/chain";
import { useI18n } from "@/composables/useI18n";
import { addressToScriptHash, normalizeScriptHash, parseInvokeResult } from "@shared/utils/neo";
import { ResponsiveLayout,
  NeoButton,
  NeoCard,
  NeoStats,
  NeoDoc,
  Fireworks,
  type StatItem,
  ChainWarning, } from "@shared/components";
import { usePaymentFlow } from "@shared/composables/usePaymentFlow";

const { t } = useI18n();

const navTabs = computed(() => [
  { id: "map", icon: "grid", label: t("map") },
  { id: "stats", icon: "chart", label: t("stats") },
  { id: "docs", icon: "book", label: t("docs") },
]);
const activeTab = ref("map");

const docSteps = computed(() => [t("step1"), t("step2"), t("step3"), t("step4")]);
const docFeatures = computed(() => [
  { name: t("feature1Name"), desc: t("feature1Desc") },
  { name: t("feature2Name"), desc: t("feature2Desc") },
]);

const APP_ID = "miniapp-millionpiecemap";
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress } = useWallet() as WalletSDK;
const { processPayment } = usePaymentFlow(APP_ID);
const { list: listEvents } = useEvents();

const GRID_SIZE = 64;
const GRID_WIDTH = 8;
const TILE_PRICE = 0.1;

// Territory color palette - E-Robo Neon Theme
const TERRITORY_COLORS = [
  "var(--map-territory-1)", // Pink
  "var(--map-territory-2)", // Neo Green
  "var(--map-territory-3)", // Electric Purple
  "var(--map-territory-4)", // Cyan
  "var(--map-territory-5)", // Yellow
  "var(--map-territory-6)", // Soft Purple
  "var(--map-territory-7)", // Orange
  "var(--map-territory-8)", // Blue
];

type Tile = {
  owned: boolean;
  owner: string;
  isYours: boolean;
  selected: boolean;
  x: number;
  y: number;
};

const tiles = ref<Tile[]>(
  Array.from({ length: GRID_SIZE }, (_, i) => ({
    owned: false,
    owner: "",
    isYours: false,
    selected: false,
    x: i % GRID_WIDTH,
    y: Math.floor(i / GRID_WIDTH),
  })),
);

const selectedTile = ref(0);
const tilePrice = ref(TILE_PRICE);
const isPurchasing = ref(false);
const status = ref<{ msg: string; type: string } | null>(null);
const zoomLevel = ref(1);
const contractAddress = ref<string | null>(null);

const selectedX = computed(() => selectedTile.value % GRID_WIDTH);
const selectedY = computed(() => Math.floor(selectedTile.value / GRID_WIDTH));
const ownedTiles = computed(() => tiles.value.filter((tile) => tile.isYours).length);
const totalSpent = computed(() => ownedTiles.value * tilePrice.value);
const coverage = computed(() => Math.round((ownedTiles.value / GRID_SIZE) * 100));
const formatNum = (n: number) => formatNumber(n, 2);

const statsData = computed<StatItem[]>(() => [
  { label: t("owned"), value: ownedTiles.value, variant: "accent" },
  { label: t("spent"), value: `${formatNum(totalSpent.value)} GAS`, variant: "default" },
  { label: t("coverage"), value: `${coverage.value}%`, variant: "success" },
]);

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) {
    throw new Error(t("contractUnavailable"));
  }
  return contractAddress.value as string;
};

const waitForEvent = async (txid: string, eventName: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await listEvents({ app_id: APP_ID, event_name: eventName, limit: 25 });
    const match = res.events.find((evt) => evt.tx_hash === txid);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
};

const parsePiece = (data: any) => {
  if (!data) return null;
  if (Array.isArray(data)) {
    return {
      owner: String(data[0] ?? ""),
      x: Number(data[1] ?? 0),
      y: Number(data[2] ?? 0),
      purchaseTime: Number(data[3] ?? 0),
      price: Number(data[4] ?? 0),
    };
  }
  if (typeof data === "object") {
    return {
      owner: String(data.owner ?? ""),
      x: Number(data.x ?? 0),
      y: Number(data.y ?? 0),
      purchaseTime: Number(data.purchaseTime ?? 0),
      price: Number(data.price ?? 0),
    };
  }
  return null;
};

const getOwnerColorIndex = (owner: string) => {
  if (!owner) return 0;
  let hash = 0;
  for (let i = 0; i < owner.length; i += 1) {
    hash = (hash + owner.charCodeAt(i)) % TERRITORY_COLORS.length;
  }
  return hash;
};

const getTileColor = (tile: any) => {
  if (tile.selected) return "var(--neo-purple)";
  if (tile.isYours) return "var(--neo-green)";
  if (tile.owned) return TERRITORY_COLORS[getOwnerColorIndex(tile.owner)] || "var(--neo-orange)";
  return "var(--bg-card)";
};

const selectTile = (index: number) => {
  tiles.value.forEach((t, i) => (t.selected = i === index));
  selectedTile.value = index;
};

const zoomIn = () => {
  if (zoomLevel.value < 2) zoomLevel.value += 0.25;
};

const zoomOut = () => {
  if (zoomLevel.value > 0.5) zoomLevel.value -= 0.25;
};

const loadTiles = async () => {
  try {
    const contract = await ensureContractAddress();
    const userHash = address.value ? normalizeScriptHash(addressToScriptHash(address.value)) : "";
    const updates = await Promise.all(
      tiles.value.map(async (tile) => {
        const res = await invokeRead({
          contractHash: contract,
          operation: "GetPiece",
          args: [
            { type: "Integer", value: String(tile.x) },
            { type: "Integer", value: String(tile.y) },
          ],
        });
        const parsed = parsePiece(parseInvokeResult(res));
        const ownerHash = normalizeScriptHash(parsed?.owner || "");
        const owned = Boolean(ownerHash);
        const isYours = Boolean(userHash && ownerHash && ownerHash === userHash);
        return {
          ...tile,
          owned,
          owner: parsed?.owner || "",
          isYours,
        };
      }),
    );
    tiles.value = updates;
  } catch (e: any) {
    status.value = { msg: e?.message || t("error"), type: "error" };
  }
};

const purchaseTile = async () => {
  if (isPurchasing.value) return;
  if (tiles.value[selectedTile.value].owned) {
    status.value = { msg: t("tileAlreadyOwned"), type: "error" };
    return;
  }

  isPurchasing.value = true;
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t("connectWallet"));
    }
    const contract = await ensureContractAddress();
    const tile = tiles.value[selectedTile.value];
    const { receiptId, invoke } = await processPayment(tilePrice.value.toString(), `map:claim:${tile.x}:${tile.y}`);
    if (!receiptId) {
      throw new Error(t("receiptMissing"));
    }
    const tx = await invoke(
      "claimPiece",
      [
        { type: "Hash160", value: address.value as string },
        { type: "Integer", value: String(tile.x) },
        { type: "Integer", value: String(tile.y) },
        { type: "Integer", value: String(receiptId) },
      ],
      contract,
    );
    const txid = String(
      (tx as { txid?: string; txHash?: string })?.txid || (tx as { txid?: string; txHash?: string })?.txHash || "",
    );
    const evt = txid ? await waitForEvent(txid, "PieceClaimed") : null;
    if (!evt) {
      throw new Error(t("claimPending"));
    }
    await loadTiles();
    status.value = { msg: t("tilePurchased"), type: "success" };
  } catch (e: any) {
    status.value = { msg: e.message || t("error"), type: "error" };
  } finally {
    isPurchasing.value = false;
  }
};

onMounted(async () => {
  await loadTiles();
});

watch(address, async () => {
  await loadTiles();
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./million-piece-map-theme.scss";

:global(page) {
  background: var(--bg-primary);
}

.tab-content {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: var(--map-sea);
  background-image:
    repeating-linear-gradient(45deg, transparent 0, transparent 40px, var(--map-grid) 40px, var(--map-grid) 80px),
    radial-gradient(var(--map-paper) 20%, transparent 20%);
  background-size:
    200px 200px,
    40px 40px;
  min-height: 100vh;
}

.map-card {
  border: 4px solid var(--map-border);
  border-radius: 4px;
  background: var(--map-bg);
  box-shadow: var(--map-shadow);
  position: relative;

  &::after {
    content: "X";
    position: absolute;
    top: 10px;
    right: 10px;
    font-family: "Times New Roman", serif;
    font-weight: bold;
    color: var(--map-red);
    font-size: 24px;
    opacity: 0.5;
    pointer-events: none;
  }
}

.pixel-map-wrapper {
  background: var(--map-tile-bg);
  border: 2px dashed var(--map-border);
  border-radius: 4px;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  box-shadow: var(--map-panel-shadow);
}

.pixel-map {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.pixel {
  width: 32px;
  height: 32px;
  border: 1px solid var(--map-tile-border);
  cursor: pointer;
  background: var(--map-paper);
  transition: all 0.2s;

  &.has-selection {
    z-index: 10;
  }
  &.pixel-selected {
    border: 3px solid var(--map-red);
    transform: scale(1.1);
    z-index: 20;
    position: relative;
    &::after {
      content: "X";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--map-red);
      font-weight: bold;
      font-size: 20px;
      line-height: 1;
    }
  }
  &.pixel-yours {
    background-color: var(--map-gold) !important;
    border: 1px solid var(--map-border);
  }
}

/* Pirate Component Overrides */
:global(.theme-million-piece) :deep(.neo-card) {
  background: var(--map-bg) !important;
  color: var(--map-ink) !important;
  border: 2px solid var(--map-border) !important;
  box-shadow: var(--map-card-shadow-lite) !important;
  border-radius: 4px !important;

  &.variant-erobo-neo {
    background: var(--map-paper) !important;
  }
  &.variant-danger {
    background: var(--map-danger-bg) !important;
    border-color: var(--map-red) !important;
    color: var(--map-red) !important;
  }
}

:global(.theme-million-piece) :deep(.neo-button) {
  border-radius: 4px !important;
  font-family: "Times New Roman", serif !important;
  text-transform: uppercase;
  font-weight: 800 !important;
  letter-spacing: 0.1em;

  &.variant-primary {
    background: var(--map-red) !important;
    color: var(--map-button-text) !important;
    border: 2px solid var(--map-border) !important;
    box-shadow: 4px 4px 0 var(--map-border) !important;

    &:active {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--map-border) !important;
    }
  }
}

.coordinate-display {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--map-paper);
  color: var(--map-ink);
  border: 1px solid var(--map-border);
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-weight: 700;
  font-size: 14px;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--map-paper);
  color: var(--map-ink);
  border: 1px solid var(--map-border);
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
}

.map-legend {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 8px;
  background: var(--map-paper);
  border: 1px solid var(--map-border);
  border-radius: 4px;
}

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.map-warning-title {
  color: var(--map-red);
}

.map-warning-desc {
  color: var(--map-ink);
}
</style>
