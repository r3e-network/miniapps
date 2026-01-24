<template>
  <view class="container theme-piggy-bank">
  <view class="header">
    <view class="title-row">
      <text class="title">{{ t('app.title') }}</text>
      <button class="settings-btn" @click="openSettings">⚙️</button>
    </view>
    <text class="subtitle">{{ t('app.subtitle') }}</text>
    <view class="status-row">
      <text class="status-chip">{{ currentChain?.shortName || 'EVM' }}</text>
      <text class="status-chip" :class="{ connected: isConnected }">
        {{ isConnected ? formatAddress(userAddress) : t('wallet.not_connected') }}
      </text>
      <button class="connect-btn" v-if="!isConnected" @click="handleConnect">
        {{ t('wallet.connect') }}
      </button>
    </view>
  </view>

  <view v-if="configIssues.length > 0" class="config-warning">
    <text class="warning-title">{{ t('settings.missing_config') }}</text>
    <text v-for="issue in configIssues" :key="issue" class="warning-item">
      • {{ issue }}
    </text>
  </view>

    <scroll-view scroll-y class="content">
      <view v-if="piggyBanks.length === 0" class="empty-state">
        <text class="empty-text">No Piggy Banks yet.</text>
        <button class="create-btn" @click="goToCreate">{{ t('create.create_btn') }}</button>
      </view>

      <view v-else class="grid">
        <view 
          v-for="bank in piggyBanks" 
          :key="bank.id" 
          class="card"
          @click="goToDetail(bank.id)"
          :style="{ borderColor: bank.themeColor, boxShadow: `0 0 10px ${bank.themeColor}40` }"
        >
          <view class="card-header">
            <text class="bank-name">{{ bank.name }}</text>
            <view class="status-badge" :class="{ locked: isLocked(bank) }">
              {{ isLocked(bank) ? '🔒' : '🔓' }}
            </view>
          </view>
          
          <text class="purpose">{{ bank.purpose }}</text>
          
          <view class="progress-section">
          <text class="label">
            {{ t('create.target_label') }}: {{ bank.targetAmount }} {{ bank.targetToken.symbol }}
          </text>
            <view class="progress-bar-bg">
              <!-- Since balance is hidden, we don't show real progress distinctively unless checked -->
              <view class="progress-bar-fill unknown"></view>
            </view>
          </view>
          
          <text class="date-info">
             {{ new Date(bank.unlockTime * 1000).toLocaleDateString() }}
          </text>
        </view>
      </view>
    </scroll-view>

    <view v-if="piggyBanks.length > 0" class="fab" @click="goToCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>

  <view v-if="showSettings" class="modal-overlay" @click="showSettings = false">
    <view class="modal-content" @click.stop>
      <text class="modal-title">{{ t('settings.title') }}</text>

      <view class="form-group">
        <text class="label">{{ t('settings.network') }}</text>
        <picker
          mode="selector"
          :value="currentChainIndex"
          :range="chainOptions"
          range-key="name"
          @change="onChainChange"
        >
          <view class="picker-view">
            {{ selectedChain?.name || t('settings.select_network') }}
          </view>
        </picker>
      </view>

      <view class="form-group">
        <text class="label">{{ t('settings.alchemy_key') }}</text>
        <input
          class="input-field"
          type="password"
          v-model="settingsForm.alchemyApiKey"
          :placeholder="t('settings.alchemy_placeholder')"
          placeholder-class="placeholder"
        />
      </view>

      <view class="form-group">
        <text class="label">{{ t('settings.walletconnect') }}</text>
        <input
          class="input-field"
          v-model="settingsForm.walletConnectProjectId"
          :placeholder="t('settings.walletconnect_placeholder')"
          placeholder-class="placeholder"
        />
      </view>

      <view class="form-group">
        <text class="label">{{ t('settings.contract_address') }}</text>
        <input
          class="input-field"
          v-model="settingsForm.contractAddress"
          placeholder="0x..."
          placeholder-class="placeholder"
        />
      </view>

      <view class="modal-actions">
        <button class="cancel-btn" @click="showSettings = false">{{ t('common.cancel') }}</button>
        <button class="submit-btn" @click="saveSettings">{{ t('common.confirm') }}</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePiggyStore, type PiggyBank } from '@/stores/piggy';
import { storeToRefs } from 'pinia';
import { useI18n } from '@/composables/useI18n';
import { formatAddress } from '@shared/utils/format';

const { t } = useI18n();
const store = usePiggyStore();
const { piggyBanks, currentChainId, alchemyApiKey, walletConnectProjectId, userAddress, isConnected } =
  storeToRefs(store);

const showSettings = ref(false);
const chainOptions = computed(() => store.EVM_CHAINS);
const currentChain = computed(() =>
  chainOptions.value.find((chain) => chain.id === currentChainId.value),
);
const selectedChain = computed(() =>
  chainOptions.value.find((chain) => chain.id === settingsForm.value.chainId),
);
const currentChainIndex = computed(() =>
  Math.max(
    0,
    chainOptions.value.findIndex((chain) => chain.id === settingsForm.value.chainId),
  ),
);

const settingsForm = ref({
  chainId: currentChainId.value,
  alchemyApiKey: alchemyApiKey.value,
  walletConnectProjectId: walletConnectProjectId.value,
  contractAddress: store.getContractAddress(currentChainId.value),
});

