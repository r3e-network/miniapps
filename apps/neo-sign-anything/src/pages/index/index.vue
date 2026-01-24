<template>
  <AppLayout class="theme-neo-sign-anything"
    :title="t('appTitle')"
    :show-top-nav="false"
    :active-tab="currentTab"
    :tabs="[{ id: 'home', label: t('home'), icon: 'Home' }, { id: 'docs', label: t('docs'), icon: 'Book' }]"
    @tab-change="onTabChange"
  >
  <view class="container">
      <view v-if="chainType === 'evm'" class="chain-warning">
        <NeoCard variant="danger">
          <view class="chain-warning__content">
            <text class="chain-warning__title">{{ t("wrongChain") }}</text>
            <text class="chain-warning__desc">{{ t("wrongChainMessage") }}</text>
            <NeoButton size="sm" variant="secondary" class="mt-2" @click="() => switchToAppChain()">
              {{ t("switchToNeo") }}
            </NeoButton>
          </view>
        </NeoCard>
      </view>

      <view class="header">
        <text class="title">{{ t('signTitle') }}</text>
        <text class="subtitle">{{ t('signDesc') }}</text>
      </view>

      <NeoCard variant="erobo">
        <view class="input-group">
          <text class="label">{{ t('messageLabel') }}</text>
          <textarea
            v-model="message"
            class="textarea"
            :placeholder="t('messagePlaceholder')"
            maxlength="1000"
          />
          <view class="char-count">{{ message.length }}/1000</view>
        </view>

        <view class="actions">
          <NeoButton
            variant="primary"
            block
            :loading="isSigning"
            @click="signMessage"
            :disabled="!message || !address"
          >
            {{ t('signBtn') }}
          </NeoButton>
          
          <NeoButton
            variant="ghost"
            block
            :loading="isBroadcasting"
            @click="broadcastMessage"
            :disabled="!message || !address"
            style="margin-top: 12px;"
          >
            {{ t('broadcastBtn') }}
          </NeoButton>
        </view>
      </NeoCard>

      <view v-if="signature" class="result-card">
        <NeoCard variant="erobo-neo">
          <view class="result-header">
            <text class="result-title">{{ t('signatureResult') }}</text>
            <view class="copy-btn" @click="copyToClipboard(signature)">
              <text class="copy-text">{{ t('copy') }}</text>
            </view>
          </view>
          <text class="result-text">{{ signature }}</text>
        </NeoCard>
      </view>

      <view v-if="txHash" class="result-card">
        <NeoCard variant="erobo-purple">
          <view class="result-header">
            <text class="result-title">{{ t('broadcastResult') }}</text>
            <view class="copy-btn" @click="copyToClipboard(txHash)">
              <text class="copy-text">{{ t('copy') }}</text>
            </view>
          </view>
          <text class="result-text">{{ txHash }}</text>
          <text class="success-msg">{{ t('broadcastSuccess') }}</text>
        </NeoCard>
      </view>
      
      <view v-if="!address" class="connect-prompt">
        <text class="connect-text">{{ t('connectWallet') }}</text>
      </view>
    </view>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AppLayout, NeoCard, NeoButton } from '@shared/components';
import { useWallet } from '@neo/uniapp-sdk';
import { requireNeoChain } from '@shared/utils/chain';
import { useI18n } from '@/composables/useI18n';

// i18n
const { t } = useI18n();

// State
const message = ref('');
const signature = ref('');
const txHash = ref('');
const isSigning = ref(false);
const isBroadcasting = ref(false);
const currentTab = ref('home');

const { address, connect, signMessage: signWithWallet, invokeContract, chainType, switchToAppChain } = useWallet() as any;
const MAX_MESSAGE_BYTES = 1024;

const getMessageBytes = (value: string): number => {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}/g, "x").length;
};

const onTabChange = (tabId: string) => {
  if (tabId === 'docs') {
    uni.navigateTo({ url: '/pages/docs/index' });
  } else {
    currentTab.value = tabId;
  }
};

const signMessage = async () => {
  if (!message.value) return;
  if (!requireNeoChain(chainType, t)) return;
  
  isSigning.value = true;
  signature.value = '';
  txHash.value = ''; // clear previous results
  
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t('connectWallet'));
    }

    const result = await signWithWallet(message.value);
    
    // The result might be an object { signature, publicKey, salt } or just signature string 
    // depending on the bridge implementation. Let's assume standard response.
    if (typeof result === 'string') {
        signature.value = result;
    } else if (result && typeof result === 'object' && (result as any).signature) {
        signature.value = (result as any).signature;
    } else {
        signature.value = JSON.stringify(result);
    }
  } catch (err: any) {
    uni.showToast({ title: err.message || t('signFailed'), icon: 'none' });
  } finally {
    isSigning.value = false;
  }
};

const broadcastMessage = async () => {
  if (!message.value) return;
  if (!requireNeoChain(chainType, t)) return;
  if (getMessageBytes(message.value) > MAX_MESSAGE_BYTES) {
    uni.showToast({ title: t('messageTooLong'), icon: 'none' });
    return;
  }
  
  isBroadcasting.value = true;
  txHash.value = '';
  signature.value = ''; // clear previous results
  
  try {
    if (!address.value) {
      await connect();
    }
    if (!address.value) {
      throw new Error(t('connectWallet'));
    }

    // Broadcast by sending a 0 GAS transfer to self with message in data.
    const result = await invokeContract({
      scriptHash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      operation: 'transfer',
      args: [
        { type: 'Hash160', value: address.value },
        { type: 'Hash160', value: address.value },
        { type: 'Integer', value: '0' },
        { type: 'String', value: message.value }
      ]
    });
    
    if (result && (result as any).txid) {
      txHash.value = (result as any).txid;
    } else if (typeof result === 'string') {
      txHash.value = result;
    } else {
      txHash.value = t('txPending');
    }

  } catch (err: any) {
    uni.showToast({ title: err.message || t('broadcastFailed'), icon: 'none' });
  } finally {
    isBroadcasting.value = false;
  }
};

const copyToClipboard = (text: string) => {
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: t('copySuccess'), icon: 'none' });
    }
  });
};
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./neo-sign-anything-theme.scss";

.container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chain-warning {
  margin-bottom: 8px;
}

.chain-warning__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chain-warning__title {
  font-size: 13px;
  font-weight: 700;
}

.chain-warning__desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.header {
  margin-bottom: 8px;
}

.title {
  font-size: 28px;
  font-weight: 900;
  color: var(--text-primary);
  display: block;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.textarea {
  width: 100%;
  height: 120px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
}

.char-count {
  text-align: right;
  font-size: 10px;
  color: var(--text-muted);
}

.result-card {
  animation: slideIn 0.3s ease-out;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.copy-btn {
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.copy-text {
  font-size: 10px;
  font-weight: 700;
}

.result-text {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  color: var(--text-primary);
  background: var(--bg-secondary);
  padding: 8px;
  border-radius: 8px;
}

.success-msg {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--sign-success);
}

.connect-prompt {
  text-align: center;
  margin-top: 24px;
}

.connect-text {
  font-size: 12px;
  color: var(--text-muted);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
