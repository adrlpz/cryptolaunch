const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LaunchpadFactory", function () {
  let Factory, factory;
  let owner, platform, creator, user1, user2;
  const TOKEN_NAME = "TestToken";
  const TOKEN_SYMBOL = "TEST";
  const TOTAL_SUPPLY = ethers.parseEther("1000000");
  const BASE_PRICE = ethers.parseEther("0.0001");
  const SLOPE = ethers.parseEther("0.0000001");
  const GRADUATION_CAP = ethers.parseEther("10");

  function getSalt(i) {
    return ethers.keccak256(ethers.toUtf8Bytes("salt" + i));
  }

  async function futureLaunchDate() {
    const latest = await time.latest();
    return latest + 86400;
  }

  async function createTestLaunch(creatorSigner, salt, overrides = {}) {
    const launchDate = overrides.launchDate ?? await futureLaunchDate();
    const name = overrides.name ?? TOKEN_NAME;
    const symbol = overrides.symbol ?? TOKEN_SYMBOL;
    const supply = overrides.totalSupply ?? TOTAL_SUPPLY;
    const basePrice = overrides.basePrice ?? BASE_PRICE;
    const slope = overrides.slope ?? SLOPE;
    const cap = overrides.graduationCap ?? GRADUATION_CAP;

    return factory.connect(creatorSigner).createLaunch(
      name, symbol, supply, basePrice, slope, cap, salt, launchDate
    );
  }

  beforeEach(async function () {
    [owner, platform, creator, user1, user2] = await ethers.getSigners();
    Factory = await ethers.getContractFactory("LaunchpadFactory");
    factory = await Factory.deploy(platform.address, ethers.ZeroAddress);
    await factory.waitForDeployment();
  });

  // ============================================================
  // Deployment
  // ============================================================
  describe("Deployment", function () {
    it("should set platform wallet and dex router", async function () {
      expect(await factory.platformWallet()).to.equal(platform.address);
      expect(await factory.dexRouter()).to.equal(ethers.ZeroAddress);
    });

    it("should revert if platform wallet is address(0)", async function () {
      await expect(
        Factory.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid platform wallet");
    });

    it("should start unpaused", async function () {
      expect(await factory.paused()).to.be.false;
    });
  });

  // ============================================================
  // createLaunch
  // ============================================================
  describe("createLaunch", function () {
    it("should deploy token + bonding curve", async function () {
      const tx = await createTestLaunch(creator, getSalt(0));
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "LaunchCreated");

      expect(event).to.not.be.null;
      expect(event.args.token).to.not.equal(ethers.ZeroAddress);
      expect(event.args.bondingCurve).to.not.equal(ethers.ZeroAddress);
      expect(event.args.creator).to.equal(creator.address);
    });

    it("should distribute 80% tokens to bonding curve", async function () {
      const tx = await createTestLaunch(creator, getSalt(1));
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "LaunchCreated");

      const token = await ethers.getContractAt("LaunchpadToken", event.args.token);
      const curveBalance = await token.balanceOf(event.args.bondingCurve);
      expect(curveBalance).to.equal(TOTAL_SUPPLY * 80n / 100n);
    });

    it("should transfer token ownership to creator", async function () {
      const tx = await createTestLaunch(creator, getSalt(2));
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "LaunchCreated");

      const token = await ethers.getContractAt("LaunchpadToken", event.args.token);
      expect(await token.owner()).to.equal(creator.address);
    });

    it("should store launch info", async function () {
      const tx = await createTestLaunch(creator, getSalt(3));
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "LaunchCreated");

      const info = await factory.launches(event.args.token);
      expect(info.exists).to.be.true;
      expect(info.creator).to.equal(creator.address);
      expect(info.tokenName).to.equal(TOKEN_NAME);
    });

    it("should track creator launches", async function () {
      await createTestLaunch(creator, getSalt(4));
      const launches = await factory.getCreatorLaunches(creator.address);
      expect(launches.length).to.equal(1);
    });

    it("should increment launch count", async function () {
      expect(await factory.getLaunchCount()).to.equal(0);
      await createTestLaunch(creator, getSalt(5));
      expect(await factory.getLaunchCount()).to.equal(1);
    });

    it("should revert if name is empty", async function () {
      await expect(createTestLaunch(creator, getSalt(10), { name: "" }))
        .to.be.revertedWith("Invalid name");
    });

    it("should revert if name > 50 chars", async function () {
      await expect(createTestLaunch(creator, getSalt(11), { name: "A".repeat(51) }))
        .to.be.revertedWith("Invalid name");
    });

    it("should revert if symbol > 10 chars", async function () {
      await expect(createTestLaunch(creator, getSalt(12), { symbol: "VERYLONGSYM" }))
        .to.be.revertedWith("Invalid symbol");
    });

    it("should revert if supply < MIN_SUPPLY", async function () {
      await expect(createTestLaunch(creator, getSalt(13), { totalSupply: 999 }))
        .to.be.revertedWith("Supply too low");
    });

    it("should revert if basePrice < MIN_BASE_PRICE", async function () {
      await expect(createTestLaunch(creator, getSalt(14), { basePrice: 0 }))
        .to.be.revertedWith("Base price too low");
    });

    it("should revert if slope is 0", async function () {
      await expect(createTestLaunch(creator, getSalt(15), { slope: 0 }))
        .to.be.revertedWith("Slope must be > 0");
    });

    it("should revert if graduationCap < MIN_GRADUATION_CAP", async function () {
      await expect(createTestLaunch(creator, getSalt(16), { graduationCap: ethers.parseEther("0.001") }))
        .to.be.revertedWith("Graduation cap too low");
    });

    it("should revert if launchDate is in the past", async function () {
      const pastDate = Number(await time.latest()) - 3600;
      await expect(createTestLaunch(creator, getSalt(17), { launchDate: pastDate }))
        .to.be.revertedWith("Launch date must be in the future");
    });

    it("should revert if salt is reused", async function () {
      const salt = getSalt(20);
      await createTestLaunch(creator, salt);
      await expect(createTestLaunch(creator, salt))
        .to.be.revertedWith("Salt already used");
    });

    it("should revert if creator exceeds max launches", async function () {
      for (let i = 0; i < 10; i++) {
        await createTestLaunch(creator, getSalt(100 + i));
      }
      await expect(createTestLaunch(creator, getSalt(999)))
        .to.be.revertedWith("Too many launches");
    });
  });

  // ============================================================
  // precomputeTokenAddress
  // ============================================================
  describe("precomputeTokenAddress", function () {
    it("should return deterministic address", async function () {
      const salt = getSalt(0);
      const launchDate = await futureLaunchDate();

      const addr1 = await factory.precomputeTokenAddress(
        salt, TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, launchDate, creator.address
      );
      const addr2 = await factory.precomputeTokenAddress(
        salt, TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, launchDate, creator.address
      );
      expect(addr1).to.equal(addr2);
    });

    it("should return different address for different salt", async function () {
      const launchDate = await futureLaunchDate();
      const addr1 = await factory.precomputeTokenAddress(
        getSalt(0), TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, launchDate, creator.address
      );
      const addr2 = await factory.precomputeTokenAddress(
        getSalt(1), TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, launchDate, creator.address
      );
      expect(addr1).to.not.equal(addr2);
    });
  });

  // ============================================================
  // getAllLaunches
  // ============================================================
  describe("getAllLaunches", function () {
    it("should return paginated launches", async function () {
      for (let i = 0; i < 3; i++) {
        await createTestLaunch(creator, getSalt(200 + i));
      }
      const page1 = await factory.getAllLaunches(0, 2);
      expect(page1.length).to.equal(2);
      const page2 = await factory.getAllLaunches(2, 2);
      expect(page2.length).to.equal(1);
    });

    it("should return empty for out-of-bounds offset", async function () {
      const result = await factory.getAllLaunches(100, 10);
      expect(result.length).to.equal(0);
    });
  });

  // ============================================================
  // Admin Functions
  // ============================================================
  describe("Admin", function () {
    it("should allow owner to toggle pause", async function () {
      await factory.togglePause();
      expect(await factory.paused()).to.be.true;
      await factory.togglePause();
      expect(await factory.paused()).to.be.false;
    });

    it("should block createLaunch when paused", async function () {
      await factory.togglePause();
      await expect(createTestLaunch(creator, getSalt(300)))
        .to.be.revertedWith("Contract is paused");
    });

    it("should allow owner to set platform wallet", async function () {
      await factory.setPlatformWallet(user1.address);
      expect(await factory.platformWallet()).to.equal(user1.address);
    });

    it("should emit PlatformWalletUpdated", async function () {
      await expect(factory.setPlatformWallet(user1.address))
        .to.emit(factory, "PlatformWalletUpdated")
        .withArgs(platform.address, user1.address);
    });

    it("should revert setPlatformWallet with address(0)", async function () {
      await expect(factory.setPlatformWallet(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("should allow owner to set dex router", async function () {
      await factory.setDexRouter(user2.address);
      expect(await factory.dexRouter()).to.equal(user2.address);
    });

    it("should revert admin functions from non-owner", async function () {
      await expect(factory.connect(user1).togglePause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // ============================================================
  // CREATE2 Vanity Address
  // ============================================================
  describe("CREATE2 Vanity", function () {
    it("should deploy token at predicted address", async function () {
      const salt = getSalt(50);
      const launchDate = await futureLaunchDate();

      const predicted = await factory.precomputeTokenAddress(
        salt, TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, launchDate, creator.address
      );

      const tx = await createTestLaunch(creator, salt, { launchDate });
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "LaunchCreated");

      expect(event.args.token).to.equal(predicted);
    });
  });
});
