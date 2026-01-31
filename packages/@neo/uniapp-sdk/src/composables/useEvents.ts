/**
 * Events Composable
 *
 * Provides event listening functionality for Neo blockchain events.
 */

import type {
  EventsSDK,
  EventsListOptions,
  EventsListResult,
} from "@neo/types";

/**
 * Events composable for blockchain event operations
 *
 * This composable provides access to event functionality including
 * listing events from the blockchain with pagination support.
 *
 * @returns Events SDK interface
 *
 * @example
 * ```ts
 * const { list } = useEvents();
 *
 * // List events for an app
 * const result = await list({
 *   app_id: "miniapp-charity-vault",
 *   event_name: "DonationMade",
 *   limit: 20
 * });
 *
 * console.log("Events:", result.events);
 * ```
 */
/** Return type for useEvents composable */
export interface UseEventsReturn {
  list: (options: EventsListOptions) => Promise<EventsListResult>;
}

export function useEvents(): UseEventsReturn {
  /**
   * List events with pagination
   *
   * @param options - Event list options including filters and pagination
   * @returns Events list with pagination info
   */
  const list = async (
    options: EventsListOptions,
  ): Promise<EventsListResult> => {
    if (typeof window !== "undefined" && (window as any).neo) {
      const neo = (window as any).neo;
      return await neo.listEvents(options);
    } else {
      throw new Error("[useEvents] NeoHub wallet not available");
    }
  };

  return {
    list,
  };
}
