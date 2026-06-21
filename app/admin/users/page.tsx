"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface UserData {
  id: string;
  walletAddress: string;
  balance: number;
  totalMarginDebt: number;
  createdAt: string;
  _count: {
    marginPositions: number;
    tokenLaunches: number;
    liquidationLogs: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/users?limit=${limit}&offset=${page * limit}`
        );
        const data = await res.json();
        if (data.success) {
          setUsers(data.data.users);
          setTotal(data.data.total);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [page]);

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const totalPages = Math.ceil(total / limit);

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
          <h1 className="font-display text-3xl font-bold">Users</h1>
          <span className="text-xs text-muted">{total} total</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-edge">
            <table className="w-full text-sm">
              <thead className="border-b border-edge bg-surface">
                <tr>
                  {["Wallet", "Balance", "Debt", "Positions", "Launches", "Liquidations", "Joined"].map(
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
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-edge/50">
                    <td className="px-4 py-3 font-mono text-sm">
                      {shortenAddress(user.walletAddress)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-profit">
                      ${Number(user.balance).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-loss">
                      ${Number(user.totalMarginDebt).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user._count.marginPositions}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user._count.tokenLaunches}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user._count.liquidationLogs > 0 ? (
                        <span className="rounded bg-loss-subtle px-2 py-0.5 text-xs text-loss">
                          {user._count.liquidationLogs}
                        </span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded border border-edge px-3 py-1.5 text-xs text-muted disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-muted">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border border-edge px-3 py-1.5 text-xs text-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
