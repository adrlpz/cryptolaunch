import { ethers } from "ethers";

// ============================================================
// Uniswap V2 — Minimal ABIs
// ============================================================

const UNISWAP_V2_ROUTER_ABI = [
  "function factory() external pure returns (address)",
  "function WETH() external pure returns (address)",
];

const UNISWAP_V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address)",
];

const UNISWAP_V2_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

// ============================================================
// Uniswap V2 Addresses
// ============================================================

export const UNISWAP_V2_ROUTERS: Record<string, string> = {
  ethereum: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  sepolia: "0xC532A74256D3Db42D0BF7a0400EefDb03CD0Ada0",
  arbitrum: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
  base: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
  bsc: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
};

export const UNISWAP_V2_FACTORIES: Record<string, string> = {
  ethereum: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  sepolia: "0x7E0987E5b3a30e3f2828572Bb659A548460a3003",
  arbitrum: "0xf1D7CC64Fb4452F05c498126312eBE29f307bc9E",
  base: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
  bsc: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
};

// ============================================================
// Core Functions
// ============================================================

export interface DexReserves {
  reserve0: bigint;
  reserve1: bigint;
  token0: string;
  blockTimestamp: number;
}

/**
 * Get Uniswap V2 pair reserves for a token/ETH pair.
 */
export async function getDexReserves(
  pairAddress: string,
  provider: ethers.Provider
): Promise<DexReserves> {
  const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);

  const [reserves, token0] = await Promise.all([
    pair.getReserves() as Promise<[bigint, bigint, number]>,
    pair.token0() as Promise<string>,
  ]);

  return {
    reserve0: reserves[0],
    reserve1: reserves[1],
    token0,
    blockTimestamp: Number(reserves[2]),
  };
}

/**
 * Get DEX price for a token (ETH per token).
 *
 * @param pairAddress - Uniswap V2 pair address
 * @param tokenAddress - Token contract address
 * @param provider - Ethers provider
 * @returns Price in ETH per token
 */
export async function getDexPrice(
  pairAddress: string,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<number> {
  const reserves = await getDexReserves(pairAddress, provider);

  const isToken0 = reserves.token0.toLowerCase() === tokenAddress.toLowerCase();
  const tokenReserve = isToken0 ? reserves.reserve0 : reserves.reserve1;
  const ethReserve = isToken0 ? reserves.reserve1 : reserves.reserve0;

  if (tokenReserve === 0n) return 0;

  // Price = ETH reserve / token reserve (in ETH per token, accounting for 18 decimals)
  return Number(ethReserve * 1000000n / tokenReserve) / 1000000;
}

/**
 * Get Uniswap V2 pair address for a token/WETH pair.
 */
export async function getPairAddress(
  chain: string,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<string | null> {
  const routerAddress = UNISWAP_V2_ROUTERS[chain];
  const factoryAddress = UNISWAP_V2_FACTORIES[chain];

  if (!routerAddress || !factoryAddress) return null;

  const router = new ethers.Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, provider);
  const weth = await router.WETH() as string;

  const factory = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, provider);
  const pair = await factory.getPair(tokenAddress, weth) as string;

  return pair === ethers.ZeroAddress ? null : pair;
}

/**
 * Get full DEX info for a graduated pool.
 */
export async function getDexInfo(
  chain: string,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<{
  pairAddress: string | null;
  price: number | null;
  tokenReserve: string | null;
  ethReserve: string | null;
} | null> {
  const pairAddress = await getPairAddress(chain, tokenAddress, provider);
  if (!pairAddress) return null;

  const reserves = await getDexReserves(pairAddress, provider);
  const isToken0 = reserves.token0.toLowerCase() === tokenAddress.toLowerCase();

  const tokenReserve = isToken0 ? reserves.reserve0 : reserves.reserve1;
  const ethReserve = isToken0 ? reserves.reserve1 : reserves.reserve0;

  const price = tokenReserve > 0n
    ? Number(ethReserve * 1000000n / tokenReserve) / 1000000
    : null;

  return {
    pairAddress,
    price,
    tokenReserve: tokenReserve.toString(),
    ethReserve: ethReserve.toString(),
  };
}
