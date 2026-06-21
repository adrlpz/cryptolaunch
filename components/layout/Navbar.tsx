"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { address, connect, disconnect, isConnecting } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!address) { setIsAdmin(false); return; }
    fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: address }) })
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.success && d.data?.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [address]);

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-edge bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            L
          </div>
          <span className="text-lg font-semibold">CryptoLaunch</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {[
            ["Projects", "/projects"],
            ["Dashboard", "/dashboard"],
            ["Launch", "/launch"],
            ...(isAdmin ? [["Admin", "/admin"] as const] : []),
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>

        <div>
          {address ? (
            <div className="flex items-center gap-2">
              <div className="glass flex items-center gap-2 !rounded-full px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-profit" />
                <span className="font-mono text-sm">
                  {shortenAddress(address)}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="rounded-full border border-edge px-3 py-2 text-xs text-muted transition-colors hover:text-foreground"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
