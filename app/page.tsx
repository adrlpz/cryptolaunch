import Link from "next/link";

const STATS = [
  { label: "Total Projects", value: "—" },
  { label: "Total Volume", value: "—" },
  { label: "Active Positions", value: "—" },
  { label: "Total Users", value: "—" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {/* Hero */}
      <section className="mb-20 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Bonding Curve Launchpad
        </p>
        <h1 className="mx-auto mb-6 max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Launch Tokens with{" "}
          <span className="text-accent">Margin Power</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted">
          Create your own token with bonding curve liquidity and trade with
          leverage up to 50%.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/launch"
            className="rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-white transition-all hover:shadow-[0_0_24px_rgba(99,102,241,0.35)]"
          >
            Launch a Token
          </Link>
          <Link
            href="/projects"
            className="rounded-full border border-edge px-8 py-3.5 text-sm font-medium text-muted transition-colors hover:border-edge-bright hover:text-foreground"
          >
            Browse Projects
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-20 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="glass p-6 text-center">
            <div className="font-mono text-3xl font-bold">{stat.value}</div>
            <div className="mt-1 text-xs text-muted">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="mb-20">
        <h2 className="mb-10 text-center text-2xl font-semibold">
          How It Works
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              num: "1",
              title: "Launch Token",
              text: "Create your ERC-20 token and launch it on a bonding curve. Token automatically enters bonding curve for liquidity.",
            },
            {
              num: "2",
              title: "Bonding Curve",
              text: "Price goes up as more tokens are bought. When graduation cap is reached, LP is created on DEX automatically.",
            },
            {
              num: "3",
              title: "Margin Trading",
              text: "Buy tokens with leverage up to 50%. Only 5% fee on debt. Auto-liquidation protects the platform.",
            },
          ].map((step) => (
            <div key={step.num} className="glass-glow p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {step.num}
              </div>
              <h3 className="mb-2 text-base font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Live Projects</h2>
          <Link
            href="/projects"
            className="text-sm text-accent transition-opacity hover:opacity-80"
          >
            View all →
          </Link>
        </div>
        <div className="glass p-14 text-center">
          <p className="text-muted">
            No projects yet. Be the first to{" "}
            <Link href="/launch" className="text-accent hover:underline">
              launch a token
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
