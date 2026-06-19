"use client";

import { useState, useMemo, useCallback } from "react";
import { ethers } from "ethers";
import { BONDING_CURVE_ABI } from "@/lib/bonding-curve-abi";

interface BondingCurveWidgetProps {
  projectId: string;
  tokenSymbol: string;
  tokenAddress?: string;
  curveAddress?: string;
  basePrice: number;
  slope: number;
  totalSold: number;
  totalRaised: number;
  graduationCap: number;
  currentPrice: number;
  isGraduated: boolean;
  dexPairAddress?: string | null;
  maxTokens: number;
  onBuy?: (ethAmount: number) => void;
  onSell?: (tokenAmount: number) => void;
}

export default function BondingCurveWidget({
  projectId,
  tokenSymbol,
  tokenAddress,
  curveAddress,
  basePrice,
  slope,
  totalSold,
  totalRaised,
  graduationCap,
  currentPrice,
  isGraduated,
  dexPairAddress,
  maxTokens,
  onBuy,
  onSell,
}: BondingCurveWidgetProps) {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [canGraduate, setCanGraduate] = useState(false);

  const preview = useMemo(() => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return null;

    if (mode === "buy") {
      const fee = numAmount * 0.01;
      const afterFee = numAmount - fee;
      const tokens = afterFee / currentPrice;
      return {
        input: `${numAmount} ETH`,
        output: `~${tokens.toFixed(2)} ${tokenSymbol}`,
        fee: `${fee.toFixed(4)} ETH`,
        priceImpact: slope > 0 ? `${((tokens * slope) / currentPrice * 100).toFixed(2)}%` : "0%",
      };
    } else {
      const ethOut = numAmount * currentPrice;
      const fee = ethOut * 0.01;
      const afterFee = ethOut - fee;
      return {
        input: `${numAmount} ${tokenSymbol}`,
        output: `~${afterFee.toFixed(4)} ETH`,
        fee: `${fee.toFixed(4)} ETH`,
        priceImpact: slope > 0 ? `${((numAmount * slope) / currentPrice * 100).toFixed(2)}%` : "0%",
      };
    }
  }, [amount, mode, currentPrice, slope, tokenSymbol]);

  const progress = graduationCap > 0
    ? Math.min(100, (totalRaised / graduationCap) * 100)
    : 0;

  // Check if can graduate (progress >= 100% and not yet graduated)
  const showGraduateButton = !isGraduated && progress >= 100 && curveAddress;

  // Sync trade to backend DB after on-chain tx
  const syncToBackend = useCallback(async (ethAmount: number, tokenAmount: number) => {
    try {
      await fetch(`/api/pools/${projectId}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: (await new ethers.BrowserProvider(window.ethereum!).getSigner()).address,
          ethAmount,
        }),
      });
    } catch (err) {
      console.warn("Failed to sync to backend:", err);
    }
    // Trigger parent refresh
    onBuy?.(tokenAmount);
  }, [projectId, onBuy]);

  // On-chain buy via wallet
  const handleOnChainBuy = useCallback(async () => {
    if (!curveAddress) {
      console.error("No curve address");
      setTxStatus("error");
      return;
    }
    if (!window.ethereum) {
      alert("Please install MetaMask to buy tokens on-chain");
      setTxStatus("error");
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    try {
      setTxStatus("pending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(curveAddress, BONDING_CURVE_ABI, signer);

      const tx = await curve.buy({ value: ethers.parseEther(amount) });
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setTxStatus("success");
        // Parse TokenPurchased event for token amount
        const log = receipt.logs.find((l: ethers.Log) => {
          try { return curve.interface.parseLog(l)?.name === "TokenPurchased"; }
          catch { return false; }
        });
        const parsed = log ? curve.interface.parseLog(log) : null;
        const tokenOut = parsed ? Number(ethers.formatEther(parsed.args.tokensOut)) : 0;
        await syncToBackend(numAmount, tokenOut);
      } else {
        setTxStatus("error");
      }
    } catch (err: unknown) {
      console.error("Buy failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Buy failed: ${message.slice(0, 200)}`);
      setTxStatus("error");
    }
  }, [curveAddress, amount, syncToBackend]);

  // On-chain sell via wallet
  const handleOnChainSell = useCallback(async () => {
    if (!curveAddress) {
      console.error("No curve address");
      setTxStatus("error");
      return;
    }
    if (!window.ethereum) {
      alert("Please install MetaMask to sell tokens on-chain");
      setTxStatus("error");
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    try {
      setTxStatus("pending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(curveAddress, BONDING_CURVE_ABI, signer);

      // Approve tokens first
      const tokenContract = new ethers.Contract(
        await curve.token(),
        ["function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)"],
        signer
      );
      const allowance = await tokenContract.allowance(await signer.getAddress(), curveAddress);
      if (allowance < ethers.parseEther(amount)) {
        const approveTx = await tokenContract.approve(curveAddress, ethers.MaxUint256);
        await approveTx.wait();
      }

      const tx = await curve.sell(ethers.parseEther(amount));
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setTxStatus("success");
        // Sync to backend
        try {
          await fetch(`/api/pools/${projectId}/sell`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: await signer.getAddress(),
              tokenAmount: numAmount,
            }),
          });
        } catch (e) { console.warn("Sync failed:", e); }
        onSell?.(numAmount);
      } else {
        setTxStatus("error");
      }
    } catch (err: unknown) {
      console.error("Sell failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`Sell failed: ${message.slice(0, 200)}`);
      setTxStatus("error");
    }
  }, [curveAddress, amount, projectId, onSell]);

  // Graduate to DEX (owner only)
  const handleGraduate = useCallback(async () => {
    if (!curveAddress || !window.ethereum) return;

    try {
      setTxStatus("pending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(curveAddress, BONDING_CURVE_ABI, signer);

      const tx = await curve.graduateToDEX();
      setTxHash(tx.hash);

      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setTxStatus("success");
        // Confirm with backend
        await fetch(`/api/pools/${projectId}/graduate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash: receipt.hash,
            walletAddress: await signer.getAddress(),
          }),
        });
      } else {
        setTxStatus("error");
      }
    } catch (err) {
      console.error("Graduation failed:", err);
      setTxStatus("error");
    }
  }, [curveAddress, projectId]);

  const handleSubmit = () => {
    if (!curveAddress) {
      // Fallback to API simulation
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) return;
      if (mode === "buy") onBuy?.(numAmount);
      else onSell?.(numAmount);
      return;
    }
    // On-chain transaction
    if (mode === "buy") handleOnChainBuy();
    else handleOnChainSell();
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-4 text-lg font-bold">Bonding Curve</h3>

      {/* Price & Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-center">
          <div className="text-xs text-zinc-500">Current Price</div>
          <div className="text-lg font-bold text-purple-400">
            ${currentPrice.toFixed(6)}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-center">
          <div className="text-xs text-zinc-500">Total Sold</div>
          <div className="text-lg font-bold">
            {Number(totalSold).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Graduation Progress */}
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-zinc-500">Graduation Progress</span>
          <span className={progress >= 100 ? "text-green-400" : "text-purple-400"}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${
              progress >= 100
                ? "bg-green-500"
                : "bg-gradient-to-r from-purple-500 to-blue-500"
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-zinc-500">
          <span>{Number(totalRaised).toLocaleString()} raised</span>
          <span>{Number(graduationCap).toLocaleString()} cap</span>
        </div>
      </div>

      {/* Graduate to DEX button (when cap reached but not yet graduated) */}
      {showGraduateButton && (
        <div className="mb-4">
          <button
            onClick={handleGraduate}
            disabled={txStatus === "pending"}
            className="w-full rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {txStatus === "pending" ? "Graduating..." : "🎓 Graduate to DEX"}
          </button>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Graduation cap reached! Add liquidity to Uniswap and burn LP tokens.
          </p>
        </div>
      )}

      {isGraduated ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
            <div className="text-lg font-bold text-green-400">
              🎉 Graduated!
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Token is now trading on Uniswap V2. Liquidity permanently locked.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={`https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-center font-medium text-white transition-opacity hover:opacity-90"
            >
              Trade on Uniswap
            </a>
            {dexPairAddress && (
              <a
                href={`https://app.uniswap.org/pool/${dexPairAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg border border-zinc-700 py-3 text-center text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                View Pool
              </a>
            )}
          </div>
        </div>
      ) : !showGraduateButton ? (
        <>
          {/* Buy/Sell Toggle */}
          <div className="mb-4 flex rounded-lg border border-zinc-700 bg-zinc-800 p-1">
            <button
              onClick={() => { setMode("buy"); setTxStatus("idle"); setTxHash(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "buy"
                  ? "bg-green-500/20 text-green-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => { setMode("sell"); setTxStatus("idle"); setTxHash(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === "sell"
                  ? "bg-red-500/20 text-red-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Sell
            </button>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm text-zinc-400">
              {mode === "buy" ? "ETH Amount" : `${tokenSymbol} Amount`}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setTxStatus("idle"); setTxHash(null); }}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white outline-none focus:border-purple-500"
              placeholder={mode === "buy" ? "0.1" : "1000"}
              min={0}
              step={mode === "buy" ? 0.01 : 1}
            />
          </div>

          {/* Quick Amount Buttons */}
          {mode === "buy" && (
            <div className="mb-4 flex gap-2">
              {[0.01, 0.05, 0.1, 0.5].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v.toString())}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white"
                >
                  {v} ETH
                </button>
              ))}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="mb-4 space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">You pay</span>
                <span>{preview.input}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">You receive</span>
                <span className="text-green-400">{preview.output}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fee (1%)</span>
                <span className="text-red-400">{preview.fee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Price Impact</span>
                <span>{preview.priceImpact}</span>
              </div>
            </div>
          )}

          {/* TX Status */}
          {txStatus === "pending" && (
            <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
              ⏳ Transaction pending... {txHash && `(${txHash.slice(0, 10)}...)`}
            </div>
          )}
          {txStatus === "success" && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
              ✅ Transaction confirmed! {txHash && (
                <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  View on Etherscan
                </a>
              )}
            </div>
          )}
          {txStatus === "error" && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              ❌ Transaction failed. Please try again.
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0 || txStatus === "pending"}
            className={`w-full rounded-lg py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              mode === "buy"
                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                : "bg-gradient-to-r from-red-500 to-rose-600"
            }`}
          >
            {txStatus === "pending"
              ? "Confirming..."
              : mode === "buy"
                ? `Buy ${tokenSymbol}`
                : `Sell ${tokenSymbol}`}
          </button>
        </>
      ) : null}
    </div>
  );
}