const configIssues = computed(() => {
  const issues: string[] = [];
  if (!alchemyApiKey.value) issues.push(t('settings.issue_alchemy'));
  if (!store.getContractAddress(currentChainId.value)) issues.push(t('settings.issue_contract'));
  return issues;
});

const isLocked = (bank: PiggyBank) => Date.now() / 1000 < bank.unlockTime;

const openSettings = () => {
  settingsForm.value = {
    chainId: currentChainId.value,
    alchemyApiKey: alchemyApiKey.value,
    walletConnectProjectId: walletConnectProjectId.value,
    contractAddress: store.getContractAddress(currentChainId.value),
  };
  showSettings.value = true;
};

const onChainChange = (e: any) => {
  const idx = Number(e.detail.value);
  const chain = chainOptions.value[idx];
  if (!chain) return;
  settingsForm.value.chainId = chain.id;
  settingsForm.value.contractAddress = store.getContractAddress(chain.id);
};

const saveSettings = async () => {
  try {
    store.setAlchemyApiKey(settingsForm.value.alchemyApiKey);
    store.setWalletConnectProjectId(settingsForm.value.walletConnectProjectId);
    store.setContractAddress(settingsForm.value.chainId, settingsForm.value.contractAddress);
    await store.switchChain(settingsForm.value.chainId);
    showSettings.value = false;
  } catch (err: any) {
    uni.showToast({ title: err?.message || 'Settings error', icon: 'none' });
  }
};

const handleConnect = async () => {
  try {
    await store.connectWallet();
  } catch (err: any) {
    uni.showToast({ title: err?.message || t('wallet.connect_failed'), icon: 'none' });
  }
};

const goToCreate = () => {
  uni.navigateTo({ url: '/pages/create/create' });
};

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
};
</script>

<style scoped lang="scss">
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./piggy-bank-theme.scss";
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 20px;
  box-sizing: border-box;
}

.header {
  margin-bottom: 30px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 32px;
  font-weight: 800;
  display: block;
  background: linear-gradient(90deg, var(--piggy-accent-start), var(--piggy-accent-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.settings-btn {
  background: transparent;
  border: 1px solid var(--piggy-border-strong);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 16px;
  padding: 6px 10px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.7;
}

.status-row {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.status-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--piggy-chip-bg);
  border: 1px solid var(--piggy-chip-border);
  font-size: 12px;
  color: var(--piggy-chip-text);
}

.status-chip.connected {
  background: var(--piggy-chip-connected-bg);
  border-color: var(--piggy-chip-connected-border);
  color: var(--piggy-chip-connected-text);
}

.connect-btn {
  background: linear-gradient(90deg, var(--piggy-accent-start), var(--piggy-accent-end));
  color: var(--piggy-accent-text);
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-weight: 700;
  font-size: 12px;
}

.config-warning {
  border: 1px solid var(--piggy-warning-border);
  background: var(--piggy-warning-bg);
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.warning-title {
  font-weight: 700;
  display: block;
  margin-bottom: 6px;
}

.warning-item {
  display: block;
  font-size: 12px;
  opacity: 0.8;
}

.content {
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  opacity: 0.5;
}

.create-btn {
  margin-top: 20px;
  background: linear-gradient(90deg, var(--piggy-accent-start), var(--piggy-accent-end));
  color: var(--piggy-accent-text);
  border: none;
  border-radius: 20px;
  padding: 10px 30px;
  font-weight: bold;
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: var(--piggy-card-bg); // Glass
  backdrop-filter: blur(10px);
  border: 1px solid var(--piggy-card-border);
  border-radius: 16px;
  padding: 20px;
  transition: transform 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.bank-name {
  font-size: 20px;
  font-weight: bold;
}

.purpose {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 15px;
  display: block;
}

.progress-section {
  margin-bottom: 10px;
}

.label {
  font-size: 12px;
  opacity: 0.6;
}

.progress-bar-bg {
  height: 6px;
  background: var(--piggy-progress-bg);
  border-radius: 3px;
  margin-top: 5px;
  overflow: hidden;
}

.progress-bar-fill.unknown {
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    45deg,
    var(--piggy-progress-fill),
    var(--piggy-progress-fill) 10px,
    var(--piggy-progress-fill-strong) 10px,
    var(--piggy-progress-fill-strong) 20px
  );
}

.date-info {
  font-size: 12px;
  opacity: 0.5;
  text-align: right;
  display: block;
}

.fab {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background: linear-gradient(135deg, var(--piggy-accent-start), var(--piggy-accent-end));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--piggy-fab-shadow);
  z-index: 100;
  
  &:active {
    transform: scale(0.9);
  }
}

.fab-icon {
  font-size: 32px;
  color: var(--piggy-accent-text);
  font-weight: bold;
  margin-top: -4px; // Optical adjustment
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--piggy-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 420px;
  background: var(--piggy-modal-bg);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--piggy-border);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.input-field {
  background: var(--piggy-input-bg);
  border: 1px solid var(--piggy-input-border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--piggy-input-text);
}

.picker-view {
  border: 1px solid var(--piggy-input-border);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--piggy-input-bg);
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.cancel-btn {
  flex: 1;
  background: transparent;
  border: 1px solid var(--piggy-border-strong);
  color: var(--text-primary);
  padding: 10px;
  border-radius: 10px;
}

.submit-btn {
  flex: 1;
  background: linear-gradient(90deg, var(--piggy-accent-start), var(--piggy-accent-end));
  color: var(--piggy-accent-text);
  border: none;
  border-radius: 10px;
  padding: 10px;
  font-weight: 700;
}
</style>
