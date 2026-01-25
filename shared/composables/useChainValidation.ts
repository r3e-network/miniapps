import { computed } from "vue";
import { useWallet } from "@neo/uniapp-sdk";

/**
 * Chain validation composable for miniapps
 *
 * Provides a standardized way to handle chain type validation
 * and display warnings when the wrong chain is connected.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useChainValidation } from "@shared/composables/useChainValidation";
 *
 * const { showWarning, switchToAppChain } = useChainValidation();
 * </script>
 *
 * <template>
 *   <ChainWarning v-if="showWarning" @switch="switchToAppChain" />
 * </template>
 * ```
 */
export function useChainValidation() {
  const { chainType, switchToAppChain: _switchToAppChain } = useWallet();

  /**
   * Whether to show the wrong chain warning
   * Returns true when connected to EVM chain instead of Neo N3
   */
  const showWarning = computed(() => {
    const resolvedChain =
      typeof chainType.value === "string"
        ? chainType.value
        : ((chainType.value as { value?: string } | null)?.value ?? "");
    return resolvedChain === "evm";
  });

  /**
   * Switch to the app's required chain (Neo N3)
   */
  const switchToAppChain = async () => {
    try {
      await _switchToAppChain();
    } catch (error) {
      console.error("[useChainValidation] Failed to switch chain:", error);
      throw error;
    }
  };

  return {
    showWarning,
    switchToAppChain,
  };
}

/**
 * Type guard for checking if current chain is EVM
 *
 * @example
 * ```ts
 * if (isEvmChain(chainType)) {
 *   // Handle EVM chain case
 * }
 * ```
 */
export function isEvmChain(chainType: unknown): boolean {
  if (typeof chainType === "string") return chainType === "evm";
  const value = (chainType as { value?: unknown } | null)?.value;
  return typeof value === "string" ? value === "evm" : false;
}

/**
 * Check if Neo N3 chain is connected
 * Returns true when NOT on EVM chain
 *
 * @example
 * ```ts
 * if (requireNeoChain(chainType)) {
 *   // Safe to proceed with Neo operations
 * }
 * ```
 */
export function requireNeoChain(chainType: unknown): boolean {
  return !isEvmChain(chainType);
}
