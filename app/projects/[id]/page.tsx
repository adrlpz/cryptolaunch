"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import MarginCalculator from "@/components/margin/MarginCalculator";
import WhitelistManager from "@/components/launch/WhitelistManager";
import BondingCurveWidget from "@/components/launch/BondingCurveWidget";
import { useWallet } from "@/lib/wallet-context";

interface PoolData {
  id: string;
  basePrice: number;
  slope: number;
  totalSold: number;
  totalRaised: number;
  graduationCap: number;
  isGraduated: boolean;
  currentReserveToken: number;
  dexPairAddress: string | null;
  dexName: string | null;
  currentPrice: number | null;
  graduationProgress: number;
}

interface Project {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string | null;
  tokenPrice: number;
  totalSupply: number;
  availableSupply: number;
  chain: string;
  maxLeveragePercent: number;
  lpStatus: string;
  status: string;
  launchDate: string;
  liquidityPool: PoolData | null;
  bondingCurveAddress?: string | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const { address } = useWallet();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [poolData, setPoolData] = useState<PoolData | null>(null);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch project:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchPoolData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pools/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setPoolData(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch pool data:", err);
    }
  }, [params.id]);

  useEffect(() => {
    fetchProject();
    fetchPoolData();
  }, [fetchProject, fetchPoolData]);

  const handleOpenPosition = async (modal: number, leverage: number) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      const res = await fetch("/api/margin/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          projectId: project?.id,
          modal,
          leveragePercent: leverage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Position opened! ID: ${data.data.id}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to open position");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-surface" />
          <div className="h-64 rounded-lg bg-surface" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-center">
        <p className="text-muted">Project not found.</p>
      </div>
    );
  }

  const soldPercent =
    ((Number(project.totalSupply) - Number(project.availableSupply)) /
      Number(project.totalSupply)) *
    100;

  const pool = poolData || project.liquidityPool;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-subtle font-display text-lg font-bold text-accent">
          {project.tokenSymbol[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            {project.chain.toUpperCase()}
          </p>
          <h1 className="font-display text-3xl font-bold">
            {project.tokenName}
            <span className="ml-2 text-lg text-muted">
              ${project.tokenSymbol}
            </span>
          </h1>
        </div>
        <span
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            project.status === "active"
              ? "bg-profit-subtle text-profit"
              : project.status === "upcoming"
                ? "bg-accent-subtle text-accent"
                : "bg-raised text-muted"
          }`}
        >
          {project.status.toUpperCase()}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-6 lg:col-span-2">
          {/* Token Info */}
          <div className="rounded-lg border border-edge bg-surface p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted">
              Token Info
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                [
                  "Contract",
                  project.contractAddress
                    ? `${project.contractAddress.slice(0, 10)}...${project.contractAddress.slice(-6)}`
                    : "Not deployed",
                  project.contractAddress ? "font-mono text-accent" : "text-muted",
                ],
                [
                  "Price",
                  `$${(pool?.currentPrice ?? Number(project.tokenPrice)).toFixed(6)}`,
                  "font-mono",
                ],
                [
                  "Total Supply",
                  Number(project.totalSupply).toLocaleString(),
                  "",
                ],
                [
                  "Available",
                  Number(project.availableSupply).toLocaleString(),
                  "",
                ],
                ["Max Leverage", `${project.maxLeveragePercent}%`, ""],
                ["LP Status", project.lpStatus, ""],
              ].map(([label, value, extra]) => (
                <div key={label as string}>
                  <div className="text-xs text-muted">{label}</div>
                  <div className={`mt-0.5 ${extra}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Supply bar */}
            <div className="mt-5 border-t border-edge pt-4">
              <div className="mb-2 flex justify-between text-xs text-muted">
                <span>Sold {soldPercent.toFixed(1)}%</span>
                <span>
                  {Number(project.availableSupply).toLocaleString()}{" "}
                  {project.tokenSymbol} remaining
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${soldPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bonding Curve Widget */}
          {pool && (
            <BondingCurveWidget
              projectId={project.id}
              tokenSymbol={project.tokenSymbol}
              tokenAddress={project.contractAddress ?? undefined}
              curveAddress={project.bondingCurveAddress ?? undefined}
              basePrice={Number(pool.basePrice)}
              slope={Number(pool.slope)}
              totalSold={Number(pool.totalSold)}
              totalRaised={Number(pool.totalRaised)}
              graduationCap={Number(pool.graduationCap)}
              currentPrice={pool.currentPrice ?? Number(project.tokenPrice)}
              isGraduated={pool.isGraduated}
              status={project.status}
              launchDate={project.launchDate}
              dexPairAddress={pool.dexPairAddress}
              maxTokens={Number(pool.currentReserveToken)}
              onBuy={() => {
                fetchProject();
                fetchPoolData();
              }}
              onSell={() => {
                fetchProject();
                fetchPoolData();
              }}
            />
          )}

          {/* Whitelist Manager */}
          <WhitelistManager projectId={project.id} />
        </div>

        {/* Right */}
        <div>
          <MarginCalculator
            tokenName={project.tokenName}
            tokenSymbol={project.tokenSymbol}
            tokenPrice={pool?.currentPrice ?? Number(project.tokenPrice)}
            maxLeverage={project.maxLeveragePercent}
            onOpenPosition={handleOpenPosition}
          />
        </div>
      </div>
    </div>
  );
}
