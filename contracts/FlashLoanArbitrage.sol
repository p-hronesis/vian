// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FlashLoanExecutor.sol";

/**
 * @title IUniswapV2Router
 * @notice Minimal interface for Uniswap V2 style DEX router
 */
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

/**
 * @title FlashLoanArbitrage
 * @notice Example contract demonstrating arbitrage between two DEXes using flash loans
 * @dev This is a TEMPLATE - you must add proper profitability checks and slippage protection
 *
 * WARNING: This is for educational purposes. Do NOT deploy to mainnet without:
 * 1. Thorough testing on forked network
 * 2. Proper profitability calculations
 * 3. MEV protection mechanisms
 * 4. Slippage protection
 * 5. Security audit
 */
contract FlashLoanArbitrage is FlashLoanExecutor {
    using SafeERC20 for IERC20;
    
    // Uniswap V2 Router on Ethereum mainnet
    address public constant UNISWAP_ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    // SushiSwap Router on Ethereum mainnet
    address public constant SUSHISWAP_ROUTER =
        0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    // Event for tracking arbitrage execution
    event ArbitrageExecuted(
        address indexed tokenBorrowed,
        address indexed tokenTarget,
        uint256 amountBorrowed,
        uint256 profit
    );

    /**
     * @notice Execute arbitrage between two DEXes
     * @param tokenBorrow The token to borrow via flash loan
     * @param tokenTarget The token to arbitrage against
     * @param amount Amount to borrow
     * @param minProfit Minimum profit required (reverts if not met)
     */
    function executeArbitrage(
        address tokenBorrow,
        address tokenTarget,
        uint256 amount,
        uint256 minProfit
    ) external onlyOwner {
        // Encode parameters to pass to executeOperation
        bytes memory params = abi.encode(tokenTarget, minProfit);

        // Request flash loan
        IPool(POOL).flashLoanSimple(
            address(this),
            tokenBorrow,
            amount,
            params,
            0
        );
    }

    /**
     * @notice Override executeOperation to implement arbitrage logic
     * @dev This is called by Aave after receiving the flash loan
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Security checks
        require(msg.sender == POOL, "Caller must be the Aave pool");
        require(initiator == address(this), "Initiator must be this contract");

        // Decode parameters
        (address tokenTarget, uint256 minProfit) = abi.decode(
            params,
            (address, uint256)
        );

        // ============================================
        // ARBITRAGE LOGIC
        // ============================================

        // Step 1: Swap borrowed token to target token on DEX 1 (Uniswap)
        uint256 targetTokenReceived = _swapOnUniswap(
            asset,
            tokenTarget,
            amount
        );

        // Step 2: Swap target token back to borrowed token on DEX 2 (Sushiswap)
        uint256 borrowedTokenReceived = _swapOnSushiswap(
            tokenTarget,
            asset,
            targetTokenReceived
        );

        // Step 3: Calculate profit (after repaying loan + premium)
        uint256 totalRepayment = amount + premium;
        require(
            borrowedTokenReceived >= totalRepayment,
            "Insufficient funds to repay flash loan"
        );

        uint256 profit = borrowedTokenReceived - totalRepayment;

        // Step 4: Ensure minimum profit requirement is met
        require(profit >= minProfit, "Profit below minimum threshold");

        // ============================================
        // END ARBITRAGE LOGIC
        // ============================================

        // Approve repayment
        // IERC20(asset).safeApprove(POOL, totalRepayment);
        IERC20(asset).safeIncreaseAllowance(POOL, totalRepayment);

        // Emit events
        emit FlashLoanExecuted(asset, amount, premium, totalRepayment);
        emit ArbitrageExecuted(asset, tokenTarget, amount, profit);

        return true;
    }

    /**
     * @notice Swap tokens on Uniswap V2
     * @dev Internal helper function
     */
    function _swapOnUniswap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256) {
        // Approve router to spend tokens
        // IERC20(tokenIn).safeApprove(UNISWAP_ROUTER, amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(UNISWAP_ROUTER, amountIn);

        // Setup swap path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        // Execute swap (with minimal slippage protection - improve for production!)
        uint256[] memory amounts = IUniswapV2Router(UNISWAP_ROUTER)
            .swapExactTokensForTokens(
                amountIn,
                1, // minAmountOut - SET PROPER SLIPPAGE PROTECTION!
                path,
                address(this),
                block.timestamp + 300 // 5 minute deadline
            );

        return amounts[1];
    }

    /**
     * @notice Swap tokens on SushiSwap
     * @dev Internal helper function
     */
    function _swapOnSushiswap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256) {
        // Approve router to spend tokens
        // IERC20(tokenIn).safeApprove(SUSHISWAP_ROUTER, amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(SUSHISWAP_ROUTER, amountIn);

        // Setup swap path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        // Execute swap
        uint256[] memory amounts = IUniswapV2Router(SUSHISWAP_ROUTER)
            .swapExactTokensForTokens(
                amountIn,
                1, // minAmountOut - SET PROPER SLIPPAGE PROTECTION!
                path,
                address(this),
                block.timestamp + 300
            );

        return amounts[1];
    }

    /**
     * @notice Simulate arbitrage opportunity (view function)
     * @dev Call this off-chain to check if arbitrage is profitable
     * @return profit The expected profit from the arbitrage
     * @return profitable Whether the arbitrage is profitable after fees
     */
    function simulateArbitrage(
        address tokenBorrow,
        address tokenTarget,
        uint256 amount
    ) external view returns (uint256 profit, bool profitable) {
        // Calculate Aave premium (0.05%)
        uint256 premium = (amount * 5) / 10000;

        // Setup paths
        address[] memory pathUniswap = new address[](2);
        pathUniswap[0] = tokenBorrow;
        pathUniswap[1] = tokenTarget;

        address[] memory pathSushiswap = new address[](2);
        pathSushiswap[0] = tokenTarget;
        pathSushiswap[1] = tokenBorrow;

        // Get expected amounts from Uniswap
        uint256[] memory amountsUniswap = IUniswapV2Router(UNISWAP_ROUTER)
            .getAmountsOut(amount, pathUniswap);

        // Get expected amounts from Sushiswap
        uint256[] memory amountsSushiswap = IUniswapV2Router(SUSHISWAP_ROUTER)
            .getAmountsOut(amountsUniswap[1], pathSushiswap);

        // Calculate profit
        uint256 received = amountsSushiswap[1];
        uint256 repayment = amount + premium;

        if (received > repayment) {
            profit = received - repayment;
            profitable = true;
        } else {
            profit = 0;
            profitable = false;
        }
    }
}

/**
 * @title USAGE NOTES
 *
 * 1. BEFORE DEPLOYING:
 *    - Test extensively on mainnet fork
 *    - Add proper slippage protection (currently set to 1 wei!)
 *    - Implement MEV protection
 *    - Add circuit breakers
 *    - Get security audit
 *
 * 2. TO USE:
 *    - Call simulateArbitrage() off-chain to find opportunities
 *    - When profitable opportunity found, call executeArbitrage()
 *    - Withdraw profits using withdraw() function
 *
 * 3. GAS OPTIMIZATION:
 *    - Consider using assembly for critical paths
 *    - Batch multiple arbitrages if possible
 *    - Use Flashbots to avoid front-running
 *
 * 4. RISK FACTORS:
 *    - Slippage during execution
 *    - MEV bots front-running your transaction
 *    - Gas price volatility
 *    - Flash loan premium (0.05% on Aave)
 *    - DEX liquidity changes between simulation and execution
 */
