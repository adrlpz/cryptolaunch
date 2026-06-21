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
        <div className="brutal-accent mx-auto max-w-3xl px-8 py-14 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Bonding Curve Launchpad
          </p>
          <h1 className="mb-5 text-4xl font-bold leading-tight md:text-5xl">
            Launch Tokens with{" "}
            <span className="text-accent">Margin Power</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted">
            Create your own token with bonding curve liquidity. Trade with
            leverage up to 50%. Vanity address ending in{" "}
            <code className="inline-block rounded-md border-2 border-edge bg-inset px-2 py-0.5 font-mono text-xs text-accent">
              ...911
            </code>
            .
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/launch"
              className="brutal-sm !bg-accent px-7 py-3 text-sm font-bold !text-background transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              Launch a Token
            </Link>
            <Link
              href="/projects"
              className="brutal-sm !bg-purple px-7 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="brutal p-5 text-center">
            <div className="font-mono text-2xl font-bold">{stat.value}</div>
            <div className="mt-1 text-xs font-medium text-muted">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="mb-16">
        <h2 className="mb-8 text-center text-xl font-bold">How It Works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              num: "1",
              title: "Launch Token",
              text: "Create your ERC-20 token with vanity address ending in ...911. Token automatically enters bonding curve for liquidity.",
              shadow: "!shadow-[5px_5px_0px_#FFD700]",
            },
            {
              num: "2",
              title: "Bonding Curve",
              text: "Price goes up as more tokens are bought. When graduation cap is reached, LP is created on DEX automatically.",
              shadow: "!shadow-[5px_5px_0px_#4ADE80]",
            },
            {
              num: "3",
              title: "Margin Trading",
              text: "Buy tokens with leverage up to 50%. Only 5% fee on debt. Auto-liquidation protects the platform.",
              shadow: "!shadow-[5px_5px_0px_#A78BFA]",
            },
          ].map((step) => (
            <div key={step.num} className={`brutal p-6 ${step.shadow}`}>
              <div className="brutal-inset mb-3 flex h-11 w-11 items-center justify-center text-lg font-bold">
                {step.num}
              </div>
              <h3 className="mb-2 font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">Live Projects</h2>
          <Link href="/projects" className="text-sm font-bold text-accent hover:underline">
            View all →
          </Link>
        </div>
        <div className="brutal p-12 text-center">
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
