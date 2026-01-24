<template>
  <AppLayout class="theme-forever-album" :tabs="navTabs" :active-tab="activeTab" @tab-change="onTabChange">
    <view class="album-container">
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
        <text class="title">{{ t("title") }}</text>
        <text class="subtitle">{{ t("subtitle") }}</text>
      </view>

      <NeoCard v-if="!address" variant="warning" class="connect-card">
        <view class="connect-card__content">
          <text class="connect-card__title">{{ t("connectPromptTitle") }}</text>
          <text class="connect-card__desc">{{ t("connectPromptDesc") }}</text>
          <NeoButton size="sm" variant="primary" @click="openWalletPrompt">
            {{ t("connectWallet") }}
          </NeoButton>
        </view>
      </NeoCard>

      <NeoCard variant="erobo" class="gallery-card">
        <view v-if="loadingPhotos" class="loading-state">
          <text>{{ t("loading") }}</text>
        </view>
        <view v-else class="gallery-grid">
          <view v-for="photo in photos" :key="photo.id" class="photo-item" @click="viewPhoto(photo)">
            <image v-if="!photo.encrypted" :src="photo.data" mode="aspectFill" class="photo-img" />
            <view v-else class="photo-locked">
              <text class="lock-label">{{ t("encrypted") }}</text>
            </view>
            <view v-if="photo.encrypted" class="lock-icon">{{ t("encrypted") }}</view>
          </view>

          <view class="photo-item placeholder" @click="openUpload">
            <text class="plus-icon">+</text>
            <text class="add-label">{{ t("addPhoto") }}</text>
          </view>
        </view>

        <view v-if="!loadingPhotos && photos.length === 0" class="empty-state">
          <text class="empty-title">{{ t("emptyTitle") }}</text>
          <text class="empty-desc">{{ t("emptyDesc") }}</text>
        </view>
      </NeoCard>

      <view class="helper-note">
        <text>{{ t("tapToSelect") }}</text>
      </view>
    </view>

    <NeoModal :visible="showUpload" :title="t('uploadPhoto')" closeable @close="closeUpload">
      <view class="upload-body">
        <view class="upload-grid">
          <view v-for="item in selectedImages" :key="item.id" class="upload-item">
            <image :src="item.dataUrl" mode="aspectFill" class="upload-img" />
            <view class="remove-btn" @click.stop="removeImage(item.id)">×</view>
          </view>
          <view
            v-if="selectedImages.length < MAX_PHOTOS_PER_UPLOAD"
            class="upload-item upload-placeholder"
            @click="chooseImages"
          >
            <text class="upload-plus">+</text>
            <text class="upload-tip">{{ t("selectMore") }}</text>
          </view>
        </view>

        <view class="upload-meta">
          <text>{{ t("uploadHint", { count: selectedImages.length, max: MAX_PHOTOS_PER_UPLOAD }) }}</text>
          <text class="upload-meta__size">
            {{ t("sizeHint", { size: formatBytes(totalPayloadSize), max: formatBytes(MAX_TOTAL_BYTES) }) }}
          </text>
        </view>

        <view class="form-group">
          <text class="label">{{ t("encryptPhoto") }}</text>
          <switch :checked="isEncrypted" @change="isEncrypted = $event.detail.value" />
        </view>

        <view v-if="isEncrypted" class="form-group column">
          <NeoInput v-model="password" type="password" :placeholder="t('enterPassword')" />
          <text class="hint">{{ t("encryptionNote") }}</text>
        </view>
      </view>

      <template #footer>
        <NeoButton variant="ghost" size="sm" @click="closeUpload">
          {{ t("cancel") }}
        </NeoButton>
        <NeoButton
          variant="primary"
          size="sm"
          :disabled="selectedImages.length === 0 || uploading"
          :loading="uploading"
          @click="uploadPhotos"
        >
          {{ uploading ? t("uploading") : t("confirm") }}
        </NeoButton>
      </template>
    </NeoModal>

    <NeoModal :visible="showDecrypt" :title="t('decryptTitle')" closeable @close="closeDecrypt">
      <view class="decrypt-body">
        <NeoInput v-model="decryptPassword" type="password" :placeholder="t('enterPassword')" />
        <NeoButton
          variant="secondary"
          size="sm"
          class="decrypt-btn"
          :loading="decrypting"
          @click="decryptPhoto"
        >
          {{ decrypting ? t("decrypting") : t("decryptConfirm") }}
        </NeoButton>

        <view v-if="decryptedPreview" class="decrypt-preview">
          <image :src="decryptedPreview" mode="aspectFit" class="decrypt-img" />
          <NeoButton size="sm" variant="ghost" @click="previewDecrypted">
            {{ t("openPreview") }}
          </NeoButton>
        </view>
      </view>
    </NeoModal>

    <WalletPrompt :visible="showWalletPrompt" @close="closeWalletPrompt" @connect="handleConnect" />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useWallet} from "@neo/uniapp-sdk";
