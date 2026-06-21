"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AdminData {
  overview: { totalUsers: number; totalProjects: number; activeProjects: number; openPositions: number; totalLiquidations: number; };
  financials: { totalExposure: number; totalModal: number; marginFeeRevenue: number; platformFeeFromGraduation: number; estimatedInsuranceFund: number; };
}

interface RiskData {
  risk: { totalOpenPositions: number; totalExposure: number; totalModal: number; averageLeverage: number; positionsAtRisk: number; };
  warnings: { positionId: string; tokenSymbol: string; currentPrice: number; liquidationPrice: number; distancePercent: number; }[];
}

export default function AdminPage() {
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [adminRes, riskRes] = await Promise.all([fetch("/api/admin/dashboard"), fetch("/api/admin/risk")]);
        const admin = await adminRes.json(); const risk = await riskRes.json();
        if (admin.success) setAdminData(admin.data);
        if (risk.success) setRiskData(risk.data);
      } catch (err) { console.error("Failed to fetch admin data:", err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-10"><div className="animate-pulse space-y-4"><div className="glass h-8 w-48" /><div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="glass h-20" />)}</div></div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted">Control</p>
          <h1 className="text-3xl font-bold">Admin</h1>
        </div>
        <div className="flex gap-2">
          {[["Projects", "/admin/projects"], ["Users", "/admin/users"], ["Revenue", "/admin/revenue"]].map(([label, href]) => (
            <Link key={href} href={href} className="glass !rounded-lg px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground">{label}</Link>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Users", value: adminData?.overview.totalUsers || 0 },
          { label: "Active / Total", value: `${adminData?.overview.activeProjects || 0} / ${adminData?.overview.totalProjects || 0}` },
          { label: "Open Positions", value: adminData?.overview.openPositions || 0 },
          { label: "Exposure", value: `$${(adminData?.financials.totalExposure || 0).toFixed(0)}`, accent: "text-loss" },
          { label: "Liquidations", value: adminData?.overview.totalLiquidations || 0 },
        ].map((stat) => (
          <div key={stat.label} className="glass p-4">
            <div className="text-xs text-muted">{stat.label}</div>
            <div className={`mt-1 text-xl font-bold ${stat.accent ?? ""}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass mb-6 p-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted">Financials</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            ["Margin Fee Revenue", `$${(adminData?.financials.marginFeeRevenue || 0).toFixed(2)}`, "text-profit"],
            ["Platform Fee", `$${(adminData?.financials.platformFeeFromGraduation || 0).toFixed(2)}`, "text-profit"],
            ["Insurance Fund", `$${(adminData?.financials.estimatedInsuranceFund || 0).toFixed(2)}`, ""],
            ["Collateral Locked", `$${(adminData?.financials.totalModal || 0).toFixed(2)}`, ""],
          ].map(([label, value, color]) => (
            <div key={label}><div className="text-xs text-muted">{label}</div><div className={`mt-1 font-mono text-lg font-bold ${color}`}>{value}</div></div>
          ))}
        </div>
      </div>

      <div className="glass-glow mb-6 p-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-muted">
          Risk Monitor
          {riskData && riskData.risk.positionsAtRisk > 0 && <span className="ml-2 rounded-full bg-loss/10 px-2 py-0.5 text-xs text-loss">{riskData.risk.positionsAtRisk} at risk</span>}
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {[
            ["Avg Leverage", `${(riskData?.risk.averageLeverage || 0).toFixed(1)}%`],
            ["At Risk (≤20%)", riskData?.risk.positionsAtRisk || 0, "text-loss"],
            ["Total Exposure", `$${(riskData?.risk.totalExposure || 0).toFixed(0)}`],
          ].map(([label, value, color]) => (
            <div key={label}><div className="text-xs text-muted">{label}</div><div className={`mt-1 font-mono text-lg font-bold ${color ?? ""}`}>{value}</div></div>
          ))}
        </div>
      </div>

      {riskData && riskData.warnings.length > 0 && (
        <div className="glass-glow !border-loss/30 p-5">
          <h2 className="mb-3 text-sm font-semibold text-loss">Liquidation Warnings</h2>
          <div className="space-y-2">
            {riskData.warnings.map((w) => (
              <div key={w.positionId} className="glass flex items-center justify-between px-4 py-3">
                <div><span className="font-medium">{w.tokenSymbol}</span><span className="ml-2 text-xs text-muted">#{w.positionId.slice(0, 8)}</span></div>
                <div className="text-right"><div className="font-mono text-xs text-muted">${w.currentPrice.toFixed(6)} → ${w.liquidationPrice.toFixed(6)}</div><div className="font-mono text-xs text-loss">{w.distancePercent.toFixed(1)}% to liquidation</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
