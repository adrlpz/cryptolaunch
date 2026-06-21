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
      <section className="mb-16">
        <div className="clay-deep mx-auto max-w-3xl px-8 py-14 text-center">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-purple">
            Bonding Curve Launchpad
          </p>
          <h1 className="mb-5 text-4xl font-black leading-tight md:text-5xl">
            Launch Tokens with{" "}
            <span className="bg-gradient-to-r from-accent to-loss bg-clip-text text-transparent">
              Margin Power
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted">
            Create your own token with bonding curve liquidity. Trade with
            leverage up to 50%. Vanity address ending in{" "}
            <code className="clay-inset inline-block rounded-xl px-2 py-0.5 font-mono text-xs text-accent">
              ...911
            </code>
            .
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/launch"
              className="clay-sm !bg-gradient-to-r !from-accent !to-loss px-7 py-3 text-sm font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Launch a Token
            </Link>
            <Link
              href="/projects"
              className="clay-sm !bg-purple px-7 py-3 text-sm font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="clay p-5 text-center">
            <div className="font-mono text-2xl font-black">{stat.value}</div>
            <div className="mt-1 text-xs font-semibold text-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-xl font-extrabold">How It Works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              num: "1",
              title: "Launch Token",
              text: "Create your ERC-20 token with vanity address ending in ...911. Token automatically enters bonding curve for liquidity.",
              bg: "!bg-accent-subtle",
              color: "text-accent",
            },
            {
              num: "2",
              title: "Bonding Curve",
              text: "Price goes up as more tokens are bought. When graduation cap is reached, LP is created on DEX automatically.",
              bg: "!bg-profit-subtle",
              color: "text-profit",
            },
            {
              num: "3",
              title: "Margin Trading",
              text: "Buy tokens with leverage up to 50%. Only 5% fee on debt. Auto-liquidation protects the platform.",
              bg: "!bg-purple-subtle",
              color: "text-purple",
            },
          ].map((step) => (
            <div key={step.num} className="clay p-6">
              <div className={`${step.bg} mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ${step.color}`}>
                {step.num}
              </div>
              <h3 className="mb-2 font-extrabold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Live Projects</h2>
          <Link
            href="/projects"
            className="text-sm font-bold text-accent transition-opacity hover:opacity-80"
          >
            View all →
          </Link>
        </div>
        <div className="clay p-12 text-center">
          <p className="text-muted">
            No projects yet. Be the first to{" "}
            <Link href="/launch" className="font-bold text-accent hover:underline">
              launch a token
            </Link>
            !
          </p>
        </div>
      </section>
    </div>
  );
}
