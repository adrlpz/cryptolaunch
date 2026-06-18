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
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-purple-400 hover:underline">
          ← Back to Admin
        </Link>
        <h1 className="mt-2 text-3xl font-bold">User Management</h1>
        <p className="text-zinc-500">{total} users total</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-zinc-500">
                    Wallet
                  </th>
                  <th className="px-4 py-3 text-right text-zinc-500">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-right text-zinc-500">
                    Debt
                  </th>
                  <th className="px-4 py-3 text-center text-zinc-500">
                    Positions
                  </th>
                  <th className="px-4 py-3 text-center text-zinc-500">
                    Launches
                  </th>
                  <th className="px-4 py-3 text-center text-zinc-500">
                    Liquidations
                  </th>
                  <th className="px-4 py-3 text-left text-zinc-500">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-mono">
                      {shortenAddress(user.walletAddress)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      ${Number(user.balance).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
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
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          {user._count.liquidationLogs}
                        </span>
                      ) : (
                        <span className="text-zinc-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-zinc-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 disabled:opacity-50"
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
