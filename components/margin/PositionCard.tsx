"use client";

import { useMemo } from "react";
import { getPositionStatus } from "@/lib/margin";

interface PositionCardProps {
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
    tokenSymbol?: string;
    tokenName?: string;
  };
  currentPrice: number;
  onClose?: (id: string) => void;
}

export default function PositionCard({
  position,
  currentPrice,
  onClose,
}: PositionCardProps) {
  const status = useMemo(
    () => getPositionStatus(position, currentPrice),
    [position, currentPrice]
  );

  const isProfit = status.unrealizedPnl >= 0;
  const distanceColor =
    status.distanceToLiquidation > 30
      ? "text-green-400"
      : status.distanceToLiquidation > 10
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold">
            {position.tokenSymbol || "TOKEN"}{" "}
            <span className="text-sm font-normal text-zinc-500">
              Lev {position.leveragePercent}%
            </span>
          </h3>
          <p className="text-xs text-zinc-500">
            {position.tokenName || "Unknown Token"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            position.status === "open"
              ? "bg-green-500/20 text-green-400"
              : position.status === "liquidated"
                ? "bg-red-500/20 text-red-400"
                : "bg-zinc-500/20 text-zinc-400"
          }`}
        >
          {position.status.toUpperCase()}
        </span>
      </div>

      {/* PnL */}
      <div className="mb-4">
        <div
          className={`text-2xl font-bold ${
            isProfit ? "text-green-400" : "text-red-400"
          }`}
        >
          {isProfit ? "+" : ""}
          {status.unrealizedPnl.toFixed(2)} USDT
        </div>
        <div
          className={`text-sm ${isProfit ? "text-green-400" : "text-red-400"}`}
        >
          {isProfit ? "+" : ""}
          {status.pnlPercent.toFixed(2)}% ROI
        </div>
      </div>

      {/* Liquidation Bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-zinc-500">Distance to Liquidation</span>
          <span className={distanceColor}>
            {status.distanceToLiquidation.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${
              status.distanceToLiquidation > 30
                ? "bg-green-500"
                : status.distanceToLiquidation > 10
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, 100 - status.distanceToLiquidation))}%`,
            }}
          />
        </div>
      </div>

      {/* Details Grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-zinc-500">Modal</div>
          <div className="text-white">${position.modal.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-500">Hutang</div>
          <div className="text-white">${position.debtAmount.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-500">Koin</div>
          <div className="text-white">
            {position.coinsPurchased.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-zinc-500">Harga Beli</div>
          <div className="text-white">
            ${position.purchasePrice.toFixed(6)}
          </div>
        </div>
        <div>
          <div className="text-zinc-500">Harga Sekarang</div>
          <div className="text-white">${currentPrice.toFixed(6)}</div>
        </div>
        <div>
          <div className="text-zinc-500">Likuidasi di</div>
          <div className="text-red-400">
            ${position.liquidationPrice.toFixed(6)}
          </div>
        </div>
      </div>

      {/* Close Button */}
      {position.status === "open" && (
        <button
          onClick={() => onClose?.(position.id)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
        >
          Close Position
        </button>
      )}
    </div>
  );
}
