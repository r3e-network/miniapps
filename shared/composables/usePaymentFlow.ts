/**
 * Payment Flow Composable
 *
 * Standardizes the payment flow process:
 * 1. Check wallet connection
 * 2. Pay GAS (if needed)
 * 3. Get receipt ID
 * 4. Invoke contract operation
 * 5. Wait for event confirmation
 *
 * @example
 * ```ts
 * const { processPayment, waitForReceipt } = usePaymentFlow(APP_ID);
 *
 * // Execute payment flow
 * const { receiptId, invoke } = await processPayment("1.5", "memo");
 * const tx = await invoke("myOperation", [arg1, arg2]);
 * const event = await waitForReceipt(tx.txid, "MyEvent");
 * ```
 */

import { ref, type Ref } from "vue";
import { usePayments, useWallet, useEvents } from "@neo/uniapp-sdk";
import { handleAsync, pollForEvent } from "@shared/utils/errorHandling";
import type { PaymentResult, PaymentState } from "@neo/types";

export interface PaymentFlowOptions {
  /** App ID for payments */
  appId: string;
  /** Payment amount in GAS */
  amount?: string;
  /** Payment memo */
  memo?: string;
}

/** Extended payment result with waitForEvent */
export interface PaymentFlowResult extends Omit<PaymentResult, "invoke"> {
  /** Function to invoke contract with receipt context */
  invoke: <T = unknown>(operation: string, args: unknown[]) => Promise<T>;
}

export function usePaymentFlow(appId: string) {
  const { payGAS } = usePayments(appId);
  const { address, connect, invokeContract } = useWallet() as any;
  const { list: listEvents } = useEvents();

  const isProcessing = ref(false);
  const error = ref<Error | null>(null);

  /**
   * Process the complete payment flow
   */
  const processPayment = async (
    amount: string,
    memo: string,
  ): Promise<{
    receiptId: string;
    invoke: (scriptHash: string, operation: string, args: unknown[]) => Promise<{ txid: string; receiptId: string }>;
    waitForEvent: (txid: string, eventName: string, timeoutMs?: number) => Promise<any>;
  }> => {
    // Ensure wallet is connected
    if (!address.value) {
      await connect();
    }

    if (!address.value) {
      throw new Error("Wallet not connected");
    }

    return handleAsync(
      async () => {
        isProcessing.value = true;

        // Step 1: Pay GAS
        const payment = await payGAS(amount, memo);
        const receiptId = payment.receipt_id;

        // Step 2: Return invoke function with receipt context
        const invoke = async <T = unknown>(scriptHash: string, operation: string, args: unknown[]) => {
          const tx = (await invokeContract({
            scriptHash,
            operation,
            args,
          })) as { txid?: string; txHash?: string };

          const txid = tx.txid || tx.txHash || "";

          return { txid, receiptId } as T;
        };

        // Step 3: Return waitForEvent function
        const waitForEvent = async (txid: string, eventName: string, timeoutMs = 30000) => {
          return pollForEvent(
            async () => {
              const result = await listEvents({
                app_id: appId,
                event_name: eventName,
                limit: 20,
              });

              return result.events || [];
            },
            (events) => {
              const match = events.find((e: any) => e.tx_hash === txid);
              return match || null;
            },
            {
              timeoutMs,
              errorMessage: `Event "${eventName}" not found for transaction ${txid}`,
            },
          );
        };

        return { receiptId, invoke: invoke as PaymentResult["invoke"], waitForEvent };
      },
      {
        context: "Payment flow",
        onError: (err) => {
          error.value = err;
        },
      },
    ).finally(() => {
      isProcessing.value = false;
    });
  };

  return {
    /** Whether payment is being processed */
    isProcessing,
    /** Error from payment flow */
    error,
    /** Process the payment flow */
    processPayment,
  };
}