import { AppLayout, NeoCard, NeoButton, NeoModal, NeoInput, WalletPrompt } from "@shared/components";
import { useI18n } from "@/composables/useI18n";
import { parseInvokeResult } from "@shared/utils/neo";
import { requireNeoChain } from "@shared/utils/chain";

const { t } = useI18n();
const { address, connect, invokeRead, invokeContract, chainType, getContractAddress, switchToAppChain } = useWallet() as any;

const MAX_PHOTOS_PER_UPLOAD = 5;
const MAX_PHOTO_BYTES = 45000;
const MAX_TOTAL_BYTES = 60000;

const activeTab = ref("album");
const navTabs = computed(() => [
  { id: "album", icon: "archive", label: t("albumTab") },
  { id: "docs", icon: "book", label: t("docsTab") },
]);

const onTabChange = (tabId: string) => {
  if (tabId === "docs") {
    uni.navigateTo({ url: "/pages/docs/index" });
  } else {
    activeTab.value = tabId;
  }
};

const contractAddress = ref<string | null>(null);
const loadingPhotos = ref(false);

interface PhotoItem {
  id: string;
  data: string;
  encrypted: boolean;
  createdAt: number;
}

interface UploadItem {
  id: string;
  dataUrl: string;
  size: number;
}

const photos = ref<PhotoItem[]>([]);
const showUpload = ref(false);
const selectedImages = ref<UploadItem[]>([]);
const isEncrypted = ref(false);
const password = ref("");
const uploading = ref(false);

const showDecrypt = ref(false);
const decryptTarget = ref<PhotoItem | null>(null);
const decryptPassword = ref("");
const decrypting = ref(false);
const decryptedPreview = ref("");

const showWalletPrompt = ref(false);

const totalPayloadSize = computed(() => selectedImages.value.reduce((sum, item) => sum + item.size, 0));

const openWalletPrompt = () => {
  showWalletPrompt.value = true;
};

const closeWalletPrompt = () => {
  showWalletPrompt.value = false;
};

const handleConnect = async () => {
  try {
    await connect();
    showWalletPrompt.value = false;
  } catch {
    showWalletPrompt.value = false;
  }
};

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) {
    throw new Error(t("missingContract"));
  }
  return contractAddress.value;
};

const parsePhotoInfo = (raw: any): PhotoItem | null => {
  if (!Array.isArray(raw) || raw.length < 5) return null;
  const [photoId, _owner, encrypted, data, createdAt] = raw;
  if (!photoId || !data) return null;
  return {
    id: String(photoId),
    data: String(data),
    encrypted: Boolean(encrypted),
    createdAt: Number(createdAt || 0),
  };
};

const loadPhotos = async () => {
  if (!address.value) {
    photos.value = [];
    return;
  }
  loadingPhotos.value = true;
  try {
    const contract = await ensureContractAddress();
    const countRes = await invokeRead({
      contractAddress: contract,
      operation: "getUserPhotoCount",
      args: [{ type: "Hash160", value: address.value }],
    });
    const count = Number(parseInvokeResult(countRes) || 0);
    if (!count) {
      photos.value = [];
      return;
    }
    const limit = Math.min(count, 50);
    const idsRes = await invokeRead({
      contractAddress: contract,
      operation: "getUserPhotoIds",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: "0" },
        { type: "Integer", value: String(limit) },
      ],
    });
    const idsRaw = parseInvokeResult(idsRes);
    const ids = Array.isArray(idsRaw) ? idsRaw.map((id) => String(id)).filter(Boolean) : [];
    const entries = await Promise.all(
      ids.map(async (id) => {
        const detailRes = await invokeRead({
          contractAddress: contract,
          operation: "getPhoto",
          args: [{ type: "ByteArray", value: id }],
        });
        const parsed = parseInvokeResult(detailRes);
        return parsePhotoInfo(parsed);
      }),
    );
    photos.value = entries
      .filter((entry): entry is PhotoItem => !!entry)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (e: any) {
    uni.showToast({ title: e?.message || t("loadFailed"), icon: "none" });
  } finally {
    loadingPhotos.value = false;
  }
};

