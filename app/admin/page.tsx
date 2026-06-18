"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AdminData {
  overview: {
    totalUsers: number;
    totalProjects: number;
    activeProjects: number;
    openPositions: number;
    totalLiquidations: number;
  };
  financials: {
    totalExposure: number;
    totalModal: number;
    marginFeeRevenue: number;
    platformFeeFromGraduation: number;
    estimatedInsuranceFund: number;
  };
}

interface RiskData {
  risk: {
    totalOpenPositions: number;
    totalExposure: number;
    totalModal: number;
    averageLeverage: number;
    positionsAtRisk: number;
  };
  warnings: {
    positionId: string;
    tokenSymbol: string;
    currentPrice: number;
    liquidationPrice: number;
    distancePercent: number;
  }[];
}

export default function AdminPage() {
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [adminRes, riskRes] = await Promise.all([
          fetch("/api/admin/dashboard"),
          fetch("/api/admin/risk"),
        ]);

        const admin = await adminRes.json();
        const risk = await riskRes.json();

        if (admin.success) setAdminData(admin.data);
        if (risk.success) setRiskData(risk.data);
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-zinc-800" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Admin Dashboard</h1>

      {/* Navigation */}
      <div className="mb-8 flex gap-4">
        <Link
          href="/admin/projects"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-purple-500 hover:text-white"
        >
          Manage Projects
        </Link>
        <Link
          href="/admin/users"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-purple-500 hover:text-white"
        >
          Manage Users
        </Link>
        <Link
          href="/admin/revenue"
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-purple-500 hover:text-white"
        >
          Revenue Report
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          label="Users"
          value={adminData?.overview.totalUsers || 0}
          color="text-blue-400"
        />
        <StatCard
          label="Projects"
          value={adminData?.overview.activeProjects || 0}
          suffix={`/ ${adminData?.overview.totalProjects || 0}`}
          color="text-purple-400"
        />
        <StatCard
          label="Open Positions"
          value={adminData?.overview.openPositions || 0}
          color="text-green-400"
        />
        <StatCard
          label="Total Exposure"
          value={`$${(adminData?.financials.totalExposure || 0).toFixed(0)}`}
          color="text-red-400"
        />
        <StatCard
          label="Liquidations"
          value={adminData?.overview.totalLiquidations || 0}
          color="text-yellow-400"
        />
      </div>

      {/* Financial Overview */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-bold">Financial Overview</h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div>
            <div className="text-sm text-zinc-500">Margin Fee Revenue</div>
            <div className="text-xl font-bold text-green-400">
              ${(adminData?.financials.marginFeeRevenue || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Platform Fee (Graduation)</div>
            <div className="text-xl font-bold text-green-400">
              ${(adminData?.financials.platformFeeFromGraduation || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Insurance Fund (est)</div>
            <div className="text-xl font-bold text-blue-400">
              ${(adminData?.financials.estimatedInsuranceFund || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Total Modal Locked</div>
            <div className="text-xl font-bold text-white">
              ${(adminData?.financials.totalModal || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Risk Section */}
      <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 text-lg font-bold">
          Risk Monitor
          {riskData && riskData.risk.positionsAtRisk > 0 && (
            <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              {riskData.risk.positionsAtRisk} at risk
            </span>
          )}
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-zinc-500">Avg Leverage</div>
            <div className="text-xl font-bold">
              {(riskData?.risk.averageLeverage || 0).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Positions at Risk (≤20%)</div>
            <div className="text-xl font-bold text-red-400">
              {riskData?.risk.positionsAtRisk || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-zinc-500">Total Exposure</div>
            <div className="text-xl font-bold">
              ${(riskData?.risk.totalExposure || 0).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Liquidation Warnings */}
      {riskData && riskData.warnings.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <h2 className="mb-4 text-lg font-bold text-red-400">
            ⚠️ Liquidation Warnings
          </h2>
          <div className="space-y-3">
            {riskData.warnings.map((w) => (
              <div
                key={w.positionId}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div>
                  <span className="font-bold">{w.tokenSymbol}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    Position #{w.positionId.slice(0, 8)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400">
                    Current: ${w.currentPrice.toFixed(6)} → Liq: $
                    {w.liquidationPrice.toFixed(6)}
                  </div>
                  <div className="text-sm font-medium text-red-400">
                    {w.distancePercent.toFixed(1)}% to liquidation
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  color = "text-white",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
        {suffix && <span className="text-sm text-zinc-500"> {suffix}</span>}
      </div>
    </div>
  );
}
