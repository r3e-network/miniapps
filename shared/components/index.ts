/**
 * Shared Components Index
 *
 * Centralized exports for all shared components used across miniapps.
 *
 * @example
 * ```ts
 * // Import all components from a single path
 * import {
 *   AppLayout,
 *   NeoCard,
 *   NeoButton,
 *   NeoDoc,
 *   ChainWarning
 * } from "@shared/components";
 * ```
 */

// ============================================================================
// React Components (Legacy - for reference only)
// ============================================================================
export { Card } from "./Card";
export { StatBox } from "./StatBox";
export { StatsGrid } from "./StatsGrid";
export { Button } from "./Button";
export { Input } from "./Input";

// ============================================================================
// Vue Components - Layout
// ============================================================================
export { default as AppLayout } from "./AppLayout.vue";
export { default as MiniAppLayout } from "./MiniAppLayout.vue";
export { default as DesktopLayout } from "./DesktopLayout.vue";
export { default as ResponsiveLayout } from "./ResponsiveLayout.vue";

// ============================================================================
// Vue Components - UI Elements
// ============================================================================
export { default as AppIcon } from "./AppIcon.vue";
export { default as NeoCard } from "./NeoCard.vue";
export { default as NeoButton } from "./NeoButton.vue";
export { default as NeoInput } from "./NeoInput.vue";
export { default as NeoModal } from "./NeoModal.vue";
export { default as NeoDoc } from "./NeoDoc.vue";
export { default as NeoStats } from "./NeoStats.vue";
export { default as GradientCard } from "./GradientCard.vue";
export { default as ScrollReveal } from "./ScrollReveal.vue";
export { default as BlurGlow } from "./BlurGlow.vue";

// ============================================================================
// Vue Components - Navigation
// ============================================================================
export { default as NavBar } from "./NavBar.vue";
export { default as TopNavBar } from "./TopNavBar.vue";

// ============================================================================
// Vue Components - Specialized
// ============================================================================
export { default as WalletPrompt } from "./WalletPrompt.vue";
export { default as ChainWarning } from "./ChainWarning.vue";
export { default as Fireworks } from "./Fireworks.vue";

// ============================================================================
// Type Exports
// ============================================================================
export type { NavTab } from "./NavBar.vue";
export type { CardVariant } from "./NeoCard.vue";
