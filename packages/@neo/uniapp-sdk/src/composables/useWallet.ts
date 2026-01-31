/**
 * Wallet Composable
 *
 * Provides wallet connection and contract interaction functionality
 * for Neo blockchain miniapps.
 */

import { ref, type Ref } from "vue";
import type {
  ChainType,
  InvokeContractOptions,
  InvokeReadOptions,
  InvokeResult,
  WalletBalanceValue,
} from "@neo/types";

/**
 * Return type for useWallet composable
 * Uses Ref types for reactive state properties
 */
export interface UseWalletReturn {
  /** Current wallet address (reactive) */
  address: Ref<string | null>;
  /** Current chain type (reactive) */
  chainType: Ref<ChainType>;
  /** Chain ID (reactive) */
  chainId: Ref<string | undefined>;
  /** App's required chain ID (reactive) */
  appChainId: Ref<string | undefined>;
  /** Connect wallet */
  connect(): Promise<void>;
  /** Invoke contract method (write) */
  invokeContract(options: InvokeContractOptions): Promise<InvokeResult>;
  /** Read from contract (read-only) */
  invokeRead(options: InvokeReadOptions): Promise<unknown>;
  /** Get balance for a token */
  getBalance(symbol: string): Promise<WalletBalanceValue>;
  /** Get contract address for the current app */
  getContractAddress(): Promise<string | null>;
  /** Switch to the app's required chain */
  switchToAppChain(): Promise<void>;
}

/**
 * Wallet composable for Neo blockchain interactions
 *
 * This composable provides access to wallet functionality including
 * connection management, contract invocations, and chain operations.
 *
 * @returns Wallet SDK interface
 *
 * @example
 * ```ts
 * const { address, connect, invokeContract, invokeRead } = useWallet() as WalletSDK;
 *
 * // Connect wallet
 * await connect();
 *
 * // Invoke contract method
 * const result = await invokeContract({
 *   scriptHash: "0x...",
 *   operation: "transfer",
 *   args: [{ type: "Hash160", value: "recipient" }]
 * });
 * ```
 */
export function useWallet(): UseWalletReturn {
  // Reactive state
  const address: Ref<string | null> = ref(null);
  const chainType: Ref<ChainType> = ref("neo" as ChainType);
  const chainId = ref<string | undefined>(undefined);
  const appChainId = ref<string | undefined>(undefined);

  /**
   * Connect wallet
   * In NeoHub environment, this triggers the wallet connection modal
   */
  const connect = async (): Promise<void> => {
    // NeoHub provides global wallet object
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      await neo.connect();
      address.value = neo.address || null;
      chainType.value = neo.chainType || "neo";
      chainId.value = neo.chainId;
    } else {
      console.warn("[useWallet] NeoHub wallet not available");
    }
  };

  /**
   * Invoke contract method (write operation)
   *
   * @param options - Contract invocation options
   * @returns Transaction result with txid
   */
  const invokeContract = async (
    options: InvokeContractOptions,
  ): Promise<InvokeResult> => {
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      return await neo.invoke(options);
    } else {
      throw new Error("[useWallet] NeoHub wallet not available");
    }
  };

  /**
   * Read from contract (read-only operation)
   *
   * @param options - Contract read options
   * @returns Contract state/result
   */
  const invokeRead = async (options: InvokeReadOptions): Promise<unknown> => {
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      return await neo.invokeRead(options);
    } else {
      throw new Error("[useWallet] NeoHub wallet not available");
    }
  };

  /**
   * Get balance for a token
   *
   * @param symbol - Token symbol (e.g., "GAS", "NEO")
   * @returns Token balance
   */
  const getBalance = async (symbol: string): Promise<WalletBalanceValue> => {
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      return await neo.getBalance(symbol);
    } else {
      throw new Error("[useWallet] NeoHub wallet not available");
    }
  };

  /**
   * Get contract address for the current app
   *
   * @returns Contract address or null
   */
  const getContractAddress = async (): Promise<string | null> => {
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      return neo.getContractAddress?.() || null;
    }
    return null;
  };

  /**
   * Switch to the app's required chain
   */
  const switchToAppChain = async (): Promise<void> => {
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      await neo.switchToAppChain?.();
    }
  };

  // Initialize wallet connection if NeoHub is available
  if (typeof window !== "undefined" && (window as any).neo) {
    const neo = (window as any).neo;
    address.value = neo.address || null;
    chainType.value = neo.chainType || "neo";
    chainId.value = neo.chainId;
    appChainId.value = neo.appChainId;
  }

  return {
    address,
    chainType,
    chainId,
    appChainId,
    connect,
    invokeContract,
    invokeRead,
    getBalance,
    getContractAddress,
    switchToAppChain,
  };
}
