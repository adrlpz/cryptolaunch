import { prisma } from "./prisma";
import { currentPrice as bondingCurvePrice } from "./bonding-curve";
import { getDexPrice as fetchDexPrice } from "./dex";
import { ethers } from "ethers";

// ============================================================
// PRICE FEED SERVICE
// ============================================================

/**
 * Ambil harga saat ini untuk sebuah token.
 *
 * Strategi:
 * 1. Cek apakah token sudah graduated ke DEX → ambil harga dari DEX
 * 2. Jika belum → hitung dari bonding curve
 * 3. Fallback ke harga di database
 */
export async function getCurrentPrice(
  chain: string,
  contractAddress: string | null
): Promise<number | null> {
  if (!contractAddress) return null;

  try {
    // Cek liquidity pool status
    const pool = await prisma.liquidityPool.findFirst({
      where: {
        project: { contractAddress },
      },
    });

    if (pool && pool.isGraduated && pool.dexPairAddress) {
      // Sudah graduated → ambil harga dari DEX
      return await getDexPrice(chain, pool.dexPairAddress, {
        tokenReserve: pool.tokenReserve ? Number(pool.tokenReserve) : null,
        nativeReserve: pool.nativeReserve ? Number(pool.nativeReserve) : null,
      });
    }

    if (pool && !pool.isGraduated && pool.basePrice) {
      // Masih di bonding curve → hitung harga dari kurva
      const price = bondingCurvePrice(
        Number(pool.basePrice),
        Number(pool.slope || 0),
        Number(pool.totalSold)
      );
      return price;
    }

    // Fallback: ambil dari project
    const project = await prisma.launchpadProject.findFirst({
      where: { contractAddress },
    });

    return project ? Number(project.tokenPrice) : null;
  } catch (err) {
    console.error("Error fetching price:", err);
    return null;
  }
}

// ============================================================
// DEX PRICE (placeholder — implement with actual DEX SDK)
// ============================================================

/**
 * Ambil harga dari DEX pair.
 *
 * TODO: Implement dengan Uniswap V2/V3 SDK atau PancakeSwap SDK
 * Untuk sekarang, hitung dari reserves di database.
 */
async function getDexPrice(
  chain: string,
  pairAddress: string,
  pool: {
    tokenReserve: number | null;
    nativeReserve: number | null;
  },
  tokenAddress?: string
): Promise<number | null> {
  // Try on-chain DEX price first
  if (pairAddress && tokenAddress) {
    try {
      const rpcUrl = getRpcUrl(chain);
      if (rpcUrl) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const price = await fetchDexPrice(pairAddress, tokenAddress, provider);
        if (price !== null && price > 0) return price;
      }
    } catch (err) {
      console.warn(`On-chain DEX price failed for ${pairAddress}:`, err);
    }
  }

  // Fallback: calculate from DB reserves
  if (pool.tokenReserve && pool.nativeReserve && pool.tokenReserve > 0) {
    return pool.nativeReserve / pool.tokenReserve;
  }

  return null;
}

function getRpcUrl(chain: string): string | null {
  const urls: Record<string, string | undefined> = {
    ethereum: process.env.ETH_RPC_URL,
    sepolia: process.env.SEPOLIA_RPC_URL,
    arbitrum: process.env.ARB_RPC_URL,
    base: process.env.BASE_RPC_URL,
    bsc: process.env.BSC_RPC_URL,
  };
  const url = urls[chain];
  return url && url.length > 0 ? url : null;
}

// ============================================================
// PRICE CACHE (untuk menghindari terlalu banyak call)
// ============================================================

const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 5000; // 5 detik

/**
 * Ambil harga dengan cache 5 detik.
 */
export async function getCachedPrice(
  chain: string,
  contractAddress: string | null
): Promise<number | null> {
  if (!contractAddress) return null;

  const cacheKey = `${chain}:${contractAddress}`;
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  const price = await getCurrentPrice(chain, contractAddress);

  if (price !== null) {
    priceCache.set(cacheKey, { price, timestamp: Date.now() });
  }

  return price;
}

// ============================================================
// BATCH PRICE FETCH
// ============================================================

interface TokenPrice {
  contractAddress: string;
  chain: string;
  price: number | null;
}

/**
 * Ambil harga untuk beberapa token sekaligus.
 */
export async function getBatchPrices(
  tokens: { chain: string; contractAddress: string }[]
): Promise<TokenPrice[]> {
  const results = await Promise.allSettled(
    tokens.map(async (t) => ({
      contractAddress: t.contractAddress,
      chain: t.chain,
      price: await getCachedPrice(t.chain, t.contractAddress),
    }))
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { contractAddress: "", chain: "", price: null }
  );
}
