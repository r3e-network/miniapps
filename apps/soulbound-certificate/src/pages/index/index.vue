<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-soulbound-certificate" :tabs="navTabs" :active-tab="activeTab" @tab-change="onTabChange">
    <view v-if="activeTab === 'templates'" class="tab-content">
      <!-- Chain Warning - Framework Component -->
      <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="mb-4 text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <NeoCard variant="erobo-neo">
        <view class="form-group">
          <NeoInput v-model="form.name" :label="t('templateName')" :placeholder="t('templateNamePlaceholder')" />
          <NeoInput v-model="form.issuerName" :label="t('issuerName')" :placeholder="t('issuerNamePlaceholder')" />
          <NeoInput v-model="form.category" :label="t('category')" :placeholder="t('categoryPlaceholder')" />
          <NeoInput
            v-model="form.maxSupply"
            type="number"
            :label="t('maxSupply')"
            :placeholder="t('maxSupplyPlaceholder')"
          />
          <NeoInput
            v-model="form.description"
            type="textarea"
            :label="t('description')"
            :placeholder="t('descriptionPlaceholder')"
          />

          <NeoButton
            variant="primary"
            size="lg"
            block
            :loading="isCreating"
            :disabled="isCreating"
            @click="createTemplate"
          >
            {{ isCreating ? t("creating") : t("createTemplate") }}
          </NeoButton>
        </view>
      </NeoCard>

      <NeoCard variant="erobo" class="template-list">
        <view class="templates-header">
          <text class="section-title">{{ t("yourTemplates") }}</text>
          <NeoButton size="sm" variant="secondary" :loading="isRefreshing" @click="refreshTemplates">
            {{ t("refresh") }}
          </NeoButton>
        </view>

        <view v-if="!address" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center">
            <text class="text-sm block mb-3">{{ t("walletNotConnected") }}</text>
            <NeoButton size="sm" variant="primary" @click="connectWallet">
              {{ t("connectWallet") }}
            </NeoButton>
          </NeoCard>
        </view>

        <view v-else-if="templates.length === 0" class="empty-state">
          <NeoCard variant="erobo" class="p-6 text-center opacity-70">
            <text class="text-xs">{{ t("emptyTemplates") }}</text>
          </NeoCard>
        </view>

        <view v-else class="template-cards">
          <view v-for="template in templates" :key="`template-${template.id}`" class="template-card">
            <view class="template-card__header">
              <view>
                <text class="template-title">{{ template.name || `#${template.id}` }}</text>
                <text class="template-subtitle">{{ template.issuerName || addressShort(template.issuer) }}</text>
              </view>
              <text :class="['status-pill', template.active ? 'active' : 'inactive']">
                {{ template.active ? t("statusActive") : t("statusInactive") }}
              </text>
            </view>

            <view class="template-meta">
              <text class="meta-label">{{ t("category") }}</text>
              <text class="meta-value">{{ template.category || "--" }}</text>
            </view>

            <view class="template-metrics">
              <view>
                <text class="metric-label">{{ t("issued") }}</text>
                <text class="metric-value">{{ template.issued.toString() }}</text>
              </view>
              <view>
                <text class="metric-label">{{ t("supply") }}</text>
                <text class="metric-value">{{ template.maxSupply.toString() }}</text>
              </view>
            </view>

            <text class="template-desc">{{ template.description || "--" }}</text>

            <view class="template-actions">
              <NeoButton
                size="sm"
                variant="primary"
                :disabled="!template.active || template.issued >= template.maxSupply"
                @click="openIssueModal(template)"
              >
                {{ template.issued >= template.maxSupply ? t("soldOut") : t("issueCertificate") }}
              </NeoButton>
              <NeoButton
                size="sm"
                variant="secondary"
                :loading="togglingId === template.id"
                @click="toggleTemplate(template)"
              >
                {{ template.active ? t("deactivate") : t("activate") }}
              </NeoButton>
            </view>
          </view>
        </view>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'certificates'" class="tab-content">
      <view class="templates-header">
        <text class="section-title">{{ t("certificatesTab") }}</text>
        <NeoButton size="sm" variant="secondary" :loading="isRefreshingCertificates" @click="refreshCertificates">
          {{ t("refresh") }}
        </NeoButton>
      </view>

      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <view v-if="!address" class="empty-state">
        <NeoCard variant="erobo" class="p-6 text-center">
          <text class="text-sm block mb-3">{{ t("walletNotConnected") }}</text>
          <NeoButton size="sm" variant="primary" @click="connectWallet">
            {{ t("connectWallet") }}
          </NeoButton>
        </NeoCard>
      </view>

      <view v-else-if="certificates.length === 0" class="empty-state">
        <NeoCard variant="erobo" class="p-6 text-center opacity-70">
          <text class="text-xs">{{ t("emptyCertificates") }}</text>
        </NeoCard>
      </view>

      <view v-else class="certificate-grid">
        <view v-for="cert in certificates" :key="`cert-${cert.tokenId}`" class="certificate-card">
          <view class="template-card__header">
            <view>
              <text class="template-title">{{ cert.templateName || `#${cert.templateId}` }}</text>
              <text class="template-subtitle">{{ cert.issuerName || addressShort(cert.owner) }}</text>
            </view>
            <text :class="['status-pill', cert.revoked ? 'revoked' : 'active']">
              {{ cert.revoked ? t("certificateRevoked") : t("certificateValid") }}
            </text>
          </view>

          <view class="certificate-body">
            <view class="certificate-qr" v-if="certQrs[cert.tokenId]">
              <image :src="certQrs[cert.tokenId]" class="certificate-qr__img" mode="aspectFit" />
            </view>
            <view class="certificate-details">
              <text class="detail-row">{{ t("recipientName") }}: {{ cert.recipientName || "--" }}</text>
              <text class="detail-row">{{ t("achievement") }}: {{ cert.achievement || "--" }}</text>
              <text class="detail-row">{{ t("tokenId") }}: {{ cert.tokenId }}</text>
              <NeoButton size="sm" variant="secondary" class="copy-btn" @click="copyTokenId(cert.tokenId)">
                {{ t("copyTokenId") }}
              </NeoButton>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'verify'" class="tab-content">
      <NeoCard v-if="status" :variant="status.type === 'error' ? 'danger' : 'success'" class="text-center">
        <text class="font-bold">{{ status.msg }}</text>
      </NeoCard>

      <NeoCard variant="erobo-neo">
        <view class="form-group">
          <NeoInput v-model="verify.tokenId" :label="t('verifyTokenId')" :placeholder="t('verifyTokenIdPlaceholder')" />
          <view class="verify-actions">
            <NeoButton size="sm" variant="secondary" :loading="isLookingUp" @click="lookupCertificate">
              {{ isLookingUp ? t("lookingUp") : t("lookup") }}
            </NeoButton>
            <NeoButton size="sm" variant="primary" :loading="isRevoking" @click="revokeCertificate">
              {{ isRevoking ? t("revoking") : t("revoke") }}
            </NeoButton>
          </view>
        </view>
      </NeoCard>

      <NeoCard v-if="lookup" variant="erobo" class="lookup-card">
        <view class="template-card__header">
          <view>
            <text class="template-title">{{ lookup.templateName || `#${lookup.templateId}` }}</text>
            <text class="template-subtitle">{{ lookup.issuerName || addressShort(lookup.owner) }}</text>
          </view>
          <text :class="['status-pill', lookup.revoked ? 'revoked' : 'active']">
            {{ lookup.revoked ? t("certificateRevoked") : t("certificateValid") }}
          </text>
        </view>
        <text class="detail-row">{{ t("recipientName") }}: {{ lookup.recipientName || "--" }}</text>
        <text class="detail-row">{{ t("achievement") }}: {{ lookup.achievement || "--" }}</text>
        <text class="detail-row">{{ t("tokenId") }}: {{ lookup.tokenId }}</text>
      </NeoCard>
    </view>

    <view v-if="activeTab === 'docs'" class="tab-content scrollable">
      <NeoDoc
        :title="t('title')"
        :subtitle="t('docSubtitle')"
        :description="t('docDescription')"
        :steps="[t('step1'), t('step2'), t('step3'), t('step4')]"
        :features="[
          { name: t('feature1Name'), desc: t('feature1Desc') },
          { name: t('feature2Name'), desc: t('feature2Desc') },
          { name: t('feature3Name'), desc: t('feature3Desc') },
        ]"
      />
    </view>
  </ResponsiveLayout>

  <NeoModal :visible="issueModalOpen" :title="t('issueTitle')" :closeable="true" @close="closeIssueModal">
    <view class="form-group">
      <NeoInput
        v-model="issueForm.recipient"
        :label="t('issueRecipient')"
        :placeholder="t('issueRecipientPlaceholder')"
      />
      <NeoInput
        v-model="issueForm.recipientName"
        :label="t('recipientName')"
        :placeholder="t('recipientNamePlaceholder')"
      />
      <NeoInput v-model="issueForm.achievement" :label="t('achievement')" :placeholder="t('achievementPlaceholder')" />
      <NeoInput v-model="issueForm.memo" :label="t('memo')" :placeholder="t('memoPlaceholder')" />
    </view>

    <template #footer>
      <NeoButton size="sm" variant="secondary" @click="closeIssueModal">
        {{ t("cancel") }}
      </NeoButton>
      <NeoButton size="sm" variant="primary" :loading="isIssuing" @click="issueCertificate">
        {{ isIssuing ? t("issuing") : t("issue") }}
      </NeoButton>
    </template>
  </NeoModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import QRCode from "qrcode";
