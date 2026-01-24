<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { initTheme, listenForThemeChanges } from "@shared/utils/theme";
import { useI18n } from "@/composables/useI18n";

const { setLocale } = useI18n();

let cleanupTheme: (() => void) | undefined;
let languageHandler: ((event: MessageEvent) => void) | undefined;

onLaunch(() => {
  console.log("App Launch");
});

onShow(() => {
  // Listen for language changes from host
  languageHandler = (event: MessageEvent) => {
    if (event.data?.type === "languageChange" && event.data?.locale) {
      setLocale(event.data.locale);
    }
  };
  window.addEventListener("message", languageHandler);
});

onHide(() => {
  console.log("App Hide");
  if (languageHandler) {
    window.removeEventListener("message", languageHandler);
    languageHandler = undefined;
  }
});

onMounted(() => {
  initTheme();
  cleanupTheme = listenForThemeChanges();
});

onUnmounted(() => {
  cleanupTheme?.();
  if (languageHandler) {
    window.removeEventListener("message", languageHandler);
    languageHandler = undefined;
  }
});
</script>

<style lang="scss">
@use "@shared/styles/variables.scss" as *;

page {
  background: var(--bg-primary, #111);
  color: var(--text-primary, #fff);
  height: 100%;
}
</style>
