// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LaunchpadToken
 * @notice ERC-20 token template for CryptoLaunch platform
 * @dev Deployed via CREATE2 from LaunchpadFactory.
 *      Initial supply is minted to owner (factory) — factory distributes
 *      80% to bonding curve, 15% to creator, 5% to platform AFTER
 *      deploying both token + curve.
 *
 *      Creator tokens are locked for VESTING_DURATION after launch.
 */
contract LaunchpadToken is ERC20, Ownable {
    uint256 public constant BONDING_CURVE_PERCENT = 80;
    uint256 public constant CREATOR_RESERVE_PERCENT = 15;
    uint256 public constant PLATFORM_RESERVE_PERCENT = 5;
    uint256 public constant VESTING_DURATION = 180 days;

    uint256 public immutable maxSupply;
    address public immutable creator;
    address public platformWallet;
    uint256 public launchDate;
    uint256 public creatorUnlockDate;

    mapping(address => bool) public vestingExempt;
    bool public initialized;

    event CreatorTokensUnlocked(uint256 timestamp);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _maxSupply,
        address _platformWallet,
        address _creator,
        uint256 _launchDate
    ) ERC20(name_, symbol_) Ownable() {
        require(_maxSupply > 0, "Supply must be > 0");
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_creator != address(0), "Invalid creator");

        maxSupply = _maxSupply;
        creator = _creator;
        platformWallet = _platformWallet;
        launchDate = _launchDate;
        creatorUnlockDate = _launchDate + VESTING_DURATION;

        // Mint all tokens to deployer (factory)
        // Factory will distribute in createLaunch()
        _mint(msg.sender, _maxSupply);
    }

    /**
     * @notice Called once by owner (factory) to mark token as initialized.
     *         After this, no more mass distribution is allowed.
     */
    function markInitialized() external onlyOwner {
        require(!initialized, "Already initialized");
        initialized = true;
        vestingExempt[platformWallet] = true;
    }

    /**
     * @notice Transfer — creator (owner) cannot transfer before unlock date.
     *         Platform wallet and other exempt addresses can transfer freely.
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from == creator && !vestingExempt[from]) {
            require(
                block.timestamp >= creatorUnlockDate,
                "Creator tokens locked until unlock date"
            );
        }
        super._transfer(from, to, amount);
    }

    function isCreatorUnlocked() public view returns (bool) {
        return block.timestamp >= creatorUnlockDate;
    }

    function creatorVestingRemaining() public view returns (uint256) {
        if (block.timestamp >= creatorUnlockDate) return 0;
        return creatorUnlockDate - block.timestamp;
    }

    function addVestingExempt(address account) external onlyOwner {
        require(account != creator, "Cannot exempt creator");
        require(account != address(0), "Invalid address");
        vestingExempt[account] = true;
    }

    function removeVestingExempt(address account) external onlyOwner {
        require(account != platformWallet, "Cannot remove platform exemption");
        vestingExempt[account] = false;
    }

    function setPlatformWallet(address _newWallet) external {
        require(msg.sender == platformWallet, "Only platform wallet");
        require(_newWallet != address(0), "Invalid address");
        require(_newWallet != creator, "Cannot set to creator");

        address oldWallet = platformWallet;
        platformWallet = _newWallet;

        vestingExempt[oldWallet] = false;
        vestingExempt[_newWallet] = true;

        emit PlatformWalletUpdated(oldWallet, _newWallet);
    }

    function burn(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
}
