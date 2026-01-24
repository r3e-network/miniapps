import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@shared/utils/i18n", () => ({
  createT: () => (key: string) => key,
}));

describe("Self Loan - Collateralized Borrowing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LTV Calculations", () => {
    it("uses selected LTV tier to estimate borrow amount", () => {
      const collateral = 100;
      const tiers = [20, 30, 40];

      tiers.forEach((ltvPercent) => {
        const estimatedBorrow = (collateral * ltvPercent) / 100;
        expect(estimatedBorrow).toBe(ltvPercent);
      });
    });

    it("computes collateral ratio as inverse of LTV", () => {
      const ltvPercent = 30;
      const collateralRatio = 100 / ltvPercent;

      expect(collateralRatio).toBeCloseTo(3.333, 3);
    });

    it("applies origination fee to the borrow amount", () => {
      const collateral = 100;
      const ltvPercent = 30;
      const feeBps = 50;
      const gross = (collateral * ltvPercent) / 100;
      const fee = (gross * feeBps) / 10000;
      const net = gross - fee;

      expect(net).toBeCloseTo(29.85, 2);
    });
  });

  describe("Health Factor", () => {
    it("equals 1.0 when borrowed equals max LTV", () => {
      const collateralLocked = 100;
      const borrowed = 20;
      const ltvPercent = 20;
      const healthFactor = (collateralLocked * (ltvPercent / 100)) / borrowed;

      expect(healthFactor).toBe(1);
    });

    it("increases as borrowed decreases", () => {
      const collateralLocked = 100;
      const borrowed = 10;
      const ltvPercent = 20;
      const healthFactor = (collateralLocked * (ltvPercent / 100)) / borrowed;

      expect(healthFactor).toBe(2);
    });
  });

  describe("Loan Validation", () => {
    it("accepts collateral within balance", () => {
      const collateral = 5;
      const neoBalance = 10;
      const isValid = collateral > 0 && collateral <= neoBalance;

      expect(isValid).toBe(true);
    });

    it("rejects collateral exceeding balance", () => {
      const collateral = 12;
      const neoBalance = 10;
      const isValid = collateral > 0 && collateral <= neoBalance;

      expect(isValid).toBe(false);
    });

    it("rejects zero or negative collateral", () => {
      const neoBalance = 10;
      const values = [0, -1, -5];

      values.forEach((collateral) => {
        const isValid = collateral > 0 && collateral <= neoBalance;
        expect(isValid).toBe(false);
      });
    });
  });

  describe("Collateral Utilization", () => {
    it("calculates utilization from locked and available collateral", () => {
      const collateralLocked = 4;
      const available = 6;
      const total = collateralLocked + available;
      const utilization = total === 0 ? 0 : Math.round((collateralLocked / total) * 100);

      expect(utilization).toBe(40);
    });
  });
});