import { useWallet } from "@neo/uniapp-sdk";
import type { WalletSDK } from "@neo/types";
import { useI18n } from "@/composables/useI18n";
import { ResponsiveLayout, NeoCard, NeoButton, NeoInput, NeoModal, NeoDoc, ChainWarning } from "@shared/components";
import type { NavTab } from "@shared/components/NavBar.vue";
import { requireNeoChain } from "@shared/utils/chain";
import { addressToScriptHash, parseInvokeResult } from "@shared/utils/neo";

const { t } = useI18n();
const { address, connect, invokeContract, invokeRead, chainType, getContractAddress } = useWallet() as WalletSDK;

const activeTab = ref("templates");
const navTabs = computed<NavTab[]>(() => [
  { id: "templates", icon: "file", label: t("templatesTab") },
  { id: "certificates", icon: "star", label: t("certificatesTab") },
  { id: "verify", icon: "check-circle", label: t("verifyTab") },
  { id: "docs", icon: "book", label: t("docs") },
]);

const form = reactive({
  name: "",
  issuerName: "",
  category: "",
  maxSupply: "100",
  description: "",
});

const issueForm = reactive({
  templateId: "",
  recipient: "",
  recipientName: "",
  achievement: "",
  memo: "",
});

const verify = reactive({
  tokenId: "",
});

