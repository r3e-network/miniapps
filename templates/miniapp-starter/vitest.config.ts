/**
 * Vitest configuration for template miniapp
 * Tests run without loading the full uni-app build pipeline
 */
import { defineConfig } from "vitest/config";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [resolve(__dirname, "../../shared/test-utils/vitest-setup.ts")],
    include: ["**/*.{test,spec}.{ts,js}"],
    exclude: ["node_modules", "dist", "vite.config.ts"],
    deps: {
      interopDefault: true,
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@shared": resolve(__dirname, "../../shared"),
      "@neo/uniapp-sdk": resolve(__dirname, "../../sdk/packages/@neo/uniapp-sdk/src"),
      "@neo/types": resolve(__dirname, "../../sdk/packages/@neo/types/src"),
    },
  },
});
