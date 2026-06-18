import { SiweMessage } from "siwe";
import { prisma } from "./prisma";

/**
 * Verifikasi SIWE message dan signature.
 * Return wallet address jika valid.
 */
export async function verifySiwe(
  message: string,
  signature: string
): Promise<string | null> {
  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (result.success) {
      return siweMessage.address;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get or create user berdasarkan wallet address.
 */
export async function getOrCreateUser(walletAddress: string) {
  const normalizedAddress = walletAddress.toLowerCase();

  let user = await prisma.user.findUnique({
    where: { walletAddress: normalizedAddress },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        walletAddress: normalizedAddress,
        balance: 0,
        totalMarginDebt: 0,
      },
    });
  }

  return user;
}

/**
 * Get user by wallet address (tanpa create).
 */
export async function getUserByWallet(walletAddress: string) {
  return prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
}

/**
 * Validasi apakah address adalah Ethereum address yang valid.
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
