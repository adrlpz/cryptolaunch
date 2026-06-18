// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./LaunchpadToken.sol";
import "./BondingCurve.sol";

/**
 * @title LaunchpadFactory
 * @notice Factory for deploying token + bonding curve pairs
 * @dev Compatible with OpenZeppelin 4.x
 *
 * CREATE2 vanity flow:
 *   - precomputeAddress(salt, name, symbol) returns predicted token address
 *   - User signs createLaunch() from their own wallet
 *   - Factory deploys via CREATE2
 *   - Contract address = predicted (suffix 911)
 */
contract LaunchpadFactory is Ownable {
    address public platformWallet;
    address public dexRouter;
    bool public paused;

    struct LaunchInfo {
        address token;
        address bondingCurve;
        address creator;
        string tokenName;
        string tokenSymbol;
        uint256 totalSupply;
        uint256 basePrice;
        uint256 graduationCap;
        uint256 createdAt;
        bool exists;
    }

    mapping(address => LaunchInfo) public launches;
    address[] public allLaunches;
    mapping(address => address[]) public creatorLaunches;
    mapping(bytes32 => bool) public saltUsed;

    uint256 public constant MAX_LAUNCHES_PER_CREATOR = 10;
    uint256 public constant MIN_BASE_PRICE = 1;
    uint256 public constant MIN_GRADUATION_CAP = 0.01 ether;
    uint256 public constant MIN_SUPPLY = 1000;

    event LaunchCreated(
        address indexed token,
        address indexed bondingCurve,
        address indexed creator,
        string tokenName,
        string tokenSymbol,
        uint256 totalSupply,
        uint256 basePrice,
        uint256 graduationCap
    );
    event PauseToggled(bool paused);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor(address _platformWallet, address _dexRouter) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        dexRouter = _dexRouter;
    }

    /**
     * @notice Precompute the token address for a given salt + token params.
     * @dev Used by frontend to show predicted address BEFORE user signs.
     * @param salt The salt that will be used in createLaunch
     * @param name Token name
     * @param symbol Token symbol
     * @param totalSupply Token total supply
     * @return predictedToken The address where token will be deployed
     */
    function precomputeTokenAddress(
        bytes32 salt,
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 launchDate,
        address creator
    ) external view returns (address predictedToken) {
        bytes32 tokenSalt = keccak256(abi.encodePacked(salt, "token"));
        bytes memory bytecode = abi.encodePacked(
            type(LaunchpadToken).creationCode,
            abi.encode(
                name,
                symbol,
                totalSupply,
                platformWallet,
                creator,
                launchDate
            )
        );
        predictedToken = Create2.computeAddress(tokenSalt, keccak256(bytecode));
    }

    /**
     * @notice Create a new token launch with bonding curve
     * @dev User calls this from their own wallet. Gas paid by user.
     *      Token address = precomputeTokenAddress(salt, name, symbol, totalSupply)
     */
    function createLaunch(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 basePrice,
        uint256 slope,
        uint256 graduationCap,
        bytes32 salt,
        uint256 launchDate
    ) external whenNotPaused returns (address token, address bondingCurve) {
        require(bytes(name).length > 0 && bytes(name).length <= 50, "Invalid name");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 10, "Invalid symbol");
        require(totalSupply >= MIN_SUPPLY, "Supply too low");
        require(basePrice >= MIN_BASE_PRICE, "Base price too low");
        require(slope > 0, "Slope must be > 0");
        require(graduationCap >= MIN_GRADUATION_CAP, "Graduation cap too low");
        require(launchDate > block.timestamp, "Launch date must be in the future");
        require(!saltUsed[salt], "Salt already used");
        require(
            creatorLaunches[msg.sender].length < MAX_LAUNCHES_PER_CREATOR,
            "Too many launches"
        );

        saltUsed[salt] = true;

        bytes32 tokenSalt = keccak256(abi.encodePacked(salt, "token"));
        bytes32 curveSalt = keccak256(abi.encodePacked(salt, "curve"));

        // Deploy token with factory as temp owner
        token = _deployToken(name, symbol, totalSupply, tokenSalt, launchDate);

        // Deploy bonding curve
        bondingCurve = _deployBondingCurve(
            token,
            msg.sender,
            basePrice,
            slope,
            graduationCap,
            curveSalt
        );

        // Transfer tokens to bonding curve
        uint256 curveTokens = (totalSupply * 80) / 100;
        IERC20(token).transfer(bondingCurve, curveTokens);

        // Initialize bonding curve's token balance
        BondingCurve(bondingCurve).initialize();

        // Transfer token ownership to creator (user)
        LaunchpadToken(token).transferOwnership(msg.sender);

        launches[token] = LaunchInfo({
            token: token,
            bondingCurve: bondingCurve,
            creator: msg.sender,
            tokenName: name,
            tokenSymbol: symbol,
            totalSupply: totalSupply,
            basePrice: basePrice,
            graduationCap: graduationCap,
            createdAt: block.timestamp,
            exists: true
        });

        allLaunches.push(token);
        creatorLaunches[msg.sender].push(token);

        emit LaunchCreated(token, bondingCurve, msg.sender, name, symbol, totalSupply, basePrice, graduationCap);
    }

    function _deployToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        bytes32 salt,
        uint256 launchDate
    ) internal returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(LaunchpadToken).creationCode,
            abi.encode(
                name,
                symbol,
                totalSupply,
                platformWallet,
                msg.sender,    // creator
                launchDate     // deterministic — matches precompute
            )
        );

        address deployed = Create2.deploy(0, salt, bytecode);
        require(deployed != address(0), "Token deploy failed");
        return deployed;
    }

    function _deployBondingCurve(
        address token,
        address creator,
        uint256 basePrice,
        uint256 slope,
        uint256 graduationCap,
        bytes32 salt
    ) internal returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(BondingCurve).creationCode,
            abi.encode(
                token,
                platformWallet,
                creator,
                basePrice,
                slope,
                graduationCap,
                dexRouter
            )
        );

        address deployed = Create2.deploy(0, salt, bytecode);
        require(deployed != address(0), "Curve deploy failed");
        return deployed;
    }

    function getLaunchCount() external view returns (uint256) {
        return allLaunches.length;
    }

    function getCreatorLaunches(address creator) external view returns (address[] memory) {
        return creatorLaunches[creator];
    }

    function getAllLaunches(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 end = offset + limit;
        if (end > allLaunches.length) end = allLaunches.length;
        if (offset >= allLaunches.length) return new address[](0);
        uint256 size = end - offset;

        address[] memory result = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = allLaunches[offset + i];
        }
        return result;
    }

    function togglePause() external onlyOwner {
        paused = !paused;
        emit PauseToggled(paused);
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        address oldWallet = platformWallet;
        platformWallet = _wallet;
        emit PlatformWalletUpdated(oldWallet, _wallet);
    }

    function setDexRouter(address _router) external onlyOwner {
        dexRouter = _router;
    }
}
