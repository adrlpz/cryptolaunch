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
  status?: string;
  launchDate?: string;
  dexPairAddress?: string | null;
  maxTokens: number;
  onBuy?: (ethAmount: number) => void;
  onSell?: (tokenAmount: number) => void;
}

export default function BondingCurveWidget({
  projectId, tokenSymbol, tokenAddress, curveAddress, basePrice, slope,
  totalSold, totalRaised, graduationCap, currentPrice, isGraduated,
  status, launchDate, dexPairAddress, maxTokens, onBuy, onSell,
}: BondingCurveWidgetProps) {
  const isUpcoming = status === "upcoming" && launchDate && new Date(launchDate) > new Date();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const preview = useMemo(() => {
    const n = Number(amount);
    if (!n || n <= 0) return null;
    if (mode === "buy") {
      const fee = n * 0.01; const afterFee = n - fee; const tokens = afterFee / currentPrice;
      return { input: `${n} ETH`, output: `~${tokens.toFixed(2)} ${tokenSymbol}`, fee: `${fee.toFixed(4)} ETH`, priceImpact: slope > 0 ? `${((tokens * slope) / currentPrice * 100).toFixed(2)}%` : "0%" };
    } else {
      const ethOut = n * currentPrice; const fee = ethOut * 0.01; const afterFee = ethOut - fee;
      return { input: `${n} ${tokenSymbol}`, output: `~${afterFee.toFixed(4)} ETH`, fee: `${fee.toFixed(4)} ETH`, priceImpact: slope > 0 ? `${((n * slope) / currentPrice * 100).toFixed(2)}%` : "0%" };
    }
  }, [amount, mode, currentPrice, slope, tokenSymbol]);

  const progress = graduationCap > 0 ? Math.min(100, (totalRaised / graduationCap) * 100) : 0;
  const showGraduateButton = !isGraduated && progress >= 100 && curveAddress;

  const syncToBackend = useCallback(async (ethAmount: number, tokenAmount: number) => {
    try {
      await fetch(`/api/pools/${projectId}/buy`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: (await new ethers.BrowserProvider(window.ethereum!).getSigner()).address, ethAmount }),
      });
    } catch (err) { console.warn("Failed to sync:", err); }
    onBuy?.(tokenAmount);
  }, [projectId, onBuy]);

  const handleOnChainBuy = useCallback(async () => {
    if (!curveAddress) { setTxStatus("error"); return; }
    if (!window.ethereum) { alert("Install MetaMask"); setTxStatus("error"); return; }
    const n = Number(amount); if (!n || n <= 0) return;
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
        const log = receipt.logs.find((l: ethers.Log) => { try { return curve.interface.parseLog(l)?.name === "TokenPurchased"; } catch { return false; } });
        const parsed = log ? curve.interface.parseLog(log) : null;
        const tokenOut = parsed ? Number(ethers.formatEther(parsed.args.tokensOut)) : 0;
        await syncToBackend(n, tokenOut);
      } else setTxStatus("error");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Buy failed: ${msg.slice(0, 200)}`); setTxStatus("error");
    }
  }, [curveAddress, amount, syncToBackend]);

  const handleOnChainSell = useCallback(async () => {
    if (!curveAddress) { setTxStatus("error"); return; }
    if (!window.ethereum) { alert("Install MetaMask"); setTxStatus("error"); return; }
    const n = Number(amount); if (!n || n <= 0) return;
    try {
      setTxStatus("pending");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const curve = new ethers.Contract(curveAddress, BONDING_CURVE_ABI, signer);
      const tokenContract = new ethers.Contract(await curve.token(), ["function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)"], signer);
      const allowance = await tokenContract.allowance(await signer.getAddress(), curveAddress);
      if (allowance < ethers.parseEther(amount)) { const tx = await tokenContract.approve(curveAddress, ethers.MaxUint256); await tx.wait(); }
      const tx = await curve.sell(ethers.parseEther(amount));
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setTxStatus("success");
        try { await fetch(`/api/pools/${projectId}/sell`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: await signer.getAddress(), tokenAmount: n }) }); } catch {}
        onSell?.(n);
      } else setTxStatus("error");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Sell failed: ${msg.slice(0, 200)}`); setTxStatus("error");
    }
  }, [curveAddress, amount, projectId, onSell]);

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
        await fetch(`/api/pools/${projectId}/graduate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ txHash: receipt.hash, walletAddress: await signer.getAddress() }) });
      } else setTxStatus("error");
    } catch { setTxStatus("error"); }
  }, [curveAddress, projectId]);

  const handleSubmit = () => {
    if (!curveAddress) { const n = Number(amount); if (!n || n <= 0) return; mode === "buy" ? onBuy?.(n) : onSell?.(n); return; }
    mode === "buy" ? handleOnChainBuy() : handleOnChainSell();
  };

  const fieldLabel = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted";

  return (
    <div className="clay p-5">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Bonding Curve</h2>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="clay-inset p-3">
          <div className="text-xs text-muted">Current Price</div>
          <div className="mt-1 font-mono text-lg font-extrabold text-accent">${currentPrice.toFixed(6)}</div>
        </div>
        <div className="clay-inset p-3">
          <div className="text-xs text-muted">Total Sold</div>
          <div className="mt-1 font-mono text-lg font-extrabold">{Number(totalSold).toLocaleString()}</div>
        </div>
      </div>

      {/* Graduation progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted">Graduation Progress</span>
          <span className={`font-mono font-bold ${progress >= 100 ? "text-profit" : "text-accent"}`}>{progress.toFixed(1)}%</span>
        </div>
        <div className="clay-inset h-2 w-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-profit" : "bg-accent"}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span className="font-mono">{Number(totalRaised).toLocaleString()} raised</span>
          <span className="font-mono">{Number(graduationCap).toLocaleString()} cap</span>
        </div>
      </div>

      {showGraduateButton && (
        <div className="mb-4">
          <button onClick={handleGraduate} disabled={txStatus === "pending"} className="clay-sm w-full bg-accent py-3 font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50">
            {txStatus === "pending" ? "Graduating..." : "Graduate to DEX"}
          </button>
          <p className="mt-2 text-center text-xs text-muted">Cap reached — add liquidity to Uniswap and burn LP tokens.</p>
        </div>
      )}

      {isUpcoming ? (
        <div className="clay-inset p-6 text-center">
          <div className="text-lg font-extrabold text-accent">Trading Not Started</div>
          <p className="mt-2 text-sm text-muted">
            Begins <span className="font-mono text-foreground">{new Date(launchDate!).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</span>
          </p>
        </div>
      ) : isGraduated ? (
        <div className="space-y-4">
          <div className="clay-inset border border-profit/30 p-4 text-center">
            <div className="text-lg font-extrabold text-profit">Graduated</div>
            <p className="mt-1 text-sm text-muted">Trading on Uniswap V2. Liquidity permanently locked.</p>
          </div>
          <div className="flex gap-3">
            <a href={`https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=${tokenAddress}`} target="_blank" rel="noopener noreferrer" className="clay-sm flex-1 bg-accent py-3 text-center text-sm font-bold text-background transition-opacity hover:opacity-90">
              Trade on Uniswap
            </a>
            {dexPairAddress && (
              <a href={`https://app.uniswap.org/pool/${dexPairAddress}`} target="_blank" rel="noopener noreferrer" className="clay-sm flex-1 py-3 text-center text-sm text-muted transition-colors hover:text-foreground">
                View Pool
              </a>
            )}
          </div>
        </div>
      ) : !showGraduateButton ? (
        <>
          {/* Buy/Sell toggle */}
          <div className="clay-inset mb-4 flex p-1">
            <button onClick={() => { setMode("buy"); setTxStatus("idle"); setTxHash(null); }} className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${mode === "buy" ? "bg-profit-subtle text-profit" : "text-muted hover:text-foreground"}`}>Buy</button>
            <button onClick={() => { setMode("sell"); setTxStatus("idle"); setTxHash(null); }} className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${mode === "sell" ? "bg-loss-subtle text-loss" : "text-muted hover:text-foreground"}`}>Sell</button>
          </div>

          <div className="mb-4">
            <label className={fieldLabel}>{mode === "buy" ? "ETH Amount" : `${tokenSymbol} Amount`}</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setTxStatus("idle"); setTxHash(null); }} className="clay-inset w-full px-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/40" placeholder={mode === "buy" ? "0.1" : "1000"} min={0} step={mode === "buy" ? 0.01 : 1} />
          </div>

          {mode === "buy" && (
            <div className="mb-4 flex gap-2">
              {[0.01, 0.05, 0.1, 0.5].map((v) => (
                <button key={v} onClick={() => setAmount(v.toString())} className="clay-inset flex-1 py-1.5 text-xs text-muted transition-colors hover:text-foreground">{v}</button>
              ))}
            </div>
          )}

          {preview && (
            <div className="clay-inset mb-4 space-y-1.5 p-3 text-xs">
              {[
                ["You pay", preview.input, ""],
                ["You receive", preview.output, "text-profit"],
                ["Fee (1%)", preview.fee, "text-loss"],
                ["Price Impact", preview.priceImpact, ""],
              ].map(([label, value, color]) => (
                <div key={label} className="flex justify-between"><span className="text-muted">{label}</span><span className={color}>{value}</span></div>
              ))}
            </div>
          )}

          {txStatus === "pending" && <div className="clay-sm mb-4 bg-accent-subtle p-3 text-xs text-accent">Transaction pending… {txHash && `(${txHash.slice(0, 10)}...)`}</div>}
          {txStatus === "success" && <div className="clay-sm mb-4 bg-profit-subtle p-3 text-xs text-profit">Confirmed. {txHash && <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">View tx</a>}</div>}
          {txStatus === "error" && <div className="clay-sm mb-4 bg-loss-subtle p-3 text-xs text-loss">Transaction failed. Try again.</div>}

          <button onClick={handleSubmit} disabled={!amount || Number(amount) <= 0 || txStatus === "pending"} className={`clay-sm w-full py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 ${mode === "buy" ? "bg-profit text-background" : "bg-loss text-white"}`}>
            {txStatus === "pending" ? "Confirming…" : mode === "buy" ? `Buy ${tokenSymbol}` : `Sell ${tokenSymbol}`}
          </button>
        </>
      ) : null}
    </div>
  );
}
