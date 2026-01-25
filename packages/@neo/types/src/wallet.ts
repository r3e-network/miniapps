/**
 * Wallet-related types for Neo MiniApp SDK
 */

/** Supported chain types */
export type ChainType = "neo" | "evm" | unknown;

/** Wallet connection state */
export interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  network: "MainNet" | "TestNet" | "N3TestNet" | "N3MainNet";
}

/** Wallet balance - can be string, number, or object */
export type WalletBalanceValue = string | number | { amount: string | number; symbol: string };

/** Wallet balance */
export interface WalletBalance {
  asset: string;
  symbol: string;
  amount: string;
  decimals: number;
}

/** Transaction result */
export interface TransactionResult {
  txid: string;
  success: boolean;
  blockHeight?: number;
  gasConsumed?: string;
}

/** Signing request */
export interface SigningRequest {
  message: string;
  type: "message" | "transaction";
}

/** Signing result */
export interface SigningResult {
  signature: string;
  publicKey: string;
}

/** Contract argument types for Neo VM */
export type ContractArgumentType =
  | "ByteArray"
  | "Integer"
  | "Boolean"
  | "Hash160"
  | "Hash256"
  | "String"
  | "Array"
  | "Map"
  | "InteropInterface";

/** Contract invocation argument */
export interface ContractArgument {
  type: ContractArgumentType;
  value: string | number | boolean | ContractArgument[];
}

/** Contract invocation options */
export interface InvokeContractOptions {
  scriptHash: string;
  operation: string;
  args?: ContractArgument[];
}

/** Contract read options */
export interface InvokeReadOptions {
  contractAddress: string;
  operation: string;
  args?: ContractArgument[];
  scriptHash?: string;
}

/** Invoke result from contract execution */
export interface InvokeResult {
  txid?: string;
  txHash?: string;
  script?: string;
  state?: string;
  gasConsumed?: string;
  stack?: unknown;
  exception?: string;
}

/** Event state item from events API */
export interface EventStateItem {
  type?: string;
  value?: unknown;
}

/** Event from the events API */
export interface AppEvent {
  event_id: string;
  app_id: string;
  event_name: string;
  tx_hash: string;
  timestamp: string;
  created_at: string | number;
  state: EventStateItem[] | unknown;
  last_id?: string;
  has_more?: boolean;
}

/** Events list response */
export interface EventsListResult {
  events: AppEvent[];
  has_more?: boolean;
  last_id?: string;
}

/** Events list options */
export interface EventsListOptions {
  app_id: string;
  event_name?: string;
  limit?: number;
  after_id?: string;
}

/**
 * Wallet SDK interface
 *
 * This interface defines the complete contract for useWallet() from @neo/uniapp-sdk
 * Use this type instead of `as any` assertions.
 *
 * @example
 * ```ts
 * import { useWallet } from "@neo/uniapp-sdk";
 * import type { WalletSDK } from "@neo/types";
 *
 * const wallet = useWallet() as WalletSDK;
 * // OR with type assertion on destructuring
 * const { address, connect, invokeContract } = useWallet() as Partial<WalletSDK>;
 * ```
 */
export interface WalletSDK {
  /** Current wallet address */
  address: string | null;

  /** Current chain type */
  chainType: ChainType;

  /** Chain ID */
  chainId?: string;

  /** App's required chain ID */
  appChainId?: string;

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
 * Events SDK interface
 */
export interface EventsSDK {
  /** List events with pagination */
  list(options: EventsListOptions): Promise<EventsListResult>;
}

/**
 * Payments SDK interface
 */
export interface PaymentsSDK {
  /** Pay GAS tokens */
  payGAS(amount: string, memo?: string): Promise<{ receipt_id?: string }>;
}

/** Type guard to check if value is a WalletSDK */
export function isWalletSDK(value: unknown): value is WalletSDK {
  return (
    typeof value === "object" &&
    value !== null &&
    "address" in value &&
    "chainType" in value &&
    "connect" in value &&
    "invokeContract" in value
  );
}

/** Type guard for InvokeResult */
export function isInvokeResult(value: unknown): value is InvokeResult {
  return typeof value === "object" && value !== null && ("txid" in value || "txHash" in value);
}

/** Type guard for AppEvent */
export function isAppEvent(value: unknown): value is AppEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "event_id" in value &&
    "app_id" in value &&
    "tx_hash" in value &&
    "state" in value
  );
}
