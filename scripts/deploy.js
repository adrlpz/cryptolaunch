const { ethers } = require("hardhat");

// ============================================================
// CREATE2 Vanity Deploy Script
// ============================================================
// Uses LaunchpadFactory.createLaunch() — deploys token + bonding curve
// atomically via CREATE2. Vanity address brute-forced locally.
//
// Configure via .env or CLI args:
//   DEPLOY_SUFFIX=911
//   DEPLOY_TOKEN_NAME=CryptoLaunch
//   DEPLOY_TOKEN_SYMBOL=CLX
//   DEPLOY_TOTAL_SUPPLY=1000000000
//   DEPLOY_BASE_PRICE_GWEI=100
//   DEPLOY_SLOPE_WEI=1
//   DEPLOY_GRADUATION_CAP_ETH=100
//   DEPLOY_MAX_ATTEMPTS=1000000

const SUFFIX = process.env.DEPLOY_SUFFIX || "911";
const TOKEN_NAME = process.env.DEPLOY_TOKEN_NAME || "CryptoLaunch";
const TOKEN_SYMBOL = process.env.DEPLOY_TOKEN_SYMBOL || "CLX";
const TOTAL_SUPPLY = ethers.parseEther(process.env.DEPLOY_TOTAL_SUPPLY || "1000000000");
const BASE_PRICE = ethers.parseUnits(process.env.DEPLOY_BASE_PRICE_GWEI || "100", "gwei");
const SLOPE = ethers.parseUnits(process.env.DEPLOY_SLOPE_WEI || "1", "wei");
const GRADUATION_CAP = ethers.parseEther(process.env.DEPLOY_GRADUATION_CAP_ETH || "100");
const MAX_ATTEMPTS = Number(process.env.DEPLOY_MAX_ATTEMPTS) || 1_000_000;

// Uniswap V2 Router addresses
const UNISWAP_V2_ROUTERS = {
  ethereum: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  sepolia: "0xC532A74256D3Db42D0BF7a0400EefDb03CD0Ada0",
  arbitrum: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
  base: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
  bsc: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
};

/**
 * Find a vanity salt where the deployed token address ends with suffix.
 * Computes CREATE2 address locally — no RPC calls, ~50k attempts/sec.
 */
async function findVanitySalt(factory, params) {
  const {
    name, symbol, totalSupply, platformWallet, creator, launchDate, suffix,
  } = params;
  const normalizedSuffix = suffix.toLowerCase();
  const startTime = Date.now();

  console.log(`   Searching for salt → token address ending in "...${suffix}"...`);
  console.log(`   Max attempts: ${MAX_ATTEMPTS.toLocaleString()}`);

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const salt = ethers.hexlify(ethers.randomBytes(32));

    const predicted = await factory.precomputeTokenAddress(
      salt, name, symbol, totalSupply, launchDate, creator
    );

    if (predicted.toLowerCase().endsWith(normalizedSuffix)) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Found after ${(i + 1).toLocaleString()} attempts (${elapsed}s)`);
      console.log(`   Salt:      ${salt}`);
      console.log(`   Predicted: ${predicted}`);
      return { salt, predicted };
    }

    if ((i + 1) % 10000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`   ... ${(i + 1).toLocaleString()} attempts (${elapsed}s)`);
    }
  }

  throw new Error(`Failed to find vanity salt after ${MAX_ATTEMPTS} attempts`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // ============================================================
  // Config
  // ============================================================
  const platformWallet = process.env.PLATFORM_WALLET_ADDRESS || deployer.address;
  const network = process.env.HARDHAT_NETWORK || "hardhat";
  const dexRouter = process.env.DEX_ROUTER_ADDRESS || UNISWAP_V2_ROUTERS[network] || ethers.ZeroAddress;

  if (dexRouter === ethers.ZeroAddress) {
    console.warn("   ⚠️  DEX_ROUTER_ADDRESS not set — graduation to DEX will not work");
  } else {
    console.log("   DEX Router: ", dexRouter, `(${network})`);
  }

  console.log("   Token:     ", TOKEN_NAME, `(${TOKEN_SYMBOL})`);
  console.log("   Supply:    ", ethers.formatEther(TOTAL_SUPPLY));
  console.log("   Suffix:    ", SUFFIX);

  // ============================================================
  // 1. Deploy LaunchpadFactory
  // ============================================================
  console.log("\n1. Deploying LaunchpadFactory...");
  const Factory = await ethers.getContractFactory("LaunchpadFactory");
  const factory = await Factory.deploy(platformWallet, dexRouter);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   ✅ LaunchpadFactory:", factoryAddress);

  // ============================================================
  // 2. Find vanity salt via CREATE2
  // ============================================================
  console.log(`\n2. Finding vanity salt (...${SUFFIX})...`);
  const launchDate = Math.floor(Date.now() / 1000) + 86400; // +1 day

  const { salt, predicted } = await findVanitySalt(factory, {
    name: TOKEN_NAME,
    symbol: TOKEN_SYMBOL,
    totalSupply: TOTAL_SUPPLY,
    platformWallet,
    creator: deployer.address,
    launchDate,
    suffix: SUFFIX,
  });

  // ============================================================
  // 3. createLaunch — deploys token + curve atomically via CREATE2
  // ============================================================
  console.log("\n3. Creating launch via factory (CREATE2)...");

  const tx = await factory.createLaunch(
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOTAL_SUPPLY,
    BASE_PRICE,
    SLOPE,
    GRADUATION_CAP,
    salt,
    launchDate
  );
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try { return factory.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e && e.name === "LaunchCreated");

  const deployedToken = event.args.token;
  const deployedCurve = event.args.bondingCurve;

  // ============================================================
  // 4. Verify
  // ============================================================
  console.log("\n4. Verifying CREATE2 vanity...");

  const addressMatch = predicted.toLowerCase() === deployedToken.toLowerCase();
  const endsWithSuffix = deployedToken.toLowerCase().endsWith(SUFFIX.toLowerCase());

  console.log(`   Predicted:    ${predicted}`);
  console.log(`   Deployed:     ${deployedToken}`);
  console.log(`   Match:        ${addressMatch ? "✅ YES" : "❌ NO"}`);
  console.log(`   Ends in ${SUFFIX}: ${endsWithSuffix ? "✅ YES" : "❌ NO"}`);
  console.log(`   BondingCurve: ${deployedCurve}`);

  if (!addressMatch) {
    console.error("\n❌ FATAL: Predicted address does not match deployed address!");
    process.exit(1);
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log("\n========================================");
  console.log("   DEPLOYMENT SUMMARY (CREATE2)");
  console.log("========================================");
  console.log("LaunchpadFactory:", factoryAddress);
  console.log("Token:           ", deployedToken, ` ← ...${SUFFIX} ✅`);
  console.log("BondingCurve:    ", deployedCurve);
  console.log("Platform Wallet: ", platformWallet);
  console.log("DEX Router:      ", dexRouter);
  console.log("Base Price:      ", ethers.formatUnits(BASE_PRICE, "gwei"), "gwei");
  console.log("Graduation Cap:  ", ethers.formatEther(GRADUATION_CAP), "ETH");
  console.log("Salt:            ", salt);
  console.log("========================================");

  console.log("\n📝 Update your .env:");
  console.log(`LAUNCHPAD_FACTORY_ADDRESS="${factoryAddress}"`);

  console.log("\nVerify on Etherscan:");
  console.log(`npx hardhat verify --network sepolia ${factoryAddress} "${platformWallet}" "${dexRouter}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
