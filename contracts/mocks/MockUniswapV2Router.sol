// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockUniswapV2Router
 * @notice Mock for testing graduateToDEX().
 *         Does NOT actually transfer tokens — just tracks calls and mints LP.
 *         BondingCurve handles its own token accounting (tokenBalance = 0).
 */
contract MockUniswapV2Router {
    address public immutable WETH;
    address public immutable _factory;

    // Track calls
    uint256 public lastAmountToken;
    uint256 public lastAmountETH;
    address public lastToken;

    // LP token tracking
    mapping(address => uint256) public balanceOf;

    constructor(address _weth) {
        WETH = _weth;
        _factory = address(this);
    }

    function factory() external view returns (address) {
        return _factory;
    }

    function getPair(address, address) external view returns (address) {
        return address(this);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        // Don't actually transfer tokens — curve handles its own accounting
        lastToken = token;
        lastAmountToken = amountTokenDesired;
        lastAmountETH = msg.value;
        liquidity = amountTokenDesired + msg.value;

        // Mint LP tokens to recipient
        balanceOf[to] += liquidity;
        amountToken = amountTokenDesired;
        amountETH = msg.value;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient LP");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }

    function token0() external view returns (address) {
        return lastToken;
    }

    receive() external payable {}
}