const status = ref<{ msg: string; type: "success" | "error" } | null>(null);
const isCreating = ref(false);
const isRefreshing = ref(false);
const isRefreshingCertificates = ref(false);
const isIssuing = ref(false);
const isLookingUp = ref(false);
const isRevoking = ref(false);
const issueModalOpen = ref(false);
const togglingId = ref<string | null>(null);
const contractAddress = ref<string | null>(null);

interface TemplateItem {
  id: string;
  issuer: string;
  name: string;
  issuerName: string;
  category: string;
  maxSupply: bigint;
  issued: bigint;
  description: string;
  active: boolean;
}

interface CertificateItem {
  tokenId: string;
  templateId: string;
  owner: string;
  templateName: string;
  issuerName: string;
  category: string;
  description: string;
  recipientName: string;
  achievement: string;
  memo: string;
  issuedTime: number;
  revoked: boolean;
  revokedTime: number;
}

const templates = ref<TemplateItem[]>([]);
const certificates = ref<CertificateItem[]>([]);
const certQrs = reactive<Record<string, string>>({});
const lookup = ref<CertificateItem | null>(null);

const ensureContractAddress = async () => {
  if (!requireNeoChain(chainType, t)) {
    throw new Error(t("wrongChain"));
  }
  if (!contractAddress.value) {
    contractAddress.value = await getContractAddress();
  }
  if (!contractAddress.value) {
    throw new Error(t("contractMissing"));
  }
  return contractAddress.value;
};

