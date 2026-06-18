"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AdminProject {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string | null;
  tokenPrice: number;
  totalSupply: number;
  availableSupply: number;
  chain: string;
  status: string;
  lpStatus: string;
  maxLeveragePercent: number;
  soldPercent: number;
  positionCount: number;
  createdAt: string;
  launchDate: string;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/admin/projects");
        const data = await res.json();
        if (data.success) setProjects(data.data);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-purple-400 hover:underline">
            ← Back to Admin
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Project Management</h1>
        </div>
        <div className="text-sm text-zinc-500">
          {projects.length} projects total
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-zinc-500">Token</th>
                <th className="px-4 py-3 text-left text-zinc-500">Chain</th>
                <th className="px-4 py-3 text-left text-zinc-500">Price</th>
                <th className="px-4 py-3 text-left text-zinc-500">Sold</th>
                <th className="px-4 py-3 text-left text-zinc-500">Positions</th>
                <th className="px-4 py-3 text-left text-zinc-500">LP Status</th>
                <th className="px-4 py-3 text-left text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium hover:text-purple-400"
                    >
                      {p.tokenName}
                      <span className="ml-1 text-zinc-500">
                        ${p.tokenSymbol}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {p.chain.toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    ${Number(p.tokenPrice).toFixed(6)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${p.soldPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">
                        {p.soldPercent.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.positionCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.lpStatus === "graduated"
                          ? "bg-green-500/20 text-green-400"
                          : p.lpStatus === "bonding"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-zinc-500/20 text-zinc-400"
                      }`}
                    >
                      {p.lpStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={(e) =>
                        handleStatusChange(p.id, e.target.value)
                      }
                      className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="ended">Ended</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-xs text-purple-400 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
