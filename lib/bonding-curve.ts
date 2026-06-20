import { TRADING_FEE_BPS } from "@/types";

/**
 * Bonding Curve (pump.fun style) — Linear pricing model.
 *
 * Public API accepts/returns number in human-readable units (ETH, not wei).
 * BigInt used internally for precision-safe arithmetic matching on-chain math.
 *
 * Precision note: values stay within JS safe integer range for typical usage:
 *   - Token amounts up to ~9e15 (safe)
 *   - ETH amounts up to ~9e15 ETH (safe, exceeds total ETH supply)
 *   - For extreme values, use on-chain contract directly.
 *
 * harga(x) = basePrice + slope × x
 * cost(n)  = basePrice×n + slope×n²/2
 */

// ============================================================
// INTERNAL — BigInt math (precision-safe)
// ============================================================

function toBI(n: number): bigint {
  return BigInt(Math.round(n));
}

/** Convert number to wei (multiply by 1e18) */
function toWei(n: number): bigint {
  return BigInt(Math.round(n * 1e18));
}

function costToBuyI(basePrice: bigint, slope: bigint, totalSold: bigint, n: bigint): bigint {
  return basePrice * n + (slope * (2n * totalSold * n + n * n)) / 2n;
}

function tokensForEthI(basePrice: bigint, slope: bigint, totalSold: bigint, ethAmount: bigint): bigint {
  if (ethAmount === 0n) return 0n;

  if (slope === 0n) {
    return basePrice > 0n ? ethAmount / basePrice : 0n;
  }

  // cost(n) = basePrice*n + slope*n²/2 = ethAmount
  // slope*n² + 2*(basePrice+slope*totalSold)*n - 2*ethAmount = 0
  const a = slope;
  const b = (basePrice * 2n) + (slope * totalSold * 2n);
  const c = ethAmount * 8n;

  const discriminant = (b * b) + (a * c);
  const sqrtDisc = sqrtBigInt(discriminant);

  return sqrtDisc > b ? (sqrtDisc - b) / (2n * a) : 0n;
}

function ethForTokensI(basePrice: bigint, slope: bigint, totalSold: bigint, n: bigint): bigint {
  if (totalSold < n) return 0n;
  const start = totalSold - n;
  return costToBuyI(basePrice, slope, start, totalSold - start);
}

function sqrtBigInt(x: bigint): bigint {
  if (x === 0n) return 0n;
  let z = (x + 1n) / 2n;
  let y = x;
  while (z < y) {
    y = z;
    z = (x / z + z) / 2n;
  }
  return y;
}

// ============================================================
// PRICE CALCULATIONS (public API — number)
// ============================================================

/** Harga per token saat x sudah terjual */
export function currentPrice(basePrice: number, slope: number, totalSold: number): number {
  return basePrice + slope * totalSold;
}

/** Total cost untuk beli n token mulai dari totalSold */
export function costToBuy(basePrice: number, slope: number, totalSold: number, n: number): number {
  return Number(costToBuyI(toBI(basePrice), toBI(slope), toBI(totalSold), toBI(n)));
}

/** Berapa token yang didapat untuk ethAmount */
export function tokensForEth(basePrice: number, slope: number, totalSold: number, ethAmount: number): number {
  return Number(tokensForEthI(toBI(basePrice), toBI(slope), toBI(totalSold), toBI(ethAmount)));
}

/** Berapa ETH yang didapat jika jual n token mulai dari totalSold */
export function ethForTokens(basePrice: number, slope: number, totalSold: number, n: number): number {
  return Number(ethForTokensI(toBI(basePrice), toBI(slope), toBI(totalSold), toBI(n)));
}

// ============================================================
// TRADING FEE
// ============================================================

export function calculateTradingFee(ethAmount: number): number {
  return (ethAmount * TRADING_FEE_BPS) / 10000;
}

export function splitFee(fee: number): { platform: number; creator: number } {
  return { platform: fee / 2, creator: fee / 2 };
}

// ============================================================
// GRADUATION
// ============================================================

export function shouldGraduate(totalRaised: number, graduationCap: number): boolean {
  return totalRaised >= graduationCap;
}

export function graduationProgress(totalRaised: number, graduationCap: number): number {
  if (graduationCap <= 0) return 0;
  return Math.min(100, (totalRaised / graduationCap) * 100);
}

// ============================================================
// BUY/SELL SIMULATION
// ============================================================

export interface BuyResult {
  ethIn: number;
  fee: number;
  ethAfterFee: number;
  tokensOut: number;
  newTotalSold: number;
  newPrice: number;
  priceImpact: number;
  isGraduated: boolean;
}

export function simulateBuy(
  basePrice: number,
  slope: number,
  totalSold: number,
  ethIn: number,
  graduationCap: number,
  totalRaised: number,
  maxTokens: number
): BuyResult {
  const fee = calculateTradingFee(ethIn);
  const ethAfterFee = ethIn - fee;

  let tokensOut = tokensForEth(basePrice, slope, totalSold, ethAfterFee);
  tokensOut = Math.min(tokensOut, maxTokens);

  const newTotalSold = totalSold + tokensOut;
  const newPrice = currentPrice(basePrice, slope, newTotalSold);
  const oldPrice = currentPrice(basePrice, slope, totalSold);
  const priceImpact = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

  const newTotalRaised = totalRaised + ethIn;
  const isGraduated = shouldGraduate(newTotalRaised, graduationCap);

  return { ethIn, fee, ethAfterFee, tokensOut, newTotalSold, newPrice, priceImpact, isGraduated };
}

export interface SellResult {
  tokensIn: number;
  ethOut: number;
  fee: number;
  ethAfterFee: number;
  newTotalSold: number;
  newPrice: number;
  priceImpact: number;
}

export function simulateSell(
  basePrice: number,
  slope: number,
  totalSold: number,
  tokensIn: number
): SellResult {
  const ethOut = ethForTokens(basePrice, slope, totalSold, tokensIn);
  const fee = calculateTradingFee(ethOut);
  const ethAfterFee = ethOut - fee;

  const newTotalSold = totalSold - tokensIn;
  const newPrice = currentPrice(basePrice, slope, newTotalSold);
  const oldPrice = currentPrice(basePrice, slope, totalSold);
  const priceImpact = oldPrice > 0 ? ((oldPrice - newPrice) / oldPrice) * 100 : 0;

  return { tokensIn, ethOut, fee, ethAfterFee, newTotalSold, newPrice, priceImpact };
}
