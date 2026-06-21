"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RevenueData {
  revenue: { marginFee: { open: number; historical: number; total: number }; deployFee: number; platformFee: number; tradingFee: number; total: number; };
  insuranceFund: number;
  breakdown: { marginPercent: number; deployPercent: number; platformPercent: number; tradingPercent: number; };
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try { const res = await fetch("/api/admin/revenue"); const json = await res.json(); if (json.success) setData(json.data); }
      catch (err) { console.error("Failed to fetch revenue:", err); }
      finally { setLoading(false); }
    }
    fetchRevenue();
  }, []);

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <Link href="/admin" className="text-xs font-bold text-accent hover:underline">← Admin</Link>
        <p className="mb-1 mt-2 font-mono text-xs uppercase tracking-wider text-muted">Analytics</p>
        <h1 className="text-3xl font-black">Revenue Report</h1>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4"><div className="clay h-28" /><div className="clay h-56" /></div>
      ) : data ? (
        <>
          <div className="clay border-2 border-profit/30 mb-6 p-6 text-center">
            <div className="text-xs font-semibold text-muted">Total Revenue</div>
            <div className="mt-1 font-mono text-4xl font-black text-profit">{fmt(data.revenue.total)}</div>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Margin Fee", value: fmt(data.revenue.marginFee.total), pct: data.breakdown.marginPercent, color: "text-accent" },
              { label: "Platform Fee", value: fmt(data.revenue.platformFee), pct: data.breakdown.platformPercent, color: "text-profit" },
              { label: "Trading Fee", value: fmt(data.revenue.tradingFee), pct: data.breakdown.tradingPercent, color: "text-foreground" },
              { label: "Deploy Fee", value: fmt(data.revenue.deployFee), pct: data.breakdown.deployPercent, color: "text-muted" },
            ].map((card) => (
              <div key={card.label} className="clay p-5">
                <div className="text-xs font-semibold text-muted">{card.label}</div>
                <div className={`mt-1 font-mono text-2xl font-black ${card.color}`}>{card.value}</div>
                <div className="mt-1 text-xs font-semibold text-muted">{card.pct.toFixed(1)}% of total</div>
              </div>
            ))}
          </div>

          <div className="clay mb-6 p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Distribution</h2>
            <div className="space-y-3">
              {[
                { label: "Margin Fee", pct: data.breakdown.marginPercent },
                { label: "Platform Fee", pct: data.breakdown.platformPercent },
                { label: "Trading Fee", pct: data.breakdown.tradingPercent },
                { label: "Deploy Fee", pct: data.breakdown.deployPercent },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-muted">{item.label}</span><span className="font-mono font-bold">{item.pct.toFixed(1)}%</span></div>
                  <div className="clay-inset h-2.5 w-full overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, item.pct)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="clay p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Insurance Fund</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-muted">Estimated Fund</div>
                <div className="mt-1 font-mono text-2xl font-black">{fmt(data.insuranceFund)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Purpose</div>
                <p className="mt-1 text-sm font-semibold text-muted">Cover losses when liquidation cannot execute in time. Funded by 20% of platform fees.</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="clay p-8 text-center"><p className="text-sm font-semibold text-muted">Failed to load revenue data.</p></div>
      )}
    </div>
  );
}
