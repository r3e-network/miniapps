/**
 * Page State Composable
 *
 * This is a placeholder for app-specific page state management.
 * You can extend the base usePageState composable with app-specific logic.
 *
 * @example
 * ```ts
 * import { usePageState as useBasePageState } from "@shared/composables";
 *
 * export function usePageState(defaultTab = "main") {
 *   const base = useBasePageState(defaultTab);
 *
 *   // Add app-specific state
 *   const customState = ref(null);
 *
 *   return {
 *     ...base,
 *     customState,
 *   };
 * }
 * ```
 */

import { usePageState as useBasePageState } from "@shared/composables";

export function usePageState(defaultTab = "main") {
  const base = useBasePageState({ defaultTab });

  // Add your app-specific state and methods here

  return {
    ...base,
  };
}
