import { prisma } from "./prisma";
import { shouldLiquidate, executeLiquidation } from "./margin";
import { getCurrentPrice } from "./price";

// ============================================================
// TYPES
// ============================================================

export interface LiquidationResult {
  positionId: string;
  userId: string;
  tokenSymbol: string;
  triggerPrice: number;
  coinsSold: number;
  saleProceeds: number;
  debtRepaid: number;
  userRefund: number;
  platformLoss: number;
}

export interface LiquidationCheckResult {
  checked: number;
  liquidated: number;
  results: LiquidationResult[];
  errors: string[];
}

// ============================================================
// CHECK ALL OPEN POSITIONS
// ============================================================

/**
 * Cek semua posisi open dan liquidasi yang memenuhi syarat.
 * Dipanggil oleh cron job atau manual trigger.
 */
export async function checkAndLiquidate(): Promise<LiquidationCheckResult> {
  const result: LiquidationCheckResult = {
    checked: 0,
    liquidated: 0,
    results: [],
    errors: [],
  };

  try {
    // Ambil semua posisi yang masih open
    const openPositions = await prisma.marginPosition.findMany({
      where: { status: "open" },
      include: {
        project: {
          select: {
            id: true,
            tokenSymbol: true,
            contractAddress: true,
            chain: true,
          },
        },
      },
    });

    result.checked = openPositions.length;

    // Cek setiap posisi
    for (const position of openPositions) {
      try {
        // Ambil harga saat ini
        const currentPrice = await getCurrentPrice(
          position.project.chain,
          position.project.contractAddress
        );

        if (currentPrice === null) {
          result.errors.push(
            `Cannot fetch price for ${position.project.tokenSymbol}`
          );
          continue;
        }

        // Cek apakah perlu likuidasi
        const needsLiquidation = shouldLiquidate(
          Number(position.coinsPurchased),
          Number(position.debtAmount),
          Number(position.safetyMargin),
          currentPrice
        );

        if (needsLiquidation) {
          const liqResult = await processLiquidation(
            position.id,
            currentPrice
          );
          if (liqResult) {
            result.results.push(liqResult);
            result.liquidated++;
          }
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        result.errors.push(
          `Error processing position ${position.id}: ${errorMsg}`
        );
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(`Fatal error: ${errorMsg}`);
  }

  return result;
}

// ============================================================
// PROCESS SINGLE LIQUIDATION
// ============================================================

/**
 * Proses likuidasi untuk satu posisi.
 */
export async function processLiquidation(
  positionId: string,
  currentPrice: number
): Promise<LiquidationResult | null> {
  const position = await prisma.marginPosition.findUnique({
    where: { id: positionId },
    include: {
      user: true,
      project: {
        select: { tokenSymbol: true },
      },
    },
  });

  if (!position || position.status !== "open") {
    return null;
  }

  // Hitung hasil likuidasi
  const liqCalc = executeLiquidation(
    {
      coinsPurchased: Number(position.coinsPurchased),
      debtAmount: Number(position.debtAmount),
      safetyMargin: Number(position.safetyMargin),
    },
    currentPrice
  );

  // Proses dalam transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update posisi jadi liquidated
    await tx.marginPosition.update({
      where: { id: positionId },
      data: {
        status: "liquidated",
        liquidatedAt: new Date(),
        pnl: -Number(position.modal), // Loss = seluruh modal
      },
    });

    // 2. Update user — hutang dihapus, sisa dikembalikan
    await tx.user.update({
      where: { id: position.userId },
      data: {
        totalMarginDebt: { decrement: Number(position.debtAmount) },
        balance: {
          increment: liqCalc.userRefund > 0 ? liqCalc.userRefund : 0,
        },
      },
    });

    // 3. Kembalikan koin ke supply
    await tx.launchpadProject.update({
      where: { id: position.projectId },
      data: {
        availableSupply: { increment: position.coinsPurchased },
      },
    });

    // 4. Log likuidasi
    await tx.liquidationLog.create({
      data: {
        positionId: position.id,
        userId: position.userId,
        triggerPrice: currentPrice,
        coinsSold: liqCalc.coinsSold,
        saleProceeds: liqCalc.saleProceeds,
        debtRepaid: liqCalc.debtRepaid,
        userRefund: liqCalc.userRefund,
        platformLoss: liqCalc.platformLoss,
      },
    });

    return {
      positionId: position.id,
      userId: position.userId,
      tokenSymbol: "", // diisi di luar
      triggerPrice: currentPrice,
      ...liqCalc,
    };
  });

  return {
    ...result,
    tokenSymbol: position.project?.tokenSymbol || "UNKNOWN",
  };
}

// ============================================================
// LIQUIDATION QUEUE (positions close to liquidation)
// ============================================================

export interface LiquidationWarning {
  positionId: string;
  userId: string;
  tokenSymbol: string;
  currentPrice: number;
  liquidationPrice: number;
  distancePercent: number;
  modal: number;
  leveragePercent: number;
}

/**
 * Ambil posisi yang mendekati likuidasi (dalam range tertentu).
 */
export async function getLiquidationWarnings(
  thresholdPercent: number = 20
): Promise<LiquidationWarning[]> {
  const openPositions = await prisma.marginPosition.findMany({
    where: { status: "open" },
    include: {
      project: {
        select: {
          tokenSymbol: true,
          contractAddress: true,
          chain: true,
        },
      },
    },
  });

  const warnings: LiquidationWarning[] = [];

  for (const position of openPositions) {
    const currentPrice = await getCurrentPrice(
      position.project.chain,
      position.project.contractAddress
    );

    if (currentPrice === null) continue;

    const liqPrice = Number(position.liquidationPrice);
    const distancePercent =
      liqPrice > 0 ? ((currentPrice - liqPrice) / currentPrice) * 100 : 100;

    if (distancePercent <= thresholdPercent) {
      warnings.push({
        positionId: position.id,
        userId: position.userId,
        tokenSymbol: position.project.tokenSymbol,
        currentPrice,
        liquidationPrice: liqPrice,
        distancePercent,
        modal: Number(position.modal),
        leveragePercent: position.leveragePercent,
      });
    }
  }

  // Sort by closest to liquidation
  return warnings.sort((a, b) => a.distancePercent - b.distancePercent);
}

// ============================================================
// PLATFORM RISK STATS
// ============================================================

export interface PlatformRiskStats {
  totalOpenPositions: number;
  totalExposure: number; // total hutang
  totalModal: number;
  averageLeverage: number;
  positionsAtRisk: number; // within 20% of liquidation
  insuranceFundEstimate: number;
}

export async function getPlatformRiskStats(): Promise<PlatformRiskStats> {
  const openPositions = await prisma.marginPosition.findMany({
    where: { status: "open" },
  });

  const totalOpenPositions = openPositions.length;
  const totalExposure = openPositions.reduce(
    (sum, p) => sum + Number(p.debtAmount),
    0
  );
  const totalModal = openPositions.reduce(
    (sum, p) => sum + Number(p.modal),
    0
  );
  const averageLeverage =
    totalOpenPositions > 0
      ? openPositions.reduce((sum, p) => sum + p.leveragePercent, 0) /
        totalOpenPositions
      : 0;

  // Get warnings for at-risk positions
  const warnings = await getLiquidationWarnings(20);
  const positionsAtRisk = warnings.length;

  // Insurance fund estimate (20% of all fees collected)
  // This is a simplified estimate — in production, track actual fee accumulation
  const insuranceFundEstimate = totalExposure * 0.01; // rough 1% of exposure

  return {
    totalOpenPositions,
    totalExposure,
    totalModal,
    averageLeverage,
    positionsAtRisk,
    insuranceFundEstimate,
  };
}
