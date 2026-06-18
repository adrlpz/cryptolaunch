"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface Project {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  tokenPrice: number;
  totalSupply: number;
  availableSupply: number;
  chain: string;
  status: string;
  launchDate: string;
  maxLeveragePercent: number;
  lpStatus: string;
}

type SortKey = "newest" | "price-asc" | "price-desc" | "supply-sold";
type FilterStatus = "all" | "upcoming" | "active" | "ended";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [filterChain, setFilterChain] = useState<string>("all");

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (data.success) {
          setProjects(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const chains = useMemo(() => {
    const set = new Set(projects.map((p) => p.chain));
    return ["all", ...Array.from(set)];
  }, [projects]);

  const filtered = useMemo(() => {
    let result = [...projects];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.tokenName.toLowerCase().includes(q) ||
          p.tokenSymbol.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((p) => p.status === filterStatus);
    }

    // Chain filter
    if (filterChain !== "all") {
      result = result.filter((p) => p.chain === filterChain);
    }

    // Sort
    switch (sortKey) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime()
        );
        break;
      case "price-asc":
        result.sort(
          (a, b) => Number(a.tokenPrice) - Number(b.tokenPrice)
        );
        break;
      case "price-desc":
        result.sort(
          (a, b) => Number(b.tokenPrice) - Number(a.tokenPrice)
        );
        break;
      case "supply-sold":
        result.sort((a, b) => {
          const soldA =
            (Number(a.totalSupply) - Number(a.availableSupply)) /
            Number(a.totalSupply);
          const soldB =
            (Number(b.totalSupply) - Number(b.availableSupply)) /
            Number(b.totalSupply);
          return soldB - soldA;
        });
        break;
    }

    return result;
  }, [projects, search, filterStatus, filterChain, sortKey]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Link
          href="/launch"
          className="rounded-full bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Launch Token
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white outline-none focus:border-purple-500"
          />
        </div>

        {/* Status */}
        <div className="flex gap-2">
          {(["all", "upcoming", "active", "ended"] as FilterStatus[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-purple-500 text-white"
                    : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>

        {/* Chain */}
        <select
          value={filterChain}
          onChange={(e) => setFilterChain(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none"
        >
          {chains.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Chains" : c.toUpperCase()}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="supply-sold">Most Sold</option>
        </select>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-zinc-500">
        {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
      </div>

      {/* Project List */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-zinc-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">
            {search || filterStatus !== "all" || filterChain !== "all"
              ? "No projects match your filters."
              : "No projects yet. Be the first to "}
            {!search && filterStatus === "all" && filterChain === "all" && (
              <Link
                href="/launch"
                className="text-purple-400 hover:underline"
              >
                launch a token
              </Link>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((project) => {
            const soldPercent =
              ((Number(project.totalSupply) -
                Number(project.availableSupply)) /
                Number(project.totalSupply)) *
              100;

            const timeToLaunch =
              new Date(project.launchDate).getTime() - Date.now();
            const isUpcoming =
              project.status === "upcoming" && timeToLaunch > 0;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 font-bold">
                      {project.tokenSymbol[0]}
                    </div>
                    <div>
                      <h3 className="font-bold">{project.tokenName}</h3>
                      <p className="text-sm text-zinc-500">
                        ${project.tokenSymbol} • {project.chain.toUpperCase()} •
                        Max Lev {project.maxLeveragePercent}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      ${Number(project.tokenPrice).toFixed(6)}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {soldPercent.toFixed(1)}% sold
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        project.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : project.status === "upcoming"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-zinc-500/20 text-zinc-400"
                      }`}
                    >
                      {project.status}
                    </span>
                    {isUpcoming && (
                      <span className="text-xs text-zinc-500">
                        {Math.ceil(timeToLaunch / (1000 * 60 * 60 * 24))}d to
                        launch
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                      style={{ width: `${soldPercent}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
