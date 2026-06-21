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

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.tokenName.toLowerCase().includes(q) ||
          p.tokenSymbol.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter((p) => p.status === filterStatus);
    }

    if (filterChain !== "all") {
      result = result.filter((p) => p.chain === filterChain);
    }

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
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted">
            Browse
          </p>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
        </div>
        <Link
          href="/launch"
          className="rounded-lg bg-accent px-6 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          + Launch Token
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 border-b border-edge pb-6 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search name or symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-edge bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
        />

        <div className="flex gap-1.5">
          {(["all", "upcoming", "active", "ended"] as FilterStatus[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-accent text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>

        <select
          value={filterChain}
          onChange={(e) => setFilterChain(e.target.value)}
          className="rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm outline-none"
        >
          {chains.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Chains" : c.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm outline-none"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price low → high</option>
          <option value="price-desc">Price high → low</option>
          <option value="supply-sold">Most Sold</option>
        </select>
      </div>

      {/* Results */}
      <p className="mb-4 text-xs text-muted">
        {filtered.length} project{filtered.length !== 1 ? "s" : ""}
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-edge rounded-lg p-12 text-center">
          <p className="text-muted">
            {search || filterStatus !== "all" || filterChain !== "all"
              ? "No projects match your filters."
              : "No projects yet."}
          </p>
          {!search && filterStatus === "all" && filterChain === "all" && (
            <Link
              href="/launch"
              className="mt-3 inline-block text-sm text-accent hover:underline"
            >
              Be the first to launch →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-1">
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
                className="group flex items-center gap-4 border-b border-edge py-4 transition-colors hover:bg-surface/50 px-3 -mx-3 rounded-lg"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle font-display text-sm font-bold text-accent">
                  {project.tokenSymbol[0]}
                </div>

                {/* Name + meta */}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {project.tokenName}
                  </div>
                  <div className="text-xs text-muted">
                    ${project.tokenSymbol} · {project.chain.toUpperCase()} · max lev {project.maxLeveragePercent}%
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="hidden w-24 sm:block">
                  <div className="mb-1 text-right text-xs text-muted">
                    {soldPercent.toFixed(0)}%
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-edge">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${soldPercent}%` }}
                    />
                  </div>
                </div>

                {/* Price */}
                <div className="w-24 text-right font-mono text-sm">
                  ${Number(project.tokenPrice).toFixed(6)}
                </div>

                {/* Status */}
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    project.status === "active"
                      ? "bg-profit-subtle text-profit"
                      : project.status === "upcoming"
                        ? "bg-accent-subtle text-accent"
                        : "bg-raised text-muted"
                  }`}
                >
                  {project.status}
                </span>

                {isUpcoming && (
                  <span className="text-xs text-muted">
                    {Math.ceil(timeToLaunch / (1000 * 60 * 60 * 24))}d
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
