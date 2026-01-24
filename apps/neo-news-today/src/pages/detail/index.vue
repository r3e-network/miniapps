<template>
  <view class="detail-container">
    <AppLayout title="Article Detail" :show-back="true">
      <web-view :src="url" class="webview" />
    </AppLayout>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { AppLayout } from "@shared/components";

const url = ref("");

onLoad((options) => {
  if (options && options.url) {
    url.value = decodeURIComponent(options.url);
  }
});
</script>

<style lang="scss" scoped>
.detail-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.webview {
  flex: 1;
  width: 100%;
  height: 100%;
}
</style>
