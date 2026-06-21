"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";

export default function Navbar() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-edge bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-background">
            L
          </div>
          <span className="font-display text-lg font-bold">
            CryptoLaunch
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/projects"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Projects
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/launch"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Launch Token
          </Link>
          <Link
            href="/admin"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Admin
          </Link>
        </div>

        {/* Wallet Connect */}
        <div>
          {address ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-edge px-4 py-2">
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
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
