import { describe, it, expect } from "vitest";
import {
  calculateMargin,
  getPositionStatus,
  shouldLiquidate,
  executeLiquidation,
} from "../margin";

describe("calculateMargin", () => {
  it("should calculate basic margin correctly (Lev 50%, Modal $100, Price $1)", () => {
    const result = calculateMargin(100, 50, 1);

    expect(result.modal).toBe(100);
    expect(result.leveragePercent).toBe(50);
    expect(result.debtAmount).toBe(50);
    expect(result.feeAmount).toBe(2.5); // 50 * 5%
    expect(result.modalAfterFee).toBe(97.5); // 100 - 2.5
    expect(result.totalFunds).toBe(147.5); // 97.5 + 50
    expect(result.coinsPurchased).toBe(147.5); // 147.5 / 1
    expect(result.safetyMargin).toBe(7.375); // 147.5 * 5%
  });

  it("should calculate liquidation price correctly", () => {
    const result = calculateMargin(100, 50, 1);

    // liquidationPrice = (debt + safetyMargin) / coins
    // = (50 + 7.375) / 147.5 = 0.389...
    expect(result.liquidationPrice).toBeCloseTo(0.389, 2);
  });

  it("should calculate max drop percent correctly", () => {
    const result = calculateMargin(100, 50, 1);

    // maxDrop = (1 - 0.389) / 1 * 100 = 61.1%
    expect(result.maxDropPercent).toBeCloseTo(61.1, 1);
  });

  it("should work with different leverage levels", () => {
    const lev10 = calculateMargin(100, 10, 1);
    const lev30 = calculateMargin(100, 30, 1);
    const lev50 = calculateMargin(100, 50, 1);

    // Higher leverage = more debt = more coins = lower liquidation price = bigger drop allowed
    expect(lev10.debtAmount).toBe(10);
    expect(lev30.debtAmount).toBe(30);
    expect(lev50.debtAmount).toBe(50);

    expect(lev10.coinsPurchased).toBeLessThan(lev30.coinsPurchased);
    expect(lev30.coinsPurchased).toBeLessThan(lev50.coinsPurchased);

    // Lev 10% allows bigger drop than 50%
    expect(lev10.maxDropPercent).toBeGreaterThan(lev50.maxDropPercent);
  });

  it("should work with different token prices", () => {
    const cheap = calculateMargin(100, 50, 0.01);
    const expensive = calculateMargin(100, 50, 10);

    expect(cheap.coinsPurchased).toBeGreaterThan(expensive.coinsPurchased);
    expect(cheap.liquidationPrice).toBeLessThan(expensive.liquidationPrice);
  });

  it("should handle edge case: modal = 1", () => {
    const result = calculateMargin(1, 50, 1);
    expect(result.debtAmount).toBe(0.5);
    expect(result.feeAmount).toBe(0.025);
    expect(result.totalFunds).toBe(1.475);
  });
});

describe("shouldLiquidate", () => {
  it("should return true when equity <= safety margin", () => {
    // coins=147.5, debt=50, safety=7.375
    // At price 0.388: equity = 147.5*0.388 - 50 = 7.23 < 7.375
    expect(shouldLiquidate(147.5, 50, 7.375, 0.388)).toBe(true);
  });

  it("should return false when equity > safety margin", () => {
    // At price 0.5: equity = 147.5*0.5 - 50 = 23.75 > 7.375
    expect(shouldLiquidate(147.5, 50, 7.375, 0.5)).toBe(false);
  });

  it("should return true when price is very low", () => {
    expect(shouldLiquidate(147.5, 50, 7.375, 0.1)).toBe(true);
  });
});

describe("executeLiquidation", () => {
  it("should calculate liquidation correctly", () => {
    const result = executeLiquidation(
      { coinsPurchased: 147.5, debtAmount: 50, safetyMargin: 7.375 },
      0.4
    );

    expect(result.coinsSold).toBe(147.5);
    expect(result.saleProceeds).toBeCloseTo(59); // 147.5 * 0.4
    expect(result.debtRepaid).toBe(50);
    expect(result.userRefund).toBeCloseTo(9); // 59 - 50
    expect(result.platformLoss).toBe(0);
  });

  it("should handle case where sale proceeds < debt", () => {
    const result = executeLiquidation(
      { coinsPurchased: 147.5, debtAmount: 50, safetyMargin: 7.375 },
      0.2
    );

    expect(result.saleProceeds).toBeCloseTo(29.5); // 147.5 * 0.2
    expect(result.debtRepaid).toBeCloseTo(29.5); // min of proceeds and debt
    expect(result.userRefund).toBeCloseTo(0); // no refund
  });
});

describe("getPositionStatus", () => {
  it("should calculate PnL correctly (profit)", () => {
    const position = {
      id: "test",
      modal: 100,
      leveragePercent: 50,
      debtAmount: 50,
      feeAmount: 2.5,
      coinsPurchased: 147.5,
      purchasePrice: 1,
      liquidationPrice: 0.389,
      safetyMargin: 7.375,
      status: "open",
    };

    const status = getPositionStatus(position, 1.5);

    // currentValue = 147.5 * 1.5 = 221.25
    expect(status.currentValue).toBeCloseTo(221.25);
    // equity = 221.25 - 50 = 171.25
    expect(status.equity).toBeCloseTo(171.25);
    // pnl = 171.25 - 100 = 71.25
    expect(status.unrealizedPnl).toBeCloseTo(71.25);
    // roi = 71.25 / 100 * 100 = 71.25%
    expect(status.pnlPercent).toBeCloseTo(71.25);
  });

  it("should calculate PnL correctly (loss)", () => {
    const position = {
      id: "test",
      modal: 100,
      leveragePercent: 50,
      debtAmount: 50,
      feeAmount: 2.5,
      coinsPurchased: 147.5,
      purchasePrice: 1,
      liquidationPrice: 0.389,
      safetyMargin: 7.375,
      status: "open",
    };

    const status = getPositionStatus(position, 0.5);

    // currentValue = 147.5 * 0.5 = 73.75
    expect(status.currentValue).toBeCloseTo(73.75);
    // equity = 73.75 - 50 = 23.75
    expect(status.equity).toBeCloseTo(23.75);
    // pnl = 23.75 - 100 = -76.25
    expect(status.unrealizedPnl).toBeCloseTo(-76.25);
  });

  it("should calculate distance to liquidation", () => {
    const position = {
      id: "test",
      modal: 100,
      leveragePercent: 50,
      debtAmount: 50,
      feeAmount: 2.5,
      coinsPurchased: 147.5,
      purchasePrice: 1,
      liquidationPrice: 0.389,
      safetyMargin: 7.375,
      status: "open",
    };

    const status = getPositionStatus(position, 1);

    // distance = (1 - 0.389) / 1 * 100 = 61.1%
    expect(status.distanceToLiquidation).toBeCloseTo(61.1, 0);
  });
});
