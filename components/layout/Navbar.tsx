"use client";

import Link from "next/link";
import { useWallet } from "@/lib/wallet-context";

export default function Navbar() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 font-bold text-white">
            L
          </div>
          <span className="text-lg font-bold text-white">
            CryptoLaunch
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/projects"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Projects
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/launch"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Launch Token
          </Link>
          <Link
            href="/admin"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Admin
          </Link>
        </div>

        {/* Wallet Connect */}
        <div>
          {address ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-zinc-300">
                  {shortenAddress(address)}
                </span>
              </div>
              <button
                onClick={disconnect}
                className="rounded-full border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="rounded-full bg-gradient-to-r from-purple-500 to-blue-600 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
