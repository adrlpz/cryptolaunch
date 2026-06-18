const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LaunchpadToken", function () {
  let Token, token;
  let owner, creator, platform, user1, user2;
  const NAME = "TestToken";
  const SYMBOL = "TEST";
  const SUPPLY = ethers.parseEther("1000000");
  const VESTING_DURATION = 180 * 24 * 60 * 60; // 180 days in seconds

  beforeEach(async function () {
    [owner, creator, platform, user1, user2] = await ethers.getSigners();
    const launchDate = Math.floor(Date.now() / 1000) + 3600; // +1 hour
    Token = await ethers.getContractFactory("LaunchpadToken");
    token = await Token.deploy(NAME, SYMBOL, SUPPLY, platform.address, creator.address, launchDate);
    await token.waitForDeployment();
  });

  // ============================================================
  // Deployment
  // ============================================================
  describe("Deployment", function () {
    it("should set name, symbol, maxSupply correctly", async function () {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
      expect(await token.maxSupply()).to.equal(SUPPLY);
    });

    it("should set creator as immutable", async function () {
      expect(await token.creator()).to.equal(creator.address);
    });

    it("should set platform wallet", async function () {
      expect(await token.platformWallet()).to.equal(platform.address);
    });

    it("should mint total supply to deployer (owner)", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(SUPPLY);
    });

    it("should set launchDate and creatorUnlockDate", async function () {
      const launchDate = await token.launchDate();
      const unlockDate = await token.creatorUnlockDate();
      expect(unlockDate).to.equal(launchDate + BigInt(VESTING_DURATION));
    });

    it("should revert if maxSupply is 0", async function () {
      const launchDate = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        Token.deploy(NAME, SYMBOL, 0, platform.address, creator.address, launchDate)
      ).to.be.revertedWith("Supply must be > 0");
    });

    it("should revert if platform wallet is address(0)", async function () {
      const launchDate = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        Token.deploy(NAME, SYMBOL, SUPPLY, ethers.ZeroAddress, creator.address, launchDate)
      ).to.be.revertedWith("Invalid platform wallet");
    });

    it("should revert if creator is address(0)", async function () {
      const launchDate = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        Token.deploy(NAME, SYMBOL, SUPPLY, platform.address, ethers.ZeroAddress, launchDate)
      ).to.be.revertedWith("Invalid creator");
    });
  });

  // ============================================================
  // Vesting
  // ============================================================
  describe("Vesting", function () {
    it("should block creator from transferring before unlock date", async function () {
      // Owner has all tokens. Transfer some to creator first.
      // But creator is not the owner — let's set it up properly.
      // In the real flow: factory deploys, distributes, then transfers ownership.
      // Let's transfer ownership to creator.
      await token.transferOwnership(creator.address);

      // Transfer some tokens to creator
      await token.transfer(creator.address, ethers.parseEther("100000"));

      // Creator tries to transfer — should fail (still locked)
      await expect(
        token.connect(creator).transfer(user1.address, ethers.parseEther("1000"))
      ).to.be.revertedWith("Creator tokens locked until unlock date");
    });

    it("should allow platform wallet to transfer freely", async function () {
      await token.transfer(platform.address, ethers.parseEther("100000"));
      await token.connect(platform).transfer(user1.address, ethers.parseEther("1000"));
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });

    it("should allow non-creator to transfer freely", async function () {
      await token.transfer(user1.address, ethers.parseEther("100000"));
      await token.connect(user1).transfer(user2.address, ethers.parseEther("1000"));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("1000"));
    });

    it("should report isCreatorUnlocked correctly", async function () {
      expect(await token.isCreatorUnlocked()).to.be.false;
    });

    it("should report creatorVestingRemaining > 0 before unlock", async function () {
      const remaining = await token.creatorVestingRemaining();
      expect(remaining).to.be.gt(0);
    });
  });

  // ============================================================
  // Vesting Exemptions
  // ============================================================
  describe("Vesting Exemptions", function () {
    it("should allow owner to add vesting exempt", async function () {
      await token.addVestingExempt(user1.address);
      expect(await token.vestingExempt(user1.address)).to.be.true;
    });

    it("should not allow exempting creator", async function () {
      await expect(
        token.addVestingExempt(creator.address)
      ).to.be.revertedWith("Cannot exempt creator");
    });

    it("should allow owner to remove vesting exempt", async function () {
      await token.addVestingExempt(user1.address);
      await token.removeVestingExempt(user1.address);
      expect(await token.vestingExempt(user1.address)).to.be.false;
    });

    it("should not allow removing platform exemption", async function () {
      // Platform is exempt after markInitialized
      await token.markInitialized();
      await expect(
        token.removeVestingExempt(platform.address)
      ).to.be.revertedWith("Cannot remove platform exemption");
    });
  });

  // ============================================================
  // markInitialized
  // ============================================================
  describe("markInitialized", function () {
    it("should set initialized and exempt platform", async function () {
      await token.markInitialized();
      expect(await token.initialized()).to.be.true;
      expect(await token.vestingExempt(platform.address)).to.be.true;
    });

    it("should only be callable once", async function () {
      await token.markInitialized();
      await expect(token.markInitialized()).to.be.revertedWith("Already initialized");
    });
  });

  // ============================================================
  // setPlatformWallet
  // ============================================================
  describe("setPlatformWallet", function () {
    it("should allow platform wallet to update itself", async function () {
      await token.connect(platform).setPlatformWallet(user2.address);
      expect(await token.platformWallet()).to.equal(user2.address);
    });

    it("should revert if caller is not platform wallet", async function () {
      await expect(
        token.connect(user1).setPlatformWallet(user2.address)
      ).to.be.revertedWith("Only platform wallet");
    });

    it("should revert if new wallet is address(0)", async function () {
      await expect(
        token.connect(platform).setPlatformWallet(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("should revert if new wallet is creator", async function () {
      await expect(
        token.connect(platform).setPlatformWallet(creator.address)
      ).to.be.revertedWith("Cannot set to creator");
    });

    it("should update vesting exemptions", async function () {
      await token.connect(platform).setPlatformWallet(user2.address);
      expect(await token.vestingExempt(platform.address)).to.be.false;
      expect(await token.vestingExempt(user2.address)).to.be.true;
    });
  });

  // ============================================================
  // burn
  // ============================================================
  describe("burn", function () {
    it("should burn tokens and reduce balance", async function () {
      const burnAmount = ethers.parseEther("1000");
      await token.transfer(user1.address, burnAmount);
      await token.connect(user1).burn(burnAmount);
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it("should revert if amount is 0", async function () {
      await expect(token.burn(0)).to.be.revertedWith("Amount must be > 0");
    });

    it("should revert if insufficient balance", async function () {
      await expect(
        token.connect(user1).burn(ethers.parseEther("1"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  // ============================================================
  // CREATE2 Address Predictability
  // ============================================================
  describe("CREATE2 Address", function () {
    it("should have deterministic address via factory", async function () {
      const Factory = await ethers.getContractFactory("LaunchpadFactory");
      const factory = await Factory.deploy(platform.address, ethers.ZeroAddress);
      await factory.waitForDeployment();

      const salt = ethers.hexlify(ethers.randomBytes(32));
      const launchDate = Number(await time.latest()) + 86400;

      const predicted = await factory.precomputeTokenAddress(
        salt, "NewToken", "NEW", SUPPLY, launchDate, user1.address
      );

      const tx = await factory.connect(user1).createLaunch(
        "NewToken", "NEW", SUPPLY,
        ethers.parseEther("0.0001"), ethers.parseEther("0.0000001"),
        ethers.parseEther("10"), salt, launchDate
      );
      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
        .find((e) => e && e.name === "LaunchCreated");

      expect(event.args.token).to.equal(predicted);
    });
  });
});