const setStatus = (msg: string, type: "success" | "error") => {
  status.value = { msg, type };
  setTimeout(() => {
    if (status.value?.msg === msg) status.value = null;
  }, 4000);
};

const parseBigInt = (value: unknown) => {
  try {
    return BigInt(String(value ?? "0"));
  } catch {
    return 0n;
  }
};

const parseBool = (value: unknown) => value === true || value === "true" || value === 1 || value === "1";

const addressShort = (value: string) => {
  const trimmed = String(value || "");
  if (!trimmed) return "--";
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
};

const encodeTokenId = (tokenId: string) => {
  try {
    const bytes = new TextEncoder().encode(tokenId);
    return btoa(String.fromCharCode(...bytes));
  } catch {
    return tokenId;
  }
};

const parseTemplate = (raw: any, id: string): TemplateItem | null => {
  if (!raw || typeof raw !== "object") return null;
  return {
    id,
    issuer: String(raw.issuer || ""),
    name: String(raw.name || ""),
    issuerName: String(raw.issuerName || ""),
    category: String(raw.category || ""),
    maxSupply: parseBigInt(raw.maxSupply),
    issued: parseBigInt(raw.issued),
    description: String(raw.description || ""),
    active: parseBool(raw.active),
  };
};

const parseCertificate = (raw: any, tokenId: string): CertificateItem | null => {
  if (!raw || typeof raw !== "object") return null;
  return {
    tokenId,
    templateId: String(raw.templateId || ""),
    owner: String(raw.owner || ""),
    templateName: String(raw.templateName || ""),
    issuerName: String(raw.issuerName || ""),
    category: String(raw.category || ""),
    description: String(raw.description || ""),
    recipientName: String(raw.recipientName || ""),
    achievement: String(raw.achievement || ""),
    memo: String(raw.memo || ""),
    issuedTime: Number.parseInt(String(raw.issuedTime || "0"), 10) || 0,
    revoked: parseBool(raw.revoked),
    revokedTime: Number.parseInt(String(raw.revokedTime || "0"), 10) || 0,
  };
};

const fetchTemplateIds = async (issuerAddress: string) => {
  const contract = await ensureContractAddress();
  const result = await invokeRead({
    contractAddress: contract,
      operation: "GetIssuerTemplates",
    args: [
      { type: "Hash160", value: issuerAddress },
      { type: "Integer", value: "0" },
      { type: "Integer", value: "20" },
    ],
  });
  const parsed = parseInvokeResult(result);
  if (!Array.isArray(parsed)) return [] as string[];
  return parsed
    .map((value) => String(value || ""))
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => String(value));
};

const fetchTemplateDetails = async (templateId: string) => {
  const contract = await ensureContractAddress();
  const details = await invokeRead({
    contractAddress: contract,
      operation: "GetTemplateDetails",
    args: [{ type: "Integer", value: templateId }],
  });
  const parsed = parseInvokeResult(details) as any;
  return parseTemplate(parsed, templateId);
};

const refreshTemplates = async () => {
  if (!address.value) return;
  if (isRefreshing.value) return;
  try {
    isRefreshing.value = true;
    const ids = await fetchTemplateIds(address.value);
    const details = await Promise.all(ids.map(fetchTemplateDetails));
    templates.value = details.filter(Boolean) as TemplateItem[];
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRefreshing.value = false;
  }
};

