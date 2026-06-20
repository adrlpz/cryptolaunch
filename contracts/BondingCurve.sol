// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// ============================================================
// Uniswap V2 Interfaces (minimal)
// ============================================================

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function burn(address to) external returns (uint amount0, uint amount1);
    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
}

/**
 * @title BondingCurve
 * @notice Pump.fun style linear bonding curve for token launches
 *
 * Price model:  price(x) = basePrice + slope * x
 * Cost model:   cost(n)  = basePrice*n + slope*(2*totalSold*n + n*n) / 2
 *
 * Fee: 1% per trade, split 50/50 between creator and platform.
 *
 * Graduation: when totalRaised >= graduationCap, isGraduated is set.
 * Owner (factory or creator) then calls withdrawForLiquidity() to
 * create a DEX LP and burn the LP tokens.
 */
contract BondingCurve is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public platformWallet;
    address public creator;

    uint256 public basePrice;
    uint256 public slope;
    uint256 public graduationCap;

    uint256 public totalSold;
    uint256 public totalRaised;
    uint256 public tokenBalance;
    bool public isGraduated;

    uint256 public constant TRADING_FEE_BPS = 100; // 1%
    uint256 public constant FEE_SPLIT_CREATOR_BPS = 5000; // 50%
    uint256 public constant FEE_SPLIT_PLATFORM_BPS = 5000; // 50%

    address public dexRouter;
    bool public paused;
    mapping(address => uint256) public pendingFees;

    uint256 public emergencyTimelock;
    uint256 public constant EMERGENCY_DELAY = 48 hours;

    // DEX graduation state
    address public dexPairAddress;
    bool public dexLiquidityAdded;

    bool public initialized;

    event TokenPurchased(address indexed buyer, uint256 ethIn, uint256 fee, uint256 tokensOut, uint256 newPrice);
    event TokenSold(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 fee, uint256 newPrice);
    event Graduated(uint256 ethLiquidity, uint256 tokenLiquidity);
    event FeeFailed(address indexed recipient, uint256 amount);
    event PauseToggled(bool paused);
    event EmergencyInitiated(uint256 executeAfter);
    event DEXLiquidityAdded(uint256 tokenAmount, uint256 ethAmount, uint256 liquidity);
    event DEXLiquidityBurned(address pairAddress);

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor(
        address _token,
        address _platformWallet,
        address _creator,
        uint256 _basePrice,
        uint256 _slope,
        uint256 _graduationCap,
        address _dexRouter
    ) {
        require(_token != address(0), "Invalid token");
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_creator != address(0), "Invalid creator");
        require(_basePrice > 0, "Base price must be > 0");
        require(_graduationCap > 0, "Graduation cap must be > 0");

        token = IERC20(_token);
        platformWallet = _platformWallet;
        creator = _creator;
        basePrice = _basePrice;
        slope = _slope;
        graduationCap = _graduationCap;
        dexRouter = _dexRouter;
    }

    /**
     * @notice Initialize tokenBalance after factory transfers tokens.
     *         Called once by owner (factory) after token transfer.
     */
    function initialize() external onlyOwner {
        require(!initialized, "Already initialized");
        tokenBalance = token.balanceOf(address(this));
        require(tokenBalance > 0, "No tokens");
        initialized = true;
    }

    /**
     * @notice Buy tokens by sending ETH. Tokens are calculated from bonding curve.
     */
    function buy() external payable nonReentrant whenNotPaused {
        require(!isGraduated, "Already graduated");
        require(msg.value > 0, "Must send ETH");

        uint256 fee = (msg.value * TRADING_FEE_BPS) / 10000;
        uint256 ethAfterFee = msg.value - fee;

        uint256 tokensToSell = _calculateTokensForEth(ethAfterFee);
        require(tokensToSell > 0, "Insufficient ETH");
        require(tokensToSell <= tokenBalance, "Exceeds available supply");

        totalSold += tokensToSell;
        totalRaised += msg.value;  // track GROSS ETH for reserve accounting

        token.safeTransfer(msg.sender, tokensToSell);
        _splitFee(fee);

        emit TokenPurchased(msg.sender, msg.value, fee, tokensToSell, _currentPrice());

        if (totalRaised >= graduationCap) {
            _graduate();
        }
    }

    /**
     * @notice Buy exact number of tokens. Refunds excess ETH.
     */
    function buyExact(uint256 tokenAmount) external payable nonReentrant whenNotPaused {
        require(!isGraduated, "Already graduated");
        require(tokenAmount > 0, "Amount must be > 0");
        require(tokenAmount <= tokenBalance, "Exceeds available");

        uint256 cost = _calculateCostForTokens(tokenAmount);
        // cost = net eth. Total msg.value = cost + fee where fee = cost * 100 / 9900
        uint256 fee = (cost * TRADING_FEE_BPS) / (10000 - TRADING_FEE_BPS);
        uint256 totalCost = cost + fee;

        require(msg.value >= totalCost, "Insufficient ETH");

        totalSold += tokenAmount;
        totalRaised += totalCost;  // track GROSS ETH for reserve accounting
        tokenBalance -= tokenAmount;

        token.safeTransfer(msg.sender, tokenAmount);
        _splitFee(fee);

        // Refund excess
        if (msg.value > totalCost) {
            (bool refunded, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(refunded, "Refund failed");
        }

        emit TokenPurchased(msg.sender, totalCost, fee, tokenAmount, _currentPrice());

        if (totalRaised >= graduationCap) {
            _graduate();
        }
    }

    /**
     * @notice Sell tokens back to the bonding curve for ETH.
     */
    function sell(uint256 tokenAmount) external nonReentrant whenNotPaused {
        require(!isGraduated, "Already graduated, sell on DEX");
        require(tokenAmount > 0, "Amount must be > 0");
        require(totalSold >= tokenAmount, "Exceeds sold amount");

        // ethOut = gross ETH value of tokens being sold
        uint256 ethOut = _calculateEthForTokens(tokenAmount);
        require(ethOut > 0, "Token amount too small");

        // Cap ethOut to actual contract balance (fees were sent out)
        uint256 contractBalance = address(this).balance;
        if (ethOut > contractBalance) {
            ethOut = contractBalance;
        }

        uint256 fee = (ethOut * TRADING_FEE_BPS) / 10000;
        uint256 ethAfterFee = ethOut - fee;

        // Transfer tokens from seller
        token.safeTransferFrom(msg.sender, address(this), tokenAmount);

        // Update state
        totalSold -= tokenAmount;
        totalRaised -= ethOut;  // subtract gross to match gross tracking
        tokenBalance += tokenAmount;

        // Pay seller
        (bool sent, ) = msg.sender.call{value: ethAfterFee}("");
        require(sent, "ETH transfer failed");

        _splitFee(fee);

        emit TokenSold(msg.sender, tokenAmount, ethOut, fee, _currentPrice());
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    function currentPrice() external view returns (uint256) {
        return _currentPrice();
    }

    function estimateTokensForEth(uint256 ethAmount) external view returns (uint256) {
        uint256 fee = (ethAmount * TRADING_FEE_BPS) / 10000;
        return _calculateTokensForEth(ethAmount - fee);
    }

    function estimateEthForTokens(uint256 tokenAmount) external view returns (uint256) {
        uint256 cost = _calculateCostForTokens(tokenAmount);
        uint256 fee = (cost * TRADING_FEE_BPS) / (10000 - TRADING_FEE_BPS);
        return cost + fee; // total ETH needed including fee
    }

    function graduationProgress() external view returns (uint256) {
        if (graduationCap == 0) return 0;
        uint256 progress = (totalRaised * 10000) / graduationCap;
        return progress > 10000 ? 10000 : progress;
    }

    function canGraduate() external view returns (bool) {
        return !isGraduated && totalRaised >= graduationCap;
    }

    // ============================================================
    // FEE CLAIMING
    // ============================================================

    function claimFees() external {
        uint256 amount = pendingFees[msg.sender];
        require(amount > 0, "No pending fees");
        pendingFees[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        if (!sent) {
            pendingFees[msg.sender] = amount;
            revert("Claim failed");
        }
    }

    // ============================================================
    // INTERNAL — PRICE MATH
    // ============================================================

    function _currentPrice() internal view returns (uint256) {
        return basePrice + (slope * totalSold);
    }

    /**
     * @dev Solve quadratic: tokens = (sqrt(b^2 + 4*a*c) - b) / (2*a)
     *      where a=slope, b=2*(basePrice + slope*totalSold), c=ethAmount
     */
    function _calculateTokensForEth(uint256 ethAmount) internal view returns (uint256) {
        if (ethAmount == 0) return 0;

        // Convert totalSold from token-wei to token-count
        uint256 sold = totalSold / 1e18;

        // cost(T) = basePrice*T + slope*T²/2 = ethAmount
        // slope*T² + 2*(basePrice + slope*sold)*T - 2*ethAmount = 0
        // T = (sqrt(b² + 8*slope*ethAmount) - b) / (2*slope)
        uint256 a = slope;
        uint256 b = (basePrice * 2) + (slope * sold * 2);
        uint256 c = ethAmount * 8;

        uint256 discriminant = (b * b) + (a * c);
        uint256 sqrtDisc = _sqrt(discriminant);

        uint256 tokens = (sqrtDisc > b) ? (sqrtDisc - b) / (2 * a) : 0;
        return tokens * 1e18; // convert back to token-wei
    }

    /**
     * @dev cost(n) in wei. n is in token-wei, convert to token-count first.
     */
    function _calculateCostForTokens(uint256 n) internal view returns (uint256) {
        uint256 T = n / 1e18;
        uint256 sold = totalSold / 1e18;
        return (basePrice * T) + (slope * ((2 * sold * T) + (T * T))) / 2;
    }

    /**
     * @dev ETH received when selling n tokens from current totalSold.
     */
    function _calculateEthForTokens(uint256 n) internal view returns (uint256) {
        if (totalSold < n) return 0;
        uint256 start = (totalSold - n) / 1e18;
        uint256 T = n / 1e18;
        return (basePrice * T) + (slope * ((2 * start * T) + (T * T))) / 2;
    }

    // ============================================================
    // FEE SPLIT
    // ============================================================

    function _splitFee(uint256 fee) internal {
        if (fee == 0) return;

        uint256 creatorFee = (fee * FEE_SPLIT_CREATOR_BPS) / 10000;
        uint256 platformFee = fee - creatorFee;

        if (creatorFee > 0) {
            (bool sent, ) = creator.call{value: creatorFee}("");
            if (!sent) {
                pendingFees[creator] += creatorFee;
                emit FeeFailed(creator, creatorFee);
            }
        }

        if (platformFee > 0) {
            (bool sent, ) = platformWallet.call{value: platformFee}("");
            if (!sent) {
                pendingFees[platformWallet] += platformFee;
                emit FeeFailed(platformWallet, platformFee);
            }
        }
    }

    // ============================================================
    // GRADUATION
    // ============================================================

    function _graduate() internal {
        isGraduated = true;
        // ETH + remaining tokens stay in contract
        // Owner calls withdrawForLiquidity() to create DEX LP
        emit Graduated(address(this).balance, tokenBalance);
    }

    /**
     * @notice After graduation, withdraw ETH + tokens to create DEX LP.
     *         Only callable by owner (factory or creator who transferred ownership).
     */
    function withdrawForLiquidity() external onlyOwner {
        require(isGraduated, "Not graduated");
        uint256 ethBalance = address(this).balance;
        uint256 tokenBal = token.balanceOf(address(this));
        require(ethBalance > 0 || tokenBal > 0, "Nothing to withdraw");

        if (ethBalance > 0) {
            (bool sent, ) = platformWallet.call{value: ethBalance}("");
            require(sent, "ETH withdraw failed");
        }
        if (tokenBal > 0) {
            tokenBalance = 0;
            token.safeTransfer(platformWallet, tokenBal);
        }
    }

    /**
     * @notice Graduate to Uniswap V2 — add liquidity and burn LP tokens permanently.
     *         Only callable by owner after graduation.
     *         Sends all remaining ETH + tokens to Uniswap V2 as liquidity,
     *         then burns the LP tokens to a dead address (permanent lock).
     */
    function graduateToDEX() external onlyOwner {
        require(isGraduated, "Not graduated");
        require(dexRouter != address(0), "DEX router not set");
        require(!dexLiquidityAdded, "Already added");

        uint256 tokenAmount = token.balanceOf(address(this));
        uint256 ethAmount = address(this).balance;
        require(tokenAmount > 0 && ethAmount > 0, "No liquidity");

        // 1. Approve router to spend tokens
        token.safeApprove(dexRouter, tokenAmount);

        // 2. Add liquidity: tokens + ETH → LP token to this contract
        (uint256 amtToken, uint256 amtETH, uint256 liquidity) =
            IUniswapV2Router02(dexRouter).addLiquidityETH{value: ethAmount}(
                address(token),
                tokenAmount,
                tokenAmount,  // min token (accept any amount)
                ethAmount,    // min ETH (accept any amount)
                address(this),
                block.timestamp + 3600
            );

        dexLiquidityAdded = true;
        tokenBalance = 0;

        emit DEXLiquidityAdded(amtToken, amtETH, liquidity);

        // 3. Get pair address
        address factory = IUniswapV2Router02(dexRouter).factory();
        address weth = IUniswapV2Router02(dexRouter).WETH();
        address pair = IUniswapV2Factory(factory).getPair(address(token), weth);
        require(pair != address(0), "Pair not created");
        dexPairAddress = pair;

        // 4. Burn LP tokens permanently (send to dead address)
        uint256 lpBalance = IUniswapV2Pair(pair).balanceOf(address(this));
        if (lpBalance > 0) {
            IUniswapV2Pair(pair).transfer(address(0x000000000000000000000000000000000000dEaD), lpBalance);
        }

        emit DEXLiquidityBurned(pair);
    }

    /**
     * @notice Get the Uniswap V2 pair address for this token.
     *         Returns address(0) if not graduated or no router set.
     */
    function getDexPair() external view returns (address) {
        if (dexPairAddress != address(0)) return dexPairAddress;
        if (dexRouter == address(0)) return address(0);

        address factory = IUniswapV2Router02(dexRouter).factory();
        address weth = IUniswapV2Router02(dexRouter).WETH();
        return IUniswapV2Factory(factory).getPair(address(token), weth);
    }

    // ============================================================
    // ADMIN
    // ============================================================

    function togglePause() external onlyOwner {
        paused = !paused;
        emit PauseToggled(paused);
    }

    function initiateEmergency() external onlyOwner {
        require(paused, "Must be paused");
        require(emergencyTimelock == 0, "Already initiated");
        emergencyTimelock = block.timestamp + EMERGENCY_DELAY;
        emit EmergencyInitiated(emergencyTimelock);
    }

    function emergencyWithdraw() external onlyOwner {
        require(paused, "Must be paused");
        require(emergencyTimelock > 0, "Emergency not initiated");
        require(block.timestamp >= emergencyTimelock, "Timelock not expired");
        emergencyTimelock = 0;
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool sent, ) = platformWallet.call{value: balance}("");
        require(sent, "Withdraw failed");
    }

    function setPlatformWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        platformWallet = _wallet;
    }

    // ============================================================
    // MATH HELPERS
    // ============================================================

    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

}