const openUpload = async () => {
  if (!address.value) {
    openWalletPrompt();
    return;
  }
  showUpload.value = true;
  selectedImages.value = [];
  isEncrypted.value = false;
  password.value = "";
};

const closeUpload = () => {
  showUpload.value = false;
};

const chooseImages = () => {
  const remaining = MAX_PHOTOS_PER_UPLOAD - selectedImages.value.length;
  if (remaining <= 0) {
    uni.showToast({ title: t("maxPhotosReached"), icon: "none" });
    return;
  }
  uni.chooseImage({
    count: remaining,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      const paths = res.tempFilePaths || [];
      for (const path of paths) {
        const dataUrl = await readImageAsDataUrl(path);
        const size = dataUrl.length;
        if (size > MAX_PHOTO_BYTES) {
          uni.showToast({ title: t("imageTooLarge"), icon: "none" });
          continue;
        }
        const nextTotal = totalPayloadSize.value + size;
        if (nextTotal > MAX_TOTAL_BYTES) {
          uni.showToast({ title: t("totalTooLarge"), icon: "none" });
          break;
        }
        selectedImages.value.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          dataUrl,
          size,
        });
      }
    },
  });
};

const removeImage = (id: string) => {
  selectedImages.value = selectedImages.value.filter((item) => item.id !== id);
};

const readImageAsDataUrl = (path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: path,
      success: (info) => {
        const mime = resolveMimeType(info?.type, path);
        uni.getFileSystemManager().readFile({
          filePath: path,
          encoding: "base64",
          success: (res) => {
            resolve(`data:${mime};base64,${res.data}`);
          },
          fail: reject,
        });
      },
      fail: reject,
    });
  });

const resolveMimeType = (type: string | undefined, path: string) => {
  const ext = (type || path.split(".").pop() || "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
};

const ensureCrypto = () => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error(t("cryptoUnavailable"));
  }
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const deriveKey = async (passwordValue: string, salt: Uint8Array) => {
  ensureCrypto();
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey("raw", encoder.encode(passwordValue), "PBKDF2", false, [
    "deriveKey",
  ]);
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptPayload = async (payload: string, passwordValue: string) => {
  ensureCrypto();
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passwordValue, salt);
  const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(payload));
  return JSON.stringify({
    v: 1,
    alg: "AES-GCM",
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipher)),
  });
};

const decryptPayload = async (payload: string, passwordValue: string) => {
  ensureCrypto();
  const parsed = JSON.parse(payload);
  if (!parsed || parsed.v !== 1 || parsed.alg !== "AES-GCM") {
    throw new Error(t("invalidPayload"));
  }
  const salt = base64ToBytes(parsed.salt || "");
  const iv = base64ToBytes(parsed.iv || "");
  const data = base64ToBytes(parsed.data || "");
  const key = await deriveKey(passwordValue, salt);
  const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  const decoder = new TextDecoder();
  return decoder.decode(plain);
};

const uploadPhotos = async () => {
  if (uploading.value || selectedImages.value.length === 0) return;
  if (!address.value) {
    openWalletPrompt();
    return;
  }
  if (isEncrypted.value && !password.value) {
    uni.showToast({ title: t("passwordRequired"), icon: "none" });
    return;
  }

  uploading.value = true;
  try {
    const contract = await ensureContractAddress();
    const payloads: string[] = [];
    let totalSize = 0;
    for (const item of selectedImages.value) {
      const payload = isEncrypted.value ? await encryptPayload(item.dataUrl, password.value) : item.dataUrl;
      if (payload.length > MAX_PHOTO_BYTES) {
        throw new Error(t("encryptedTooLarge"));
      }
      totalSize += payload.length;
      if (totalSize > MAX_TOTAL_BYTES) {
        throw new Error(t("totalTooLarge"));
      }
      payloads.push(payload);
    }

    await invokeContract({
      contractAddress: contract,
      operation: "uploadPhotos",
      args: [
        {
          type: "Array",
          value: payloads.map((payload) => ({ type: "String", value: payload })),
        },
        {
          type: "Array",
          value: payloads.map(() => ({ type: "Boolean", value: isEncrypted.value })),
        },
      ],
    });

    uni.showToast({ title: t("uploadSuccess"), icon: "success" });
    closeUpload();
    selectedImages.value = [];
    await loadPhotos();
  } catch (e: any) {
    uni.showToast({ title: e?.message || t("uploadFailed"), icon: "none" });
  } finally {
    uploading.value = false;
  }
};

