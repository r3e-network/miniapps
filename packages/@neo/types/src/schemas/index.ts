/**
 * Zod schemas for runtime validation
 *
 * These schemas provide type-safe runtime validation for API responses
 * and external data.
 */
import { z } from "zod";

// Wallet schemas
export const WalletStateSchema = z.object({
  connected: z.boolean(),
  address: z.string().nullable(),
  publicKey: z.string().nullable(),
  network: z.enum(["MainNet", "TestNet", "N3TestNet", "N3MainNet"]),
});

export const WalletBalanceSchema = z.object({
  asset: z.string(),
  symbol: z.string(),
  amount: z.string(),
  decimals: z.number(),
});

export const TransactionResultSchema = z.object({
  txid: z.string(),
  success: z.boolean(),
  blockHeight: z.number().optional(),
  gasConsumed: z.string().optional(),
});

// Contract schemas
export const ContractArgSchema = z.object({
  type: z.enum(["String", "Integer", "Boolean", "Hash160", "Hash256", "ByteArray", "Array"]),
  value: z.unknown(),
});

export const StackItemSchema = z.object({
  type: z.enum([
    "Integer",
    "Boolean",
    "ByteString",
    "Buffer",
    "Array",
    "Map",
    "Struct",
    "Pointer",
    "InteropInterface",
    "Any",
  ]),
  value: z.unknown(),
});

export const ContractInvokeResultSchema = z.object({
  state: z.enum(["HALT", "FAULT"]),
  gasConsumed: z.string(),
  stack: z.array(StackItemSchema),
  exception: z.string().optional(),
});

// Infer types from schemas
export type WalletStateFromSchema = z.infer<typeof WalletStateSchema>;
export type WalletBalanceFromSchema = z.infer<typeof WalletBalanceSchema>;
export type TransactionResultFromSchema = z.infer<typeof TransactionResultSchema>;
export type ContractInvokeResultFromSchema = z.infer<typeof ContractInvokeResultSchema>;
