"use client";

import { useState, useEffect, useCallback } from "react";

interface WhitelistEntry {
  id: string;
  walletAddress: string;
  maxAllocation: number | null;
  addedBy: string | null;
  createdAt: string;
}

interface WhitelistManagerProps {
  projectId: string;
}

export default function WhitelistManager({ projectId }: WhitelistManagerProps) {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWallet, setNewWallet] = useState("");
  const [maxAllocation, setMaxAllocation] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchWhitelist = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/whitelist`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries);
      }
    } catch (err) {
      console.error("Failed to fetch whitelist:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchWhitelist();
  }, [fetchWhitelist]);

  const handleAdd = async () => {
    if (!newWallet) return;
    setError("");
    setAdding(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/whitelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: newWallet,
          maxAllocation: maxAllocation ? Number(maxAllocation) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewWallet("");
        setMaxAllocation("");
        fetchWhitelist();
      } else {
        setError(data.error || "Failed to add");
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (walletAddress: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/whitelist`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();
      if (data.success) {
        fetchWhitelist();
      }
    } catch (err) {
      console.error("Failed to remove:", err);
    }
  };

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-4 text-lg font-bold">
        Whitelist
        <span className="ml-2 text-sm font-normal text-zinc-500">
          ({entries.length} wallets)
        </span>
      </h3>

      {/* Add Form */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="0x... wallet address"
          value={newWallet}
          onChange={(e) => setNewWallet(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
        />
        <input
          type="number"
          placeholder="Max alloc (opt)"
          value={maxAllocation}
          onChange={(e) => setMaxAllocation(e.target.value)}
          className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newWallet}
          className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-zinc-800" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-6 text-center text-sm text-zinc-500">
          No wallets whitelisted yet.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-mono text-sm">
                  {shortenAddress(entry.walletAddress)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {entry.maxAllocation && (
                  <span className="text-xs text-zinc-500">
                    Max: {Number(entry.maxAllocation).toLocaleString()}
                  </span>
                )}
                <button
                  onClick={() => handleRemove(entry.walletAddress)}
                  className="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
