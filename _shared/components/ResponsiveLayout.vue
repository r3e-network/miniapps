<template>
  <view class="responsive-layout" :class="{ 'is-desktop': isDesktop, 'is-mobile': isMobile }">
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";

interface Props {
  desktopBreakpoint?: number;
}

const props = withDefaults(defineProps<Props>(), {
  desktopBreakpoint: 1024,
});

const windowWidth = ref(typeof window !== "undefined" ? window.innerWidth : props.desktopBreakpoint);

const isMobile = computed(() => windowWidth.value < props.desktopBreakpoint);
const isDesktop = computed(() => windowWidth.value >= props.desktopBreakpoint);

const updateWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  if (typeof window !== "undefined") {
    window.addEventListener("resize", updateWidth);
    updateWidth();
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateWidth);
  }
});

// Expose for parent components if needed
defineExpose({
  isMobile,
  isDesktop,
});
</script>

<style lang="scss">
.responsive-layout {
  width: 100%;
  min-height: 100vh;
}

/* Mobile-first responsive styles */
@media screen and (max-width: 768px) {
  .responsive-layout {
    padding: 12px;
  }
}

@media screen and (min-width: 769px) and (max-width: 1023px) {
  .responsive-layout {
    padding: 20px;
  }
}

@media screen and (min-width: 1024px) {
  .responsive-layout {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }
}
</style>
