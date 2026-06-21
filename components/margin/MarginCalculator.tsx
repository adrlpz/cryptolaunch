"use client";

import { useState, useMemo } from "react";
import { calculateMargin } from "@/lib/margin";
import { LEVERAGE_LEVELS, MARGIN_FEE_PERCENT } from "@/types";

interface MarginCalculatorProps {
  tokenName: string; tokenSymbol: string; tokenPrice: number;
  maxLeverage?: number; onOpenPosition?: (modal: number, leverage: number) => void;
}

export default function MarginCalculator({ tokenName, tokenSymbol, tokenPrice, maxLeverage = 50, onOpenPosition }: MarginCalculatorProps) {
  const [modal, setModal] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(50);
  const calc = useMemo(() => calculateMargin(modal, leverage, tokenPrice), [modal, leverage, tokenPrice]);
  const availableLevels = LEVERAGE_LEVELS.filter((l) => l <= maxLeverage);
  const lbl = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted";

  return (
    <div className="clay p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Margin Calculator</h2>

      <div className="mb-4">
        <label className={lbl}>Collateral (USDT)</label>
        <input type="number" value={modal} onChange={(e) => setModal(Number(e.target.value) || 0)} min={1} className="clay-inset w-full px-4 py-2.5 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-accent/30" placeholder="100" />
      </div>

      <div className="mb-5">
        <label className={lbl}>Leverage ({MARGIN_FEE_PERCENT}% fee on debt)</label>
        <div className="flex gap-1.5">
          {availableLevels.map((level) => (
            <button key={level} onClick={() => setLeverage(level)} className={`flex-1 rounded-2xl py-2 text-xs font-bold transition-all ${
              leverage === level ? "!bg-accent text-white shadow-md" : "clay-inset text-muted hover:text-foreground"
            }`}>{level}%</button>
          ))}
        </div>
      </div>

      <div className="clay-inset mb-5 p-4">
        {[
          ["Debt", `$${calc.debtAmount.toFixed(2)}`, "font-bold"],
          [`Fee (${MARGIN_FEE_PERCENT}%)`, `-$${calc.feeAmount.toFixed(2)}`, "font-bold text-loss"],
          ["After fee", `$${calc.modalAfterFee.toFixed(2)}`, "font-bold"],
          ["Total buying power", `$${calc.totalFunds.toFixed(2)}`, "font-bold text-profit"],
        ].map(([label, value, extra]) => (
          <div key={label} className="flex items-center justify-between border-b border-edge/30 py-2 text-xs last:border-0">
            <span className="font-semibold text-muted">{label}</span>
            <span className={`font-mono ${extra}`}>{value}</span>
          </div>
        ))}
        <div className="mt-2 pt-2">
          <div className="flex items-center justify-between py-1.5 text-xs"><span className="font-semibold text-muted">{tokenSymbol} amount</span><span className="font-mono font-bold">{calc.coinsPurchased.toFixed(2)}</span></div>
          <div className="flex items-center justify-between py-1.5 text-xs"><span className="font-semibold text-muted">Entry price</span><span className="font-mono font-bold">${tokenPrice.toFixed(6)}</span></div>
        </div>
      </div>

      <div className="clay-inset mb-5 border-2 border-loss/20 p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-loss" />
          <span className="text-xs font-bold text-loss">Liquidation</span>
        </div>
        {[["Price", `$${calc.liquidationPrice.toFixed(6)}`], ["Max drop", `-${calc.maxDropPercent.toFixed(2)}%`]].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-1 text-xs"><span className="font-semibold text-muted">{label}</span><span className="font-mono font-bold text-loss">{value}</span></div>
        ))}
      </div>

      <div className="mb-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">PnL Scenarios</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "+50%", factor: 1.5 },
            { label: "+100%", factor: 2.0 },
            { label: "-50%", factor: 0.5 },
          ].map(({ label, factor }) => {
            const pnl = calc.coinsPurchased * tokenPrice * factor - calc.debtAmount - calc.modal;
            const roi = (pnl / calc.modal) * 100;
            return (
              <div key={label} className="clay-inset p-3 text-center">
                <div className="text-xs font-semibold text-muted">If {label}</div>
                <div className={`mt-1 font-mono text-sm font-black ${pnl >= 0 ? "text-profit" : "text-loss"}`}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}</div>
                <div className="font-mono text-xs font-semibold text-muted">ROI {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => onOpenPosition?.(modal, leverage)} className="clay-sm w-full !bg-accent py-3 text-sm font-extrabold text-white transition-transform hover:scale-[1.01] active:scale-[0.99]">
        Open Position — ${modal} × {leverage}%
      </button>
    </div>
  );
}