const viewPhoto = (photo: PhotoItem) => {
  if (photo.encrypted) {
    decryptTarget.value = photo;
    decryptPassword.value = "";
    decryptedPreview.value = "";
    showDecrypt.value = true;
    return;
  }
  uni.previewImage({ urls: [photo.data] });
};

const closeDecrypt = () => {
  showDecrypt.value = false;
  decryptTarget.value = null;
  decryptedPreview.value = "";
  decryptPassword.value = "";
};

const decryptPhoto = async () => {
  if (!decryptTarget.value) return;
  if (!decryptPassword.value) {
    uni.showToast({ title: t("passwordRequired"), icon: "none" });
    return;
  }
  decrypting.value = true;
  try {
    const result = await decryptPayload(decryptTarget.value.data, decryptPassword.value);
    if (!result.startsWith("data:image")) {
      throw new Error(t("invalidPayload"));
    }
    decryptedPreview.value = result;
  } catch (e: any) {
    uni.showToast({ title: e?.message || t("decryptFailed"), icon: "none" });
  } finally {
    decrypting.value = false;
  }
};

const previewDecrypted = () => {
  if (!decryptedPreview.value) return;
  uni.previewImage({ urls: [decryptedPreview.value] });
};

onMounted(() => {
  if (address.value) {
    loadPhotos();
  }
});

watch(address, () => {
  loadPhotos();
});
</script>

<style scoped lang="scss">
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./forever-album-theme.scss";

.album-container {
  padding: 20px;
  min-height: 100%;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chain-warning__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  text-align: center;
}

.chain-warning__title {
  font-weight: 700;
  color: var(--album-error);
}

.chain-warning__desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.header {
  margin-bottom: 4px;
}

.title {
  font-size: 24px;
  font-weight: 800;
  display: block;
  letter-spacing: 0.02em;
}

.subtitle {
  font-size: 12px;
  color: var(--text-secondary);
}

.connect-card__content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.connect-card__title {
  font-size: 14px;
  font-weight: 700;
}

.connect-card__desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.gallery-card {
  padding: 16px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 12px;
}

.photo-item {
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.photo-img {
  width: 100%;
  height: 100%;
}

.photo-locked {
  width: 100%;
  height: 100%;
  background: var(--album-locked-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--album-lock-text);
}

.lock-icon {
  position: absolute;
  top: 6px;
  right: 6px;
  background: var(--album-lock-bg);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 9px;
  color: var(--album-lock-text);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.placeholder {
  border: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  gap: 6px;
}

.plus-icon {
  font-size: 32px;
  color: var(--text-secondary);
  font-weight: 300;
}

.add-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.empty-state {
  margin-top: 14px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.empty-title {
  font-size: 13px;
  font-weight: 700;
}

.empty-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.loading-state {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.helper-note {
  font-size: 11px;
  color: var(--text-muted);
}

.upload-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 10px;
}

.upload-item {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  aspect-ratio: 1 / 1;
}

.upload-img {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed var(--border-color);
  background: transparent;
}

.upload-plus {
  font-size: 22px;
  color: var(--text-secondary);
}

.upload-tip {
  font-size: 10px;
  color: var(--text-muted);
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--album-remove-bg);
  color: var(--album-remove-text);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-meta {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upload-meta__size {
  color: var(--text-muted);
}

.form-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-group.column {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.label {
  font-size: 12px;
  color: var(--text-secondary);
}

.hint {
  font-size: 10px;
  color: var(--text-muted);
}

.decrypt-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.decrypt-btn {
  align-self: flex-end;
}

.decrypt-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.decrypt-img {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}
</style>
