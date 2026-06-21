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

export default function PositionCard({ position, currentPrice, onClose }: PositionCardProps) {
  const status = useMemo(() => getPositionStatus(position, currentPrice), [position, currentPrice]);
  const isProfit = status.unrealizedPnl >= 0;
  const distanceColor = status.distanceToLiquidation > 30 ? "text-profit" : status.distanceToLiquidation > 10 ? "text-accent" : "text-loss";
  const barColor = status.distanceToLiquidation > 30 ? "bg-profit" : status.distanceToLiquidation > 10 ? "bg-accent" : "bg-loss";

  return (
    <div className="clay p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="font-extrabold">{position.tokenSymbol || "TOKEN"}</span>
          <span className="ml-2 text-xs text-muted">Lev {position.leveragePercent}%</span>
          <p className="text-xs text-muted">{position.tokenName}</p>
        </div>
        <span className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
          position.status === "open" ? "bg-profit-subtle text-profit" :
          position.status === "liquidated" ? "bg-loss-subtle text-loss" : "bg-raised text-muted"
        }`}>{position.status.toUpperCase()}</span>
      </div>

      <div className="mb-3">
        <div className={`font-mono text-2xl font-extrabold ${isProfit ? "text-profit" : "text-loss"}`}>
          {isProfit ? "+" : ""}{status.unrealizedPnl.toFixed(2)}<span className="ml-1 text-sm font-normal text-muted">USDT</span>
        </div>
        <div className={`font-mono text-xs ${isProfit ? "text-profit" : "text-loss"}`}>{isProfit ? "+" : ""}{status.pnlPercent.toFixed(2)}% ROI</div>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted">Distance to liquidation</span>
          <span className={`font-mono font-bold ${distanceColor}`}>{status.distanceToLiquidation.toFixed(1)}%</span>
        </div>
        <div className="clay-inset h-1.5 w-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, 100 - status.distanceToLiquidation))}%` }} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
        {[
          ["Collateral", `$${position.modal.toFixed(2)}`],
          ["Debt", `$${position.debtAmount.toFixed(2)}`],
          ["Coins", position.coinsPurchased.toFixed(2)],
          ["Entry Price", `$${position.purchasePrice.toFixed(6)}`],
          ["Current", `$${currentPrice.toFixed(6)}`],
          ["Liquidation", `$${position.liquidationPrice.toFixed(6)}`],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-muted">{label}</span>
            <span className={label === "Liquidation" ? "font-mono text-loss" : "font-mono"}>{value}</span>
          </div>
        ))}
      </div>

      {position.status === "open" && (
        <button onClick={() => onClose?.(position.id)} className="clay-sm w-full py-2.5 text-sm text-muted transition-colors hover:text-loss">
          Close Position
        </button>
      )}
    </div>
  );
}
