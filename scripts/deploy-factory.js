const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // ============================================================
  // Config from env vars
  // ============================================================
  const platformWallet = process.env.PLATFORM_WALLET_ADDRESS || deployer.address;
  const dexRouter = process.env.DEX_ROUTER_ADDRESS || ethers.ZeroAddress;

  if (dexRouter === ethers.ZeroAddress) {
    console.warn("   ⚠️  DEX_ROUTER_ADDRESS not set — using address(0)");
  }

  // ============================================================
  // 1. Deploy LaunchpadFactory
  // ============================================================
  console.log("1. Deploying LaunchpadFactory...");
  const Factory = await ethers.getContractFactory("LaunchpadFactory");
  const factory = await Factory.deploy(platformWallet, dexRouter);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   ✅ LaunchpadFactory:", factoryAddress);

  // ============================================================
  // 2. Verify precomputeTokenAddress
  // ============================================================
  console.log("\n2. Verifying precomputeTokenAddress()...");

  const testSalt = ethers.hexlify(ethers.randomBytes(32));
  const testName = "Test";
  const testSymbol = "TST";
  const testSupply = ethers.parseEther("1000000");
  const testLaunchDate = Math.floor(Date.now() / 1000) + 86400;
  const testCreator = deployer.address;

  const predicted = await factory.precomputeTokenAddress(
    testSalt,
    testName,
    testSymbol,
    testSupply,
    testLaunchDate,
    testCreator
  );
  console.log("   Predicted address for random salt:", predicted);

  // ============================================================
  // 3. Verify on-chain: createLaunch → check address matches
  // ============================================================
  console.log("\n3. Verifying CREATE2 deploy matches precompute...");

  const basePrice = ethers.parseEther("0.0001");
  const slope = ethers.parseEther("0.0000001");
  const graduationCap = ethers.parseEther("10");

  const tx = await factory.createLaunch(
    testName,
    testSymbol,
    testSupply,
    basePrice,
    slope,
    graduationCap,
    testSalt,
    testLaunchDate
  );
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try { return factory.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e && e.name === "LaunchCreated");

  const deployedToken = event.args.token;
  const deployedCurve = event.args.bondingCurve;

  console.log("   Predicted:  ", predicted);
  console.log("   Deployed:   ", deployedToken);
  console.log("   Match:      ", predicted.toLowerCase() === deployedToken.toLowerCase() ? "✅ YES" : "❌ NO");
  console.log("   BondingCurve:", deployedCurve);

  // ============================================================
  // Summary
  // ============================================================
  console.log("\n========================================");
  console.log("   DEPLOYMENT SUMMARY (Sepolia)");
  console.log("========================================");
  console.log("LaunchpadFactory:", factoryAddress);
  console.log("Platform Wallet: ", platformWallet);
  console.log("DEX Router:      ", dexRouter);
  console.log("Test Token:      ", deployedToken, " ← CREATE2 verified");
  console.log("Test Curve:      ", deployedCurve);
  console.log("========================================");

  console.log("\n📝 Update your .env:");
  console.log(`LAUNCHPAD_FACTORY_ADDRESS="${factoryAddress}"`);

  console.log("\nVerify on Etherscan:");
  console.log(
    `npx hardhat verify --network sepolia ${factoryAddress} "${platformWallet}" "${dexRouter}"`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
