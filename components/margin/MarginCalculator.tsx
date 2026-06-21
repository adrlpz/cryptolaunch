"use client";

import { useState, useMemo } from "react";
import { calculateMargin } from "@/lib/margin";
import { LEVERAGE_LEVELS, MARGIN_FEE_PERCENT } from "@/types";

interface MarginCalculatorProps {
  tokenName: string;
  tokenSymbol: string;
  tokenPrice: number;
  maxLeverage?: number;
  onOpenPosition?: (modal: number, leverage: number) => void;
}

export default function MarginCalculator({
  tokenName,
  tokenSymbol,
  tokenPrice,
  maxLeverage = 50,
  onOpenPosition,
}: MarginCalculatorProps) {
  const [modal, setModal] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(50);

  const calc = useMemo(
    () => calculateMargin(modal, leverage, tokenPrice),
    [modal, leverage, tokenPrice]
  );

  const availableLevels = LEVERAGE_LEVELS.filter((l) => l <= maxLeverage);

  return (
    <div className="rounded-lg border border-edge bg-surface p-5">
      <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted">
        Margin Calculator
      </h2>

      {/* Modal input */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
          Collateral (USDT)
        </label>
        <input
          type="number"
          value={modal}
          onChange={(e) => setModal(Number(e.target.value) || 0)}
          min={1}
          className="w-full rounded-lg border border-edge bg-raised px-4 py-2.5 font-mono text-sm outline-none focus:border-accent"
          placeholder="100"
        />
      </div>

      {/* Leverage */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
          Leverage ({MARGIN_FEE_PERCENT}% fee on debt)
        </label>
        <div className="flex gap-1.5">
          {availableLevels.map((level) => (
            <button
              key={level}
              onClick={() => setLeverage(level)}
              className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
                leverage === level
                  ? "bg-accent text-background"
                  : "border border-edge bg-raised text-muted hover:text-foreground"
              }`}
            >
              {level}%
            </button>
          ))}
        </div>
      </div>

      {/* Calculation results */}
      <div className="mb-5 rounded-lg border border-edge bg-raised p-4">
        {[
          ["Debt", `$${calc.debtAmount.toFixed(2)}`],
          [`Fee (${MARGIN_FEE_PERCENT}%)`, `-$${calc.feeAmount.toFixed(2)}`, "text-loss"],
          ["After fee", `$${calc.modalAfterFee.toFixed(2)}`],
          ["Total buying power", `$${calc.totalFunds.toFixed(2)}`, "text-profit font-bold"],
        ].map(([label, value, extra]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-edge py-2 text-xs last:border-0"
          >
            <span className="text-muted">{label}</span>
            <span className={`font-mono ${extra ?? ""}`}>{value}</span>
          </div>
        ))}

        <div className="mt-2 border-t border-edge pt-2">
          {[
            [`${tokenSymbol} amount`, calc.coinsPurchased.toFixed(2)],
            ["Entry price", `$${tokenPrice.toFixed(6)}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between py-1.5 text-xs"
            >
              <span className="text-muted">{label}</span>
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Liquidation info */}
      <div className="mb-5 rounded-lg border border-loss/20 bg-loss-subtle p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-loss" />
          <span className="text-xs font-bold text-loss">Liquidation</span>
        </div>
        {[
          ["Price", `$${calc.liquidationPrice.toFixed(6)}`],
          ["Max drop", `-${calc.maxDropPercent.toFixed(2)}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between py-1 text-xs"
          >
            <span className="text-muted">{label}</span>
            <span className="font-mono text-loss">{value}</span>
          </div>
        ))}
      </div>

      {/* PnL scenarios */}
      <div className="mb-5">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          PnL Scenarios
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "+50%", factor: 1.5 },
            { label: "+100%", factor: 2.0 },
            { label: "-50%", factor: 0.5 },
          ].map(({ label, factor }) => {
            const futurePrice = tokenPrice * factor;
            const futureValue = calc.coinsPurchased * futurePrice;
            const pnl = futureValue - calc.debtAmount - calc.modal;
            const roi = (pnl / calc.modal) * 100;

            return (
              <div
                key={label}
                className="rounded-lg border border-edge bg-raised p-3 text-center"
              >
                <div className="text-xs text-muted">If {label}</div>
                <div
                  className={`mt-1 font-mono text-sm font-bold ${
                    pnl >= 0 ? "text-profit" : "text-loss"
                  }`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(2)}
                </div>
                <div className="font-mono text-xs text-muted">
                  ROI {roi >= 0 ? "+" : ""}
                  {roi.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onOpenPosition?.(modal, leverage)}
        className="w-full rounded-lg bg-accent py-3 font-display text-sm font-bold text-background transition-opacity hover:opacity-90"
      >
        Open Position — ${modal} × {leverage}%
      </button>
    </div>
  );
}
