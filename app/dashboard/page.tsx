"use client";

import { useState, useEffect, useCallback } from "react";
import PositionCard from "@/components/margin/PositionCard";

interface Position {
  id: string; modal: number; leveragePercent: number; debtAmount: number; feeAmount: number;
  coinsPurchased: number; purchasePrice: number; liquidationPrice: number; safetyMargin: number;
  status: string; pnl: number;
  project: { tokenName: string; tokenSymbol: string; tokenPrice: number; contractAddress: string | null; };
}

export default function DashboardPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try { const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[]; setWalletAddress(accounts[0]); }
    catch (err) { console.error("Failed to connect:", err); }
  };

  const fetchPositions = useCallback(async () => {
    if (!walletAddress) return;
    try { const res = await fetch(`/api/margin/positions?walletAddress=${walletAddress}`); const data = await res.json(); if (data.success) setPositions(data.data); }
    catch (err) { console.error("Failed to fetch positions:", err); }
    finally { setLoading(false); }
  }, [walletAddress]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const handleClose = async (positionId: string) => {
    if (!walletAddress) return;
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;
    const currentPrice = Number(position.project.tokenPrice);
    try {
      const res = await fetch(`/api/margin/close/${positionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPrice, walletAddress }) });
      const data = await res.json();
      if (data.success) { alert(`Position closed! PnL: $${data.data.pnl.toFixed(2)}`); fetchPositions(); }
      else alert(`Error: ${data.error}`);
    } catch (err) { console.error("Failed to close position:", err); }
  };

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status !== "open");
  const totalModal = openPositions.reduce((s, p) => s + Number(p.modal), 0);
  const totalDebt = openPositions.reduce((s, p) => s + Number(p.debtAmount), 0);
  const positionsWithPrice = openPositions.map((p) => ({ ...p, currentPrice: Number(p.project.tokenPrice) }));

  if (!walletAddress) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted">Portfolio</p>
        <h1 className="mb-10 text-3xl font-bold">Dashboard</h1>
        <div className="glass p-14 text-center">
          <p className="mb-6 text-muted">Connect your wallet to view positions.</p>
          <button onClick={connectWallet} className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-white transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]">Connect Wallet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted">Portfolio</p>
      <h1 className="mb-10 text-3xl font-bold">Dashboard</h1>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Open Positions", value: openPositions.length.toString(), accent: "text-accent" },
          { label: "Total Collateral", value: `$${totalModal.toFixed(2)}` },
          { label: "Total Debt", value: `$${totalDebt.toFixed(2)}`, accent: "text-loss" },
          { label: "Wallet", value: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, mono: true },
        ].map((stat) => (
          <div key={stat.label} className="glass p-5">
            <div className="text-xs text-muted">{stat.label}</div>
            <div className={`mt-2 text-2xl font-bold ${stat.accent ?? ""} ${stat.mono ? "font-mono text-sm" : ""}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <section className="mb-12">
        <h2 className="mb-5 text-lg font-semibold">Open Positions</h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((i) => <div key={i} className="glass h-56 animate-pulse" />)}</div>
        ) : positionsWithPrice.length === 0 ? (
          <div className="glass p-10 text-center"><p className="text-sm text-muted">No open positions.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {positionsWithPrice.map((pos) => (
              <PositionCard key={pos.id} position={{ ...pos, tokenSymbol: pos.project.tokenSymbol, tokenName: pos.project.tokenName }} currentPrice={pos.currentPrice} onClose={handleClose} />
            ))}
          </div>
        )}
      </section>

      {closedPositions.length > 0 && (
        <section>
          <h2 className="mb-5 text-lg font-semibold">Position History</h2>
          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-edge">{["Token", "Collateral", "Lev", "PnL", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs text-muted">{h}</th>)}</tr></thead>
                <tbody>
                  {closedPositions.map((pos) => (
                    <tr key={pos.id} className="border-b border-edge/50">
                      <td className="px-4 py-3 font-medium">{pos.project.tokenSymbol}</td>
                      <td className="px-4 py-3 font-mono text-xs">${Number(pos.modal).toFixed(2)}</td>
                      <td className="px-4 py-3">{pos.leveragePercent}%</td>
                      <td className={`px-4 py-3 font-mono text-xs ${Number(pos.pnl) >= 0 ? "text-profit" : "text-loss"}`}>{Number(pos.pnl) >= 0 ? "+" : ""}{Number(pos.pnl).toFixed(2)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${pos.status === "liquidated" ? "bg-loss-subtle text-loss" : "bg-surface text-muted"}`}>{pos.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
