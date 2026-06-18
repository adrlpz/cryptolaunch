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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-4 text-lg font-bold">Margin Calculator</h3>

      {/* Modal Input */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm text-zinc-400">
          Modal (USDT)
        </label>
        <input
          type="number"
          value={modal}
          onChange={(e) => setModal(Number(e.target.value) || 0)}
          min={1}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
          placeholder="100"
        />
      </div>

      {/* Leverage Selection */}
      <div className="mb-6">
        <label className="mb-1.5 block text-sm text-zinc-400">
          Leverage ({MARGIN_FEE_PERCENT}% fee on debt)
        </label>
        <div className="flex gap-2">
          {availableLevels.map((level) => (
            <button
              key={level}
              onClick={() => setLeverage(level)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                leverage === level
                  ? "bg-purple-500 text-white"
                  : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {level}%
            </button>
          ))}
        </div>
      </div>

      {/* Calculation Results */}
      <div className="mb-6 space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Hutang</span>
          <span className="text-white">${calc.debtAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">
            Fee ({MARGIN_FEE_PERCENT}% dari hutang)
          </span>
          <span className="text-red-400">-${calc.feeAmount.toFixed(2)}</span>
        </div>
        <div className="border-t border-zinc-700 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Modal setelah fee</span>
            <span className="text-white">
              ${calc.modalAfterFee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Total dana beli</span>
            <span className="font-medium text-green-400">
              ${calc.totalFunds.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="border-t border-zinc-700 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Jumlah {tokenSymbol}</span>
            <span className="text-white">
              {calc.coinsPurchased.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Harga beli</span>
            <span className="text-white">${tokenPrice.toFixed(6)}</span>
          </div>
        </div>
      </div>

      {/* Liquidation Info */}
      <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-400">
            Liquidation
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Harga likuidasi</span>
          <span className="text-red-400">
            ${calc.liquidationPrice.toFixed(6)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Max drop sebelum likuidasi</span>
          <span className="text-red-400">
            -{calc.maxDropPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* PnL Scenarios */}
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-medium text-zinc-400">
          Skenario PnL
        </h4>
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
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-center"
              >
                <div className="text-xs text-zinc-500">Jika {label}</div>
                <div
                  className={`text-sm font-bold ${
                    pnl >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {pnl >= 0 ? "+" : ""}
                  {pnl.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500">
                  ROI {roi >= 0 ? "+" : ""}
                  {roi.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open Position Button */}
      <button
        onClick={() => onOpenPosition?.(modal, leverage)}
        className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 py-3 font-medium text-white transition-opacity hover:opacity-90"
      >
        Open Position — ${modal} × {leverage}% Lev
      </button>
    </div>
  );
}
