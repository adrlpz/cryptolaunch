"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";

export default function Navbar() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="clay-sm flex h-9 w-9 items-center justify-center !bg-gradient-to-r !from-accent !to-loss font-extrabold text-white">
            L
          </div>
          <span className="text-lg font-extrabold">CryptoLaunch</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-1 md:flex">
          {[
            ["Projects", "/projects"],
            ["Dashboard", "/dashboard"],
            ["Launch", "/launch"],
            ["Admin", "/admin"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl px-3.5 py-2 text-sm font-semibold text-muted transition-all hover:bg-surface hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <div>
          {address ? (
            <div className="flex items-center gap-2">
              <div className="clay-sm flex items-center gap-2 px-4 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-profit" />
                <span className="font-mono text-sm font-bold">
                  {shortenAddress(address)}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="clay-sm px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-foreground"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="clay-sm !bg-gradient-to-r !from-accent !to-loss px-5 py-2.5 text-sm font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
