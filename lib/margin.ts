import type { MarginCalculation, PositionStatus } from "@/types";
import { MARGIN_FEE_PERCENT, SAFETY_MARGIN_PERCENT } from "@/types";

/**
 * Hitung detail margin untuk sebuah posisi.
 *
 * Rumus:
 *   hutang         = modal × lev%
 *   fee            = hutang × 5% (dipotong dari modal)
 *   modal_bersih   = modal - fee
 *   dana_beli      = modal_bersih + hutang
 *   jumlah_koin    = dana_beli / harga_token
 *   safety_margin  = 5% × dana_beli
 *   harga_likuidasi= (hutang + safety_margin) / jumlah_koin
 */
export function calculateMargin(
  modal: number,
  leveragePercent: number,
  tokenPrice: number
): MarginCalculation {
  const debtAmount = modal * (leveragePercent / 100);
  const feeAmount = debtAmount * (MARGIN_FEE_PERCENT / 100);
  const modalAfterFee = modal - feeAmount;
  const totalFunds = modalAfterFee + debtAmount;
  const coinsPurchased = totalFunds / tokenPrice;
  const safetyMargin = totalFunds * (SAFETY_MARGIN_PERCENT / 100);
  const liquidationPrice = (debtAmount + safetyMargin) / coinsPurchased;
  const maxDropPercent =
    ((tokenPrice - liquidationPrice) / tokenPrice) * 100;

  return {
    modal,
    leveragePercent,
    debtAmount,
    feeAmount,
    modalAfterFee,
    totalFunds,
    coinsPurchased,
    purchasePrice: tokenPrice,
    liquidationPrice,
    safetyMargin,
    maxDropPercent,
  };
}

/**
 * Hitung status posisi saat ini berdasarkan harga pasar.
 */
export function getPositionStatus(
  position: {
    id: string;
    modal: number;
    leveragePercent: number;
    debtAmount: number;
    feeAmount: number;
    coinsPurchased: number;
    purchasePrice: number;
    liquidationPrice: number;
    safetyMargin: number;
    status: string;
  },
  currentPrice: number
): PositionStatus {
  const currentValue = position.coinsPurchased * currentPrice;
  const equity = currentValue - position.debtAmount;
  const unrealizedPnl = equity - position.modal;
  const pnlPercent = (unrealizedPnl / position.modal) * 100;
  const distanceToLiquidation =
    position.liquidationPrice > 0
      ? ((currentPrice - position.liquidationPrice) / currentPrice) * 100
      : 0;

  return {
    ...position,
    currentPrice,
    currentValue,
    equity,
    unrealizedPnl,
    pnlPercent,
    distanceToLiquidation,
    status: position.status as "open" | "closed" | "liquidated",
  };
}

/**
 * Cek apakah posisi perlu di-liquidasi.
 * Likuidasi terjadi jika ekuitas ≤ safety_margin.
 */
export function shouldLiquidate(
  coinsPurchased: number,
  debtAmount: number,
  safetyMargin: number,
  currentPrice: number
): boolean {
  const equity = coinsPurchased * currentPrice - debtAmount;
  return equity <= safetyMargin;
}

/**
 * Proses likuidasi — hitung hasil likuidasi.
 */
export function executeLiquidation(
  position: {
    coinsPurchased: number;
    debtAmount: number;
    safetyMargin: number;
  },
  currentPrice: number
): {
  coinsSold: number;
  saleProceeds: number;
  debtRepaid: number;
  userRefund: number;
  platformLoss: number;
} {
  const saleProceeds = position.coinsPurchased * currentPrice;
  const debtRepaid = Math.min(saleProceeds, position.debtAmount);
  const userRefund = saleProceeds - debtRepaid;
  const platformLoss = userRefund < 0 ? Math.abs(userRefund) : 0;

  return {
    coinsSold: position.coinsPurchased,
    saleProceeds,
    debtRepaid,
    userRefund,
    platformLoss,
  };
}
