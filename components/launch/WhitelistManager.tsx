"use client";

import { useState, useEffect, useCallback } from "react";

interface WhitelistEntry {
  id: string; walletAddress: string; maxAllocation: number | null; addedBy: string | null; createdAt: string;
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
    try { const res = await fetch(`/api/projects/${projectId}/whitelist`); const data = await res.json(); if (data.success) setEntries(data.data.entries); }
    catch (err) { console.error("Failed to fetch whitelist:", err); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchWhitelist(); }, [fetchWhitelist]);

  const handleAdd = async () => {
    if (!newWallet) return;
    setError(""); setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/whitelist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: newWallet, maxAllocation: maxAllocation ? Number(maxAllocation) : undefined }) });
      const data = await res.json();
      if (data.success) { setNewWallet(""); setMaxAllocation(""); fetchWhitelist(); }
      else setError(data.error || "Failed to add");
    } catch { setError("Network error"); }
    finally { setAdding(false); }
  };

  const handleRemove = async (walletAddress: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/whitelist`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress }) });
      const data = await res.json();
      if (data.success) fetchWhitelist();
    } catch (err) { console.error("Failed to remove:", err); }
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="brutal p-5">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Whitelist</h2>
        <span className="rounded-md border-2 border-edge px-2 py-0.5 text-xs font-bold text-muted">{entries.length}</span>
      </div>

      <div className="mb-4 flex gap-2">
        <input type="text" placeholder="0x… wallet address" value={newWallet} onChange={(e) => setNewWallet(e.target.value)} className="brutal-inset flex-1 px-3 py-2 font-mono text-sm outline-none focus:border-accent" />
        <input type="number" placeholder="Max alloc" value={maxAllocation} onChange={(e) => setMaxAllocation(e.target.value)} className="brutal-inset w-28 px-3 py-2 text-sm outline-none focus:border-accent" />
        <button onClick={handleAdd} disabled={adding || !newWallet} className="brutal-sm !bg-accent px-4 py-2 text-sm font-bold !text-background transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50">
          {adding ? "…" : "Add"}
        </button>
      </div>

      {error && <div className="brutal-sm mb-4 !border-loss bg-loss-subtle px-4 py-2 text-sm font-bold text-loss !shadow-none">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="brutal-inset h-10 animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <div className="brutal-inset p-6 text-center text-xs text-muted">No wallets whitelisted yet.</div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b border-edge/30 py-2.5 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-profit" />
                <span className="font-mono text-sm">{shortenAddress(entry.walletAddress)}</span>
              </div>
              <div className="flex items-center gap-3">
                {entry.maxAllocation && <span className="text-xs text-muted">max {Number(entry.maxAllocation).toLocaleString()}</span>}
                <button onClick={() => handleRemove(entry.walletAddress)} className="text-xs font-bold text-loss hover:underline">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
