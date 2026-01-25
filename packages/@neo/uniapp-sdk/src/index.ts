/**
 * Neo UniApp SDK
 *
 * This SDK provides composables for interacting with Neo blockchain
 * through the NeoHub wallet interface in UniApp miniapps.
 *
 * @example
 * ```ts
 * import { useWallet, usePayments, useEvents } from "@neo/uniapp-sdk";
 * import type { WalletSDK } from "@neo/types";
 *
 * const wallet = useWallet() as WalletSDK;
 * const { address, connect, invokeContract } = wallet;
 * ```
 */

export { useWallet } from "./composables/useWallet";
export { usePayments } from "./composables/usePayments";
export { useEvents } from "./composables/useEvents";
