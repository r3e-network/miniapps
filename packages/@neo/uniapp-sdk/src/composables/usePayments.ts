/**
 * Payments Composable
 *
 * Provides payment functionality for GAS tokens in Neo miniapps.
 */

import type { PaymentsSDK } from "@neo/types";

/**
 * Payments composable for GAS token operations
 *
 * This composable provides access to payment functionality including
 * paying GAS tokens for contract operations.
 *
 * @returns Payments SDK interface
 *
 * @example
 * ```ts
 * const { payGAS } = usePayments();
 *
 * // Pay 1 GAS with memo
 * const result = await payGAS("1", "Payment for service");
 * console.log("Receipt ID:", result.receipt_id);
 * ```
 */
export function usePayments(): Partial<PaymentsSDK> {
  /**
   * Pay GAS tokens
   *
   * @param amount - Amount of GAS to pay (as string to preserve precision)
   * @param memo - Optional memo/note for the payment
   * @returns Payment result with receipt ID
   */
  const payGAS = async (amount: string, memo?: string): Promise<{ receipt_id?: string }> => {
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      return await neo.payGAS(amount, memo);
    } else {
      throw new Error("[usePayments] NeoHub wallet not available");
    }
  };

  return {
    payGAS,
  };
}
