"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RevenueData {
  revenue: {
    marginFee: { open: number; historical: number; total: number };
    deployFee: number;
    platformFee: number;
    tradingFee: number;
    total: number;
  };
  insuranceFund: number;
  breakdown: {
    marginPercent: number;
    deployPercent: number;
    platformPercent: number;
    tradingPercent: number;
  };
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const res = await fetch("/api/admin/revenue");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error("Failed to fetch revenue:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRevenue();
  }, []);

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-purple-400 hover:underline">
          ← Back to Admin
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Revenue Report</h1>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-zinc-800" />
          <div className="h-64 rounded-xl bg-zinc-800" />
        </div>
      ) : data ? (
        <>
          {/* Total Revenue */}
          <div className="mb-8 rounded-xl border border-green-500/30 bg-green-500/5 p-8 text-center">
            <div className="text-sm text-zinc-500">Total Revenue</div>
            <div className="text-4xl font-bold text-green-400">
              {fmt(data.revenue.total)}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <RevenueCard
              label="Margin Fee"
              value={fmt(data.revenue.marginFee.total)}
              percent={data.breakdown.marginPercent}
              color="text-blue-400"
              bgColor="bg-blue-500/10"
              borderColor="border-blue-500/30"
            />
            <RevenueCard
              label="Platform Fee (Graduation)"
              value={fmt(data.revenue.platformFee)}
              percent={data.breakdown.platformPercent}
              color="text-purple-400"
              bgColor="bg-purple-500/10"
              borderColor="border-purple-500/30"
            />
            <RevenueCard
              label="Trading Fee (Bonding Curve)"
              value={fmt(data.revenue.tradingFee)}
              percent={data.breakdown.tradingPercent}
              color="text-cyan-400"
              bgColor="bg-cyan-500/10"
              borderColor="border-cyan-500/30"
            />
            <RevenueCard
              label="Deploy Fee"
              value={fmt(data.revenue.deployFee)}
              percent={data.breakdown.deployPercent}
              color="text-yellow-400"
              bgColor="bg-yellow-500/10"
              borderColor="border-yellow-500/30"
            />
          </div>

          {/* Revenue Bar Chart (simple) */}
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-bold">Revenue Distribution</h2>
            <div className="space-y-3">
              {[
                {
                  label: "Margin Fee",
                  percent: data.breakdown.marginPercent,
                  color: "bg-blue-500",
                },
                {
                  label: "Platform Fee",
                  percent: data.breakdown.platformPercent,
                  color: "bg-purple-500",
                },
                {
                  label: "Trading Fee",
                  percent: data.breakdown.tradingPercent,
                  color: "bg-cyan-500",
                },
                {
                  label: "Deploy Fee",
                  percent: data.breakdown.deployPercent,
                  color: "bg-yellow-500",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className="text-zinc-300">
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insurance Fund */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-bold">Insurance Fund</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-zinc-500">Estimated Fund</div>
                <div className="text-2xl font-bold text-blue-400">
                  {fmt(data.insuranceFund)}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Purpose</div>
                <p className="text-sm text-zinc-400">
                  Cover losses when liquidation cannot be executed in time.
                  Funded by 20% of all platform fees.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500">Failed to load revenue data.</p>
        </div>
      )}
    </div>
  );
}

function RevenueCard({
  label,
  value,
  percent,
  color,
  bgColor,
  borderColor,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-5`}
    >
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-zinc-500">
        {percent.toFixed(1)}% of total
      </div>
    </div>
  );
}
