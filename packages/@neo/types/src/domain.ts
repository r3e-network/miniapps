/**
 * Domain-specific types for miniapp applications
 *
 * Provides common types for games, DeFi, lotteries, and other miniapp patterns.
 */

// ============================================================
// GAME STATE TYPES
// ============================================================

/**
 * Game statistics tracking
 */
export interface GameState {
  /** Number of wins */
  wins: number;
  /** Number of losses */
  losses: number;
  /** Total games played */
  totalGames: number;
  /** Win rate percentage (0-100) */
  winRate: number;
}

/**
 * Game round result
 */
export interface GameRound {
  /** Unique round identifier */
  id: string | number;
  /** Whether player won */
  won: boolean;
  /** Amount won/lost */
  amount: number;
  /** Timestamp of round */
  timestamp: number;
  /** Round outcome data */
  outcome?: unknown;
}

/**
 * Game configuration
 */
export interface GameConfig {
  /** Minimum bet amount */
  minBet: number;
  /** Maximum bet amount */
  maxBet: number;
  /** House edge percentage */
  houseEdge: number;
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

// ============================================================
// LOTTERY TYPES
// ============================================================

/**
 * Lottery ticket tier configuration
 */
export interface LotteryTier {
  /** Tier identifier */
  name: string;
  /** Price per ticket */
  price: number;
  /** Maximum prize amount */
  maxPrize: number;
  /** Tier color for UI */
  color: string;
}

/**
 * Lottery ticket
 */
export interface LotteryTicket {
  /** Unique ticket identifier */
  id: string | number;
  /** Tier of the ticket */
  tier: string;
  /** Selected numbers */
  numbers: number[];
  /** Whether ticket has been scratched/played */
  played: boolean;
  /** Prize won (0 if none) */
  prize: number;
  /** Purchase timestamp */
  purchasedAt: number;
}

/**
 * Lottery draw result
 */
export interface LotteryDraw {
  /** Draw identifier */
  id: string | number;
  /** Winning numbers */
  numbers: number[];
  /** Prize pool amount */
  prizePool: number;
  /** Draw timestamp */
  timestamp: number;
}

/**
 * Prize tier distribution
 */
export interface PrizeDistribution {
  /** Tier name (jackpot, first, second, etc.) */
  tier: string;
  /** Percentage of pool (0-100) */
  percentage: number;
  /** Number of winners */
  winners: number;
  /** Prize amount per winner */
  amountPerWinner: number;
}

// ============================================================
// DEFI LENDING TYPES
// ============================================================

/**
 * LTV (Loan-to-Value) tier configuration
 */
export interface LTVTier {
  /** Tier level (1, 2, 3) */
  tier: number;
  /** LTV percentage */
  ltvPercent: number;
  /** Human-readable label */
  label: string;
  /** Description */
  desc?: string;
}

/**
 * Loan position
 */
export interface LoanPosition {
  /** Unique loan identifier */
  id: number | null;
  /** Amount borrowed */
  borrowed: number;
  /** Collateral locked */
  collateralLocked: number;
  /** Whether loan is active */
  active: boolean;
  /** LTV percentage for this loan */
  ltvPercent?: number;
  /** Loan creation timestamp */
  createdAt?: number;
}

/**
 * Health factor calculation result
 */
export interface HealthFactorResult {
  /** Health factor value (>1.5 safe, 1-1.5 warning, <1 critical) */
  value: number;
  /** Risk level */
  risk: "safe" | "warning" | "critical";
  /** Whether position is liquidatable */
  liquidatable: boolean;
}

/**
 * Platform statistics for lending
 */
export interface LendingPlatformStats {
  /** LTV for tier 1 in basis points */
  ltvTier1Bps: number;
  /** LTV for tier 2 in basis points */
  ltvTier2Bps: number;
  /** LTV for tier 3 in basis points */
  ltvTier3Bps: number;
  /** Minimum loan duration in seconds */
  minLoanDurationSeconds: number;
  /** Platform fee in basis points */
  platformFeeBps: number;
}

/**
 * Loan statistics
 */
export interface LoanStats {
  /** Total number of loans */
  totalLoans: number;
  /** Total amount borrowed */
  totalBorrowed: number;
  /** Total amount repaid */
  totalRepaid: number;
  /** Outstanding debt */
  outstanding: number;
}

// ============================================================
// PAYMENT TYPES
// ============================================================

/**
 * Payment flow configuration
 */
export interface PaymentConfig {
  /** App identifier */
  appId: string;
  /** Payment amount in GAS */
  amount: string;
  /** Payment memo */
  memo: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Payment result
 */
export interface PaymentResult {
  /** Receipt identifier */
  receiptId: string;
  /** Transaction ID */
  txid?: string;
  /** Invoke contract function */
  invoke: <T = unknown>(operation: string, args: unknown[]) => Promise<T>;
  /** Wait for event after transaction */
  waitForEvent: (txid: string, eventName: string, timeoutMs?: number) => Promise<unknown>;
}

/**
 * Payment processing state
 */
export interface PaymentState {
  /** Whether payment is being processed */
  isProcessing: boolean;
  /** Error from payment flow */
  error: Error | null;
  /** Receipt ID if successful */
  receiptId: string | null;
}

// ============================================================
// FORM STATE TYPES
// ============================================================

/**
 * Generic form state
 */
export interface FormState<T = unknown> {
  /** Form values */
  values: T;
  /** Whether form is valid */
  valid: boolean;
  /** Form errors */
  errors: Record<keyof T, string | null>;
  /** Whether form is submitting */
  submitting: boolean;
}

/**
 * Form field configuration
 */
export interface FormField<T = unknown> {
  /** Field name */
  name: keyof T & string;
  /** Field label */
  label: string;
  /** Field type */
  type: "text" | "number" | "select" | "checkbox" | "radio";
  /** Field value */
  value: unknown;
  /** Whether field is required */
  required: boolean;
  /** Validation rules */
  rules?: ValidationRule[];
  /** Field placeholder */
  placeholder?: string;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  /** Rule name */
  name: "min" | "max" | "pattern" | "custom";
  /** Rule value */
  value?: unknown;
  /** Error message */
  message: string;
}

// ============================================================
// ASYNC OPERATION TYPES
// ============================================================

/**
 * Async operation options
 */
export interface AsyncOperationOptions {
  /** Context description for errors */
  context?: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Error handler override */
  onError?: (error: Error) => void;
  /** Success callback */
  onSuccess?: (data: unknown) => void;
  /** Whether to show loading state */
  setLoading?: boolean;
  /** Whether to rethrow errors */
  rethrow?: boolean;
}

/**
 * Async operation state
 */
export interface AsyncOperationState<T = unknown> {
  /** Whether operation is loading */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Result data */
  data: T | null;
}

/**
 * Async operation result
 */
export type AsyncOperationResult<T> = { success: true; data: T } | { success: false; error: Error };

// ============================================================
// PAGE STATE TYPES
// ============================================================

/**
 * Page state for multi-page miniapps
 */
export interface PageState {
  /** Current active tab */
  activeTab: string;
  /** Available tabs */
  tabs: PageTab[];
  /** Page loading state */
  loading: boolean;
  /** Page error state */
  error: string | null;
}

/**
 * Page tab configuration
 */
export interface PageTab {
  /** Tab identifier */
  id: string;
  /** Tab icon name */
  icon: string;
  /** Tab label */
  label: string;
}

// ============================================================
// ERROR TYPES
// ============================================================

/**
 * App error with context
 */
export interface AppError extends Error {
  /** Error code */
  code?: string;
  /** Error context */
  context?: string;
  /** Original error */
  cause?: Error;
}

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
  /** Error context description */
  context?: string;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Whether to rethrow errors */
  rethrow?: boolean;
  /** Whether to log errors */
  silent?: boolean;
}

// ============================================================
// EVENT TYPES
// ============================================================

/**
 * Event polling options
 */
export interface EventPollingOptions<T = unknown> {
  /** Function to fetch events */
  fetchEvents: () => Promise<T[]>;
  /** Function to find matching event */
  findMatch: (events: T[]) => T | null;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Polling interval in milliseconds */
  intervalMs?: number;
  /** Error message on timeout */
  errorMessage?: string;
}

/**
 * Event match result
 */
export interface EventMatchResult<T = unknown> {
  /** Whether event was found */
  found: boolean;
  /** Matched event data */
  event?: T;
  /** Attempts made */
  attempts: number;
  /** Time elapsed in milliseconds */
  elapsedMs: number;
}

// ============================================================
// THEME TYPES
// ============================================================

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /** Theme mode */
  mode: "light" | "dark";
  /** Primary color */
  primary: string;
  /** Secondary color */
  secondary: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
}

/**
 * CSS custom property name
 */
export type ThemeVariable =
  | "--primary-color"
  | "--secondary-color"
  | "--background-color"
  | "--text-color"
  | "--border-color"
  | "--success-color"
  | "--danger-color"
  | "--warning-color";

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Async function type
 */
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

/**
 * Constructor type
 */
export type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Event handler type
 */
export type EventHandler<T = Event> = (event: T) => void;
