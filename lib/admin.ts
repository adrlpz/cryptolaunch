/**
 * Admin wallet verification.
 * Checks if a wallet address is in the ADMIN_WALLETS env var list.
 */

/**
 * Parse admin wallets from environment variable.
 * Returns lowercase addresses for case-insensitive comparison.
 */
function getAdminWallets(): Set<string> {
  const raw = process.env.ADMIN_WALLETS || "";
  const wallets = raw
    .split(",")
    .map((addr) => addr.trim().toLowerCase())
    .filter((addr) => /^0x[a-f0-9]{40}$/.test(addr));
  return new Set(wallets);
}

/**
 * Check if a wallet address is an admin (server-side only).
 */
export function isAdmin(walletAddress: string): boolean {
  const adminWallets = getAdminWallets();
  return adminWallets.has(walletAddress.toLowerCase());
}

/**
 * Verify admin access and throw if not authorized.
 * Use in API routes.
 */
export function requireAdmin(walletAddress: string | null): string {
  if (!walletAddress) {
    throw new Error("Authentication required");
  }
  if (!isAdmin(walletAddress)) {
    throw new Error("Admin access required");
  }
  return walletAddress;
}
