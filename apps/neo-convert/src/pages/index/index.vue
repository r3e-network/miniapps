<template>
  <ResponsiveLayout :desktop-breakpoint="1024" class="theme-neo-convert" :tabs="tabs" :active-tab="activeTab" @tab-change="activeTab = $event">
    <!-- Chain Warning - Framework Component -->
    <ChainWarning :title="t('wrongChain')" :message="t('wrongChainMessage')" :button-text="t('switchToNeo')" />
    <view class="content-area">
      <view class="hero">
        <ScrollReveal animation="fade-down" :duration="800">
          <text class="hero-icon">🛠️</text>
          <text class="hero-title">{{ t("heroTitle") }}</text>
          <text class="hero-subtitle">{{ t("heroSubtitle") }}</text>
        </ScrollReveal>
      </view>

      <ScrollReveal animation="fade-up" :delay="200" v-if="activeTab === 'generate'" key="gen">
        <AccountGenerator />
      </ScrollReveal>

      <ScrollReveal animation="fade-up" :delay="200" v-if="activeTab === 'convert'" key="conv">
        <ConverterTool />
      </ScrollReveal>
    </view>
  </ResponsiveLayout>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ResponsiveLayout, ScrollReveal, ChainWarning } from "@shared/components";
import AccountGenerator from "./components/AccountGenerator.vue";
import ConverterTool from "./components/ConverterTool.vue";
import { useI18n } from "@/composables/useI18n";

const { t } = useI18n();
const activeTab = ref("generate");

const tabs = computed(() => [
  { id: "generate", label: t("tabGenerate"), icon: "wallet" },
  { id: "convert", label: t("tabConvert"), icon: "sync" },
]);
</script>

<style lang="scss" scoped>
@use "@shared/styles/tokens.scss" as *;
@use "@shared/styles/variables.scss";
@import "./neo-convert-theme.scss";

.content-area {
  padding: 16px;
  min-height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.hero {
  text-align: center;
  margin: 30px 0 40px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 24px;

  .hero-icon {
    font-size: 40px;
    display: block;
    margin-bottom: 16px;
  }

  .hero-title {
    display: block;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: var(--convert-hero-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 12px;
  }

  .hero-subtitle {
    display: block;
    font-size: 15px;
    color: var(--text-secondary);
    max-width: 80%;
    margin: 0 auto;
    line-height: 1.5;
  }
}
</style>
