import { ref, computed, onMounted, onUnmounted, readonly } from "vue";

const DESKTOP_BREAKPOINT = 1024;

const windowWidth = ref(typeof window !== "undefined" ? window.innerWidth : DESKTOP_BREAKPOINT);

export function useResponsive(breakpoint: number = DESKTOP_BREAKPOINT) {
  const isMobile = computed(() => windowWidth.value < breakpoint);
  const isDesktop = computed(() => windowWidth.value >= breakpoint);

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

  return {
    isMobile,
    isDesktop,
    windowWidth: readonly(windowWidth),
  };
}

// Default export for composable
export default useResponsive;