const refreshCertificates = async () => {
  if (!address.value) return;
  if (isRefreshingCertificates.value) return;
  try {
    isRefreshingCertificates.value = true;
    const contract = await ensureContractAddress();
    const tokenResult = await invokeRead({
      contractAddress: contract,
      operation: "TokensOf",
      args: [{ type: "Hash160", value: address.value }],
    });
    const parsed = parseInvokeResult(tokenResult);
    if (!Array.isArray(parsed)) {
      certificates.value = [];
      return;
    }
    const tokenIds = parsed.map((value) => String(value || "")).filter(Boolean);

    const details = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const detailResult = await invokeRead({
          contractAddress: contract,
          operation: "GetCertificateDetails",
          args: [{ type: "ByteArray", value: encodeTokenId(tokenId) }],
        });
        const detailParsed = parseInvokeResult(detailResult) as any;
        return parseCertificate(detailParsed, tokenId);
      }),
    );

    certificates.value = details.filter(Boolean) as CertificateItem[];
    await Promise.all(
      certificates.value.map(async (cert) => {
        if (!certQrs[cert.tokenId]) {
          try {
            certQrs[cert.tokenId] = await QRCode.toDataURL(cert.tokenId, { margin: 1 });
          } catch {}
        }
      }),
    );
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRefreshingCertificates.value = false;
  }
};

const connectWallet = async () => {
  try {
    await connect();
    if (address.value) {
      await refreshTemplates();
      await refreshCertificates();
    }
  } catch (e: any) {
    setStatus(e.message || t("walletNotConnected"), "error");
  }
};

const createTemplate = async () => {
  if (isCreating.value) return;
  if (!requireNeoChain(chainType, t)) return;

  const name = form.name.trim();
  if (!name) {
    setStatus(t("nameRequired"), "error");
    return;
  }

  const maxSupply = parseBigInt(form.maxSupply);
  if (maxSupply <= 0n) {
    setStatus(t("invalidSupply"), "error");
    return;
  }

  try {
    isCreating.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));

    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "CreateTemplate",
      args: [
        { type: "Hash160", value: address.value },
        { type: "String", value: name },
        { type: "String", value: form.issuerName.trim() },
        { type: "String", value: form.category.trim() },
        { type: "Integer", value: maxSupply.toString() },
        { type: "String", value: form.description.trim() },
      ],
    });

    setStatus(t("templateCreated"), "success");
    form.name = "";
    form.issuerName = "";
    form.category = "";
    form.maxSupply = "100";
    form.description = "";

    await refreshTemplates();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isCreating.value = false;
  }
};

const openIssueModal = (template: TemplateItem) => {
  issueForm.templateId = template.id;
  issueForm.recipient = "";
  issueForm.recipientName = "";
  issueForm.achievement = "";
  issueForm.memo = "";
  issueModalOpen.value = true;
};

const closeIssueModal = () => {
  issueModalOpen.value = false;
};

const issueCertificate = async () => {
  if (isIssuing.value) return;
  if (!requireNeoChain(chainType, t)) return;

  const recipient = issueForm.recipient.trim();
  if (!recipient || !addressToScriptHash(recipient)) {
    setStatus(t("invalidRecipient"), "error");
    return;
  }

  try {
    isIssuing.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();

    await invokeContract({
      scriptHash: contract,
      operation: "IssueCertificate",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Hash160", value: recipient },
        { type: "Integer", value: issueForm.templateId },
        { type: "String", value: issueForm.recipientName.trim() },
        { type: "String", value: issueForm.achievement.trim() },
        { type: "String", value: issueForm.memo.trim() },
      ],
    });

    setStatus(t("issuedSuccess"), "success");
    issueModalOpen.value = false;
    await refreshTemplates();
    await refreshCertificates();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isIssuing.value = false;
  }
};

const toggleTemplate = async (template: TemplateItem) => {
  if (togglingId.value) return;
  if (!requireNeoChain(chainType, t)) return;
  try {
    togglingId.value = template.id;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "SetTemplateActive",
      args: [
        { type: "Hash160", value: address.value },
        { type: "Integer", value: template.id },
        { type: "Boolean", value: !template.active },
      ],
    });
    await refreshTemplates();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    togglingId.value = null;
  }
};

