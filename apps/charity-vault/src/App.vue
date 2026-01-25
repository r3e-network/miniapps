<template>
  <view class="app-container">
    <router-view />
  </view>
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  console.log("Charity Vault App Launch");
});

onShow(() => {
  console.log("Charity Vault App Show");
});

onHide(() => {
  console.log("Charity Vault App Hide");
});
</script>

<style lang="scss">
@import "@shared/styles/tokens.scss";

page {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.app-container {
  width: 100%;
  height: 100vh;
}
</style>
