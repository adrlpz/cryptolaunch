// ============================================================
// MARGIN TYPES
// ============================================================

export interface MarginCalculation {
  modal: number;
  leveragePercent: number;
  debtAmount: number;
  feeAmount: number;
  modalAfterFee: number;
  totalFunds: number;
  coinsPurchased: number;
  purchasePrice: number;
  liquidationPrice: number;
  safetyMargin: number;
  maxDropPercent: number;
}

export interface PositionStatus {
  id: string;
  modal: number;
  leveragePercent: number;
  debtAmount: number;
  feeAmount: number;
  coinsPurchased: number;
  purchasePrice: number;
  currentPrice: number;
  liquidationPrice: number;
  currentValue: number;
  equity: number;
  unrealizedPnl: number;
  pnlPercent: number;
  distanceToLiquidation: number; // percentage
  status: "open" | "closed" | "liquidated";
}

// ============================================================
// TOKEN LAUNCH TYPES
// ============================================================

export interface TokenLaunchInput {
  tokenName: string;
  tokenSymbol: string;
  totalSupply: string;
  decimals: number;
  description: string;
  logoUrl: string;
  websiteUrl?: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  targetChain: "bsc" | "ethereum" | "arbitrum" | "base";
  basePrice: string;
  graduationCap: string;
  launchDate: string;
  maxLeveragePercent?: number;
}

export interface VanityJobStatus {
  id: string;
  targetSuffix: string;
  attempts: number;
  maxAttempts: number;
  status: "running" | "found" | "failed" | "cancelled";
  estimatedTimeRemaining?: number; // seconds
  progressPercent: number;
}

// ============================================================
// BONDING CURVE TYPES
// ============================================================

export interface BondingCurveState {
  basePrice: number;
  slope: number;
  totalSold: number;
  totalRaised: number;
  currentPrice: number;
  graduationCap: number;
  isGraduated: boolean;
  progressPercent: number;
}

export interface CurveTradeResult {
  tokensOut?: number;
  bnbOut?: number;
  fee: number;
  priceImpact: number;
  newPrice: number;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// LEVERAGE LEVELS
// ============================================================

export const LEVERAGE_LEVELS = [10, 20, 30, 40, 50] as const;
export type LeverageLevel = (typeof LEVERAGE_LEVELS)[number];

export const MARGIN_FEE_PERCENT = 5;
export const SAFETY_MARGIN_PERCENT = 5;
export const TRADING_FEE_BPS = 100; // 1%
export const DEFAULT_GRADUATION_CAP_BNB = 69;