const lookupCertificate = async () => {
  if (isLookingUp.value) return;
  if (!requireNeoChain(chainType, t)) return;
  const tokenId = verify.tokenId.trim();
  if (!tokenId) {
    setStatus(t("invalidTokenId"), "error");
    return;
  }
  try {
    isLookingUp.value = true;
    const contract = await ensureContractAddress();
    const detailResult = await invokeRead({
      contractAddress: contract,
      operation: "GetCertificateDetails",
      args: [{ type: "ByteArray", value: encodeTokenId(tokenId) }],
    });
    const detailParsed = parseInvokeResult(detailResult) as any;
    const parsed = parseCertificate(detailParsed, tokenId);
    if (!parsed) {
      setStatus(t("certificateNotFound"), "error");
      lookup.value = null;
      return;
    }
    lookup.value = parsed;
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isLookingUp.value = false;
  }
};

const revokeCertificate = async () => {
  if (isRevoking.value) return;
  if (!requireNeoChain(chainType, t)) return;
  const tokenId = verify.tokenId.trim();
  if (!tokenId) {
    setStatus(t("invalidTokenId"), "error");
    return;
  }
  try {
    isRevoking.value = true;
    if (!address.value) await connect();
    if (!address.value) throw new Error(t("walletNotConnected"));
    const contract = await ensureContractAddress();
    await invokeContract({
      scriptHash: contract,
      operation: "RevokeCertificate",
      args: [
        { type: "Hash160", value: address.value },
        { type: "ByteArray", value: encodeTokenId(tokenId) },
      ],
    });
    setStatus(t("revokeSuccess"), "success");
    await lookupCertificate();
  } catch (e: any) {
    setStatus(e.message || t("contractMissing"), "error");
  } finally {
    isRevoking.value = false;
  }
};

const copyTokenId = (tokenId: string) => {
  // @ts-ignore
  uni.setClipboardData({
    data: tokenId,
    success: () => {
      setStatus(t("copied"), "success");
    },
  });
};

const onTabChange = async (tab: string) => {
  activeTab.value = tab;
  if (tab === "templates") {
    await refreshTemplates();
  }
  if (tab === "certificates") {
    await refreshCertificates();
  }
};

onMounted(async () => {
  await connect();
  if (address.value) {
    await refreshTemplates();
    await refreshCertificates();
  }
});

watch(address, async (newAddr) => {
  if (newAddr) {
    await refreshTemplates();
    await refreshCertificates();
  } else {
    templates.value = [];
    certificates.value = [];
    lookup.value = null;
  }
});
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./soulbound-certificate-theme.scss";

:global(page) {
  background: linear-gradient(135deg, var(--soul-bg-start) 0%, var(--soul-bg-end) 100%);
  color: var(--soul-text);
}

.tab-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.templates-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-cards,
.certificate-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.template-card,
.certificate-card,
.lookup-card {
  background: var(--soul-card-bg);
  border: 1px solid var(--soul-card-border);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.template-title {
  font-size: 15px;
  font-weight: 700;
}

.template-subtitle {
  display: block;
  font-size: 11px;
  color: var(--soul-muted);
  margin-top: 2px;
}

.template-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soul-muted);
}

.meta-value {
  font-size: 12px;
}

.template-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.metric-label {
  font-size: 10px;
  color: var(--soul-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--soul-accent-strong);
}

.template-desc {
  font-size: 12px;
  color: var(--soul-muted);
}

.template-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.certificate-body {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 14px;
  align-items: center;
}

.certificate-qr {
  width: 110px;
  height: 110px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.certificate-qr__img {
  width: 100px;
  height: 100px;
}

.certificate-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  font-size: 12px;
  color: var(--soul-muted);
}

.copy-btn {
  align-self: flex-start;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(16, 185, 129, 0.2);
  color: var(--soul-accent);
}

.status-pill.revoked {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.status-pill.inactive {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.verify-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
