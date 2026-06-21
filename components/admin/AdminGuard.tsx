"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import Link from "next/link";

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Client-side admin guard.
 * Calls POST /api/admin/verify to check wallet access.
 * Shows connect prompt, checking state, or access denied.
 */
export default function AdminGuard({ children }: AdminGuardProps) {
  const { address, connect, isConnecting } = useWallet();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!address) {
      setIsAdmin(null);
      return;
    }

    setChecking(true);
    fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setIsAdmin(data.data.isAdmin);
        else setIsAdmin(false);
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setChecking(false));
  }, [address]);

  // Not connected
  if (!address) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass p-10 text-center">
          <div className="mb-3 text-4xl">🔒</div>
          <h2 className="mb-2 text-xl font-bold">Admin Access</h2>
          <p className="mb-6 text-sm text-muted">
            Connect your wallet to verify admin access.
          </p>
          <button
            onClick={connect}
            disabled={isConnecting}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-all hover:shadow-[0_0_24px_rgba(99,102,241,0.35)] disabled:opacity-50"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  // Checking
  if (checking || isAdmin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass p-10 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-accent" />
          <p className="text-sm text-muted">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass p-10 text-center">
          <div className="mb-3 text-4xl">⛔</div>
          <h2 className="mb-2 text-xl font-bold">Access Denied</h2>
          <p className="mb-1 text-sm text-muted">
            Wallet <span className="font-mono text-accent">{address.slice(0, 6)}...{address.slice(-4)}</span> does not have admin access.
          </p>
          <p className="mb-6 text-xs text-muted">
            Contact the platform owner to request access.
          </p>
          <Link
            href="/"
            className="inline-block rounded-full border border-edge px-6 py-2.5 text-sm text-muted transition-colors hover:border-edge-bright hover:text-foreground"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Is admin — render children
  return <>{children}</>;
}
