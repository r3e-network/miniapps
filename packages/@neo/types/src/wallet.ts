/**
 * Wallet-related types for Neo MiniApp SDK
 */

/** Wallet connection state */
export interface WalletState {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  network: "MainNet" | "TestNet" | "N3TestNet" | "N3MainNet";
}

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
