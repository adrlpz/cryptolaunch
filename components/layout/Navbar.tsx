"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";

export default function Navbar() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-edge bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="brutal-sm flex h-9 w-9 items-center justify-center !bg-accent text-sm font-bold !text-background">
            L
          </div>
          <span className="text-lg font-bold">CryptoLaunch</span>
        </Link>

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
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>

        <div>
          {address ? (
            <div className="flex items-center gap-2">
              <div className="brutal-sm flex items-center gap-2 px-4 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-profit" />
                <span className="font-mono text-sm">
                  {shortenAddress(address)}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="rounded-lg border-2 border-edge px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="brutal-sm !bg-accent px-5 py-2.5 text-sm font-bold !text-background transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
