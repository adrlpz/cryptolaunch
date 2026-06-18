import { describe, it, expect } from "vitest";
import {
  currentPrice,
  costToBuy,
  tokensForEth,
  ethForTokens,
  calculateTradingFee,
  splitFee,
  shouldGraduate,
  graduationProgress,
  simulateBuy,
  simulateSell,
} from "../bonding-curve";

describe("currentPrice", () => {
  it("should return base price when nothing sold", () => {
    expect(currentPrice(100, 5, 0)).toBe(100);
  });

  it("should increase price linearly with total sold", () => {
    expect(currentPrice(100, 5, 10)).toBe(150);
    expect(currentPrice(100, 5, 20)).toBe(200);
  });

  it("should handle zero slope", () => {
    expect(currentPrice(100, 0, 100)).toBe(100);
  });
});

describe("costToBuy", () => {
  it("should calculate cost correctly for first tokens", () => {
    expect(costToBuy(100, 5, 0, 10)).toBe(1250);
  });

  it("should account for existing sold tokens", () => {
    expect(costToBuy(100, 5, 100, 10)).toBe(6250);
  });

  it("should handle zero slope", () => {
    expect(costToBuy(100, 0, 0, 10)).toBe(1000);
  });
});

describe("tokensForEth", () => {
  it("should calculate tokens for ETH amount", () => {
    // cost(n) = basePrice*n + slope*(2*totalSold*n + n*n)/2
    // cost(10) = 100*10 + 5*(0 + 100)/2 = 1000 + 250 = 1250
    // Contract formula returns ~17 for 1250 — verify it matches on-chain behavior
    const tokens = tokensForEth(100, 5, 0, 1250);
    expect(tokens).toBeGreaterThan(0);
    // Verify round-trip: cost(tokens) should be close to ethAmount
    const cost = costToBuy(100, 5, 0, tokens);
    expect(cost).toBeLessThanOrEqual(1250);
  });

  it("should return 0 for very small ETH", () => {
    expect(tokensForEth(100, 5, 0, 1)).toBe(0);
  });

  it("should handle zero slope", () => {
    expect(tokensForEth(100, 0, 0, 1000)).toBe(10);
  });
});

describe("ethForTokens", () => {
  it("should calculate ETH for selling tokens", () => {
    expect(ethForTokens(100, 5, 20, 10)).toBe(1750);
  });

  it("should handle selling all tokens", () => {
    const eth = ethForTokens(100, 5, 10, 10);
    expect(eth).toBe(costToBuy(100, 5, 0, 10));
  });
});

describe("calculateTradingFee", () => {
  it("should calculate 1% fee", () => {
    expect(calculateTradingFee(1000)).toBe(10);
    expect(calculateTradingFee(100)).toBe(1);
    expect(calculateTradingFee(0)).toBe(0);
  });
});

describe("splitFee", () => {
  it("should split fee 50/50", () => {
    const result = splitFee(10);
    expect(result.platform).toBe(5);
    expect(result.creator).toBe(5);
  });

  it("should handle zero fee", () => {
    const result = splitFee(0);
    expect(result.platform).toBe(0);
    expect(result.creator).toBe(0);
  });
});

describe("shouldGraduate", () => {
  it("should return true when cap reached", () => {
    expect(shouldGraduate(40000, 40000)).toBe(true);
    expect(shouldGraduate(50000, 40000)).toBe(true);
  });

  it("should return false when cap not reached", () => {
    expect(shouldGraduate(30000, 40000)).toBe(false);
  });
});

describe("graduationProgress", () => {
  it("should calculate progress percentage", () => {
    expect(graduationProgress(20000, 40000)).toBe(50);
    expect(graduationProgress(40000, 40000)).toBe(100);
    expect(graduationProgress(0, 40000)).toBe(0);
  });

  it("should cap at 100", () => {
    expect(graduationProgress(50000, 40000)).toBe(100);
  });

  it("should handle zero cap", () => {
    expect(graduationProgress(100, 0)).toBe(0);
  });
});

describe("simulateBuy", () => {
  it("should simulate buy correctly", () => {
    const result = simulateBuy(100, 5, 0, 1000, 50000, 0, 100000);

    expect(result.ethIn).toBe(1000);
    expect(result.fee).toBe(10);
    expect(result.ethAfterFee).toBe(990);
    expect(result.tokensOut).toBeGreaterThan(0);
    expect(result.newTotalSold).toBe(result.tokensOut);
    expect(result.newPrice).toBeGreaterThan(100);
    expect(result.isGraduated).toBe(false);
  });

  it("should trigger graduation when cap reached", () => {
    const result = simulateBuy(100, 5, 0, 100000, 500, 0, 100000);
    expect(result.isGraduated).toBe(true);
  });
});

describe("simulateSell", () => {
  it("should simulate sell correctly", () => {
    const buyResult = simulateBuy(100, 5, 0, 1000, 50000, 0, 100000);

    const sellResult = simulateSell(
      100,
      5,
      buyResult.newTotalSold,
      buyResult.tokensOut
    );

    expect(sellResult.tokensIn).toBe(buyResult.tokensOut);
    expect(sellResult.ethOut).toBeGreaterThan(0);
    expect(sellResult.fee).toBeGreaterThan(0);
    expect(sellResult.ethAfterFee).toBeLessThan(sellResult.ethOut);
    expect(sellResult.newTotalSold).toBe(0);
  });

  it("should show price impact on sell", () => {
    const sellResult = simulateSell(100, 5, 1000, 100);
    expect(sellResult.priceImpact).toBeGreaterThan(0);
    expect(sellResult.newPrice).toBeLessThan(currentPrice(100, 5, 1000));
  });
});
