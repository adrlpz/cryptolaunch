import { ethers } from "ethers";

// ============================================================
// VANITY ADDRESS GENERATOR (CREATE2 — local compute)
// ============================================================

/**
 * CREATE2 formula:
 *   contract_address = keccak256(0xff ++ factory ++ salt ++ keccak256(init_code))[12:]
 *
 * This module computes the address locally using ethers.getCreate2Address()
 * instead of calling the on-chain precomputeTokenAddress() — ~1000x faster
 * since it eliminates RPC latency per attempt.
 */

export interface VanityResult {
  salt: string;
  predictedAddress: string;
  attempts: number;
  elapsedMs: number;
}

export interface VanitySearchParams {
  factoryAddress: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  platformWallet: string;
  creator: string;
  launchDate: bigint;
  suffix: string;
  maxAttempts?: number;
  onProgress?: (attempts: number) => void;
  /** Full creation bytecode of LaunchpadToken (from Hardhat compilation artifact) */
  tokenCreationCode: string;
}

/**
 * Brute-force search for a vanity salt that produces a token address
 * ending with the given suffix. Uses local CREATE2 computation.
 */
export async function generateVanitySalt(
  params: VanitySearchParams
): Promise<VanityResult> {
  const {
    factoryAddress,
    name,
    symbol,
    totalSupply,
    platformWallet,
    creator,
    launchDate,
    suffix,
    maxAttempts = 1_000_000,
    onProgress,
    tokenCreationCode,
  } = params;

  const normalizedSuffix = suffix.toLowerCase();
  const startTime = Date.now();

  // Build init code once — it's the same for every salt attempt
  const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "uint256", "address", "address", "uint256"],
    [name, symbol, totalSupply.toString(), platformWallet, creator, launchDate.toString()]
  );
  const initCode = ethers.concat([tokenCreationCode, constructorArgs]);
  const initCodeHash = ethers.keccak256(initCode);

  for (let i = 0; i < maxAttempts; i++) {
    const salt = ethers.hexlify(ethers.randomBytes(32));

    // Derive the same tokenSalt the contract uses: keccak256(abi.encodePacked(salt, "token"))
    const tokenSalt = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "string"], [salt, "token"])
    );

    const predicted = ethers.getCreate2Address(
      factoryAddress,
      tokenSalt,
      initCodeHash
    );

    if (predicted.toLowerCase().endsWith(normalizedSuffix)) {
      return {
        salt,
        predictedAddress: predicted,
        attempts: i + 1,
        elapsedMs: Date.now() - startTime,
      };
    }

    if (onProgress && (i + 1) % 1000 === 0) {
      onProgress(i + 1);
    }
  }

  throw new Error(
    `Failed to find vanity salt after ${maxAttempts} attempts`
  );
}

/**
 * Verify that a contract address ends with the target suffix.
 */
export function verifyVanitySuffix(
  contractAddress: string,
  suffix: string
): boolean {
  return contractAddress.toLowerCase().endsWith(suffix.toLowerCase());
}

/**
 * Estimate time to find vanity salt.
 * With local compute: ~50,000 attempts/sec (no RPC calls).
 * For 3 hex chars (911): ~0.08 seconds.
 * For 4 hex chars: ~1.3 seconds.
 * For 5 hex chars: ~21 seconds.
 */
export function estimateVanityTime(
  suffixLength: number,
  attemptsPerSecond: number = 50_000
): { expectedAttempts: number; expectedSeconds: number } {
  const expectedAttempts = Math.pow(16, suffixLength);
  const expectedSeconds = expectedAttempts / attemptsPerSecond;

  return {
    expectedAttempts,
    expectedSeconds,
  };
}
