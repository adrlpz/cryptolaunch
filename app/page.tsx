import Link from "next/link";

const STATS = [
  { label: "Total Projects", value: "—" },
  { label: "Total Volume", value: "—" },
  { label: "Active Positions", value: "—" },
  { label: "Total Users", value: "—" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-5xl font-bold leading-tight">
          Launch Tokens with{" "}
          <span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
            Margin Power
          </span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-zinc-400">
          Create your own token with bonding curve liquidity. Trade with
          leverage up to 50%. Vanity address ending in{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-purple-400">
            ...911
          </code>
          .
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/launch"
            className="rounded-full bg-gradient-to-r from-purple-500 to-blue-600 px-8 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Launch a Token
          </Link>
          <Link
            href="/projects"
            className="rounded-full border border-zinc-700 px-8 py-3 font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Browse Projects
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center"
          >
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-lg font-bold text-purple-400">
              1
            </div>
            <h3 className="mb-2 font-semibold">Launch Token</h3>
            <p className="text-sm text-zinc-400">
              Create your ERC-20 token with vanity address{" "}
              <code className="text-purple-400">...911</code>. Token
              automatically enters bonding curve for liquidity.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-lg font-bold text-blue-400">
              2
            </div>
            <h3 className="mb-2 font-semibold">Bonding Curve</h3>
            <p className="text-sm text-zinc-400">
              Price goes up as more tokens are bought. When graduation cap is
              reached, LP is created on DEX automatically.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 text-lg font-bold text-green-400">
              3
            </div>
            <h3 className="mb-2 font-semibold">Margin Trading</h3>
            <p className="text-sm text-zinc-400">
              Buy tokens with leverage up to 50%. Only 5% fee on debt.
              Auto-liquidation protects the platform.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Projects Placeholder */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Live Projects</h2>
          <Link
            href="/projects"
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            View all →
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">
            No projects yet. Be the first to{" "}
            <Link href="/launch" className="text-purple-400 hover:underline">
              launch a token
            </Link>
            !
          </p>
        </div>
      </section>
    </div>
  );
}
