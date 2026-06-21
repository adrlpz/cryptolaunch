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
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <Link href="/admin" className="text-xs text-accent hover:underline">
          ← Admin
        </Link>
        <p className="mb-1 mt-2 font-mono text-xs uppercase tracking-wider text-muted">
          Management
        </p>
        <div className="flex items-end justify-between">
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <span className="text-xs text-muted">{projects.length} total</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-edge">
          <table className="w-full text-sm">
            <thead className="border-b border-edge bg-surface">
              <tr>
                {["Token", "Chain", "Price", "Sold", "Positions", "LP", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-edge/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {p.tokenName}
                      <span className="ml-1 text-muted">${p.tokenSymbol}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {p.chain.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    ${Number(p.tokenPrice).toFixed(6)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-12 overflow-hidden rounded-full bg-raised">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${p.soldPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">
                        {p.soldPercent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.positionCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        p.lpStatus === "graduated"
                          ? "bg-profit-subtle text-profit"
                          : p.lpStatus === "bonding"
                            ? "bg-accent-subtle text-accent"
                            : "bg-raised text-muted"
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
                      className="rounded border border-edge bg-raised px-2 py-1 text-xs outline-none"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="ended">Ended</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-xs text-accent hover:underline"
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
