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
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-64 rounded bg-zinc-800" />
          <div className="h-64 rounded-xl bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-zinc-500">Project not found.</p>
      </div>
    );
  }

  const soldPercent =
    ((Number(project.totalSupply) - Number(project.availableSupply)) /
      Number(project.totalSupply)) *
    100;

  // Use pool data if available, fallback to project data
  const pool = poolData || project.liquidityPool;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-lg font-bold">
            {project.tokenSymbol[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{project.tokenName}</h1>
            <p className="text-zinc-400">
              ${project.tokenSymbol} • {project.chain.toUpperCase()}
            </p>
          </div>
          <span
            className={`ml-auto rounded-full px-4 py-1.5 text-sm font-medium ${
              project.status === "active"
                ? "bg-green-500/20 text-green-400"
                : project.status === "upcoming"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-zinc-500/20 text-zinc-400"
            }`}
          >
            {project.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Project Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Token Info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-bold">Token Info</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-zinc-500">Contract</div>
                <div className="font-mono text-purple-400">
                  {project.contractAddress
                    ? `${project.contractAddress.slice(0, 10)}...${project.contractAddress.slice(-6)}`
                    : "Not deployed"}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Price</div>
                <div className="text-white">
                  ${(pool?.currentPrice ?? Number(project.tokenPrice)).toFixed(6)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Total Supply</div>
                <div className="text-white">
                  {Number(project.totalSupply).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Available</div>
                <div className="text-white">
                  {Number(project.availableSupply).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Max Leverage</div>
                <div className="text-white">
                  {project.maxLeveragePercent}%
                </div>
              </div>
              <div>
                <div className="text-zinc-500">LP Status</div>
                <div className="text-white">{project.lpStatus}</div>
              </div>
            </div>

            {/* Supply Bar */}
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Sold: {soldPercent.toFixed(1)}%</span>
                <span>
                  Remaining:{" "}
                  {Number(project.availableSupply).toLocaleString()}{" "}
                  {project.tokenSymbol}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
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
              onBuy={() => { fetchProject(); fetchPoolData(); }}
              onSell={() => { fetchProject(); fetchPoolData(); }}
            />
          )}

          {/* Whitelist Manager */}
          <WhitelistManager projectId={project.id} />
        </div>

        {/* Right: Margin Calculator */}
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
