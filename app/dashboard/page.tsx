"use client";

import { useState, useEffect, useCallback } from "react";
import PositionCard from "@/components/margin/PositionCard";

interface Position {
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
  pnl: number;
  project: {
    tokenName: string;
    tokenSymbol: string;
    tokenPrice: number;
    contractAddress: string | null;
  };
}

export default function DashboardPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error("Failed to connect:", err);
    }
  };

  const fetchPositions = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const res = await fetch(
        `/api/margin/positions?walletAddress=${walletAddress}`
      );
      const data = await res.json();
      if (data.success) {
        setPositions(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch positions:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleClose = async (positionId: string) => {
    if (!walletAddress) return;
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;

    // For now, use purchase price as current price (mock)
    // In production, fetch real-time price from bonding curve or DEX
    const currentPrice = Number(position.project.tokenPrice);

    try {
      const res = await fetch(`/api/margin/close/${positionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPrice, walletAddress }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Position closed! PnL: $${data.data.pnl.toFixed(2)}`);
        fetchPositions();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to close position:", err);
    }
  };

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status !== "open");

  const totalModal = openPositions.reduce(
    (sum, p) => sum + Number(p.modal),
    0
  );
  const totalDebt = openPositions.reduce(
    (sum, p) => sum + Number(p.debtAmount),
    0
  );

  // Mock current prices (in production, fetch from API)
  const positionsWithPrice = openPositions.map((p) => ({
    ...p,
    currentPrice: Number(p.project.tokenPrice),
  }));

  if (!walletAddress) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="mb-4 text-zinc-500">
            Connect your wallet to view positions.
          </p>
          <button
            onClick={connectWallet}
            className="rounded-full bg-gradient-to-r from-purple-500 to-blue-600 px-8 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-sm text-zinc-500">Open Positions</div>
          <div className="text-2xl font-bold">{openPositions.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-sm text-zinc-500">Total Modal</div>
          <div className="text-2xl font-bold">${totalModal.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-sm text-zinc-500">Total Debt</div>
          <div className="text-2xl font-bold text-red-400">
            ${totalDebt.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="text-sm text-zinc-500">Wallet</div>
          <div className="truncate font-mono text-sm">
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">Open Positions</h2>
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-zinc-800" />
            ))}
          </div>
        ) : positionsWithPrice.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-zinc-500">No open positions.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {positionsWithPrice.map((pos) => (
              <PositionCard
                key={pos.id}
                position={{
                  ...pos,
                  tokenSymbol: pos.project.tokenSymbol,
                  tokenName: pos.project.tokenName,
                }}
                currentPrice={pos.currentPrice}
                onClose={handleClose}
              />
            ))}
          </div>
        )}
      </section>

      {/* Closed Positions */}
      {closedPositions.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Position History</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-zinc-500">Token</th>
                  <th className="px-4 py-3 text-left text-zinc-500">Modal</th>
                  <th className="px-4 py-3 text-left text-zinc-500">Lev</th>
                  <th className="px-4 py-3 text-left text-zinc-500">PnL</th>
                  <th className="px-4 py-3 text-left text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((pos) => (
                  <tr key={pos.id} className="border-b border-zinc-800/50">
                    <td className="px-4 py-3 font-medium">
                      {pos.project.tokenSymbol}
                    </td>
                    <td className="px-4 py-3">${Number(pos.modal).toFixed(2)}</td>
                    <td className="px-4 py-3">{pos.leveragePercent}%</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        Number(pos.pnl) >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {Number(pos.pnl) >= 0 ? "+" : ""}
                      {Number(pos.pnl).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          pos.status === "liquidated"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-zinc-500/20 text-zinc-400"
                        }`}
                      >
                        {pos.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
