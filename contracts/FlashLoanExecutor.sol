// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title IFlashLoanSimpleReceiver
 * @notice Interface for Aave V3 flash loan receiver
 * @dev Implement this interface to create a flash loan receiver contract
 */
interface IFlashLoanSimpleReceiver {
    /**
     * @notice Executes an operation after receiving the flash-borrowed asset
     * @param asset The address of the flash-borrowed asset
     * @param amount The amount of the flash-borrowed asset
     * @param premium The fee of the flash-borrowed asset
     * @param initiator The address of the flash loan initiator
     * @param params Arbitrary bytes-encoded params passed from the initiator
     * @return True if the execution of the operation succeeds, false otherwise
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);

    function ADDRESSES_PROVIDER() external view returns (address);
    function POOL() external view returns (address);
}

/**
 * @title IPoolAddressesProvider
 * @notice Interface for Aave V3 PoolAddressesProvider
 */
interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

/**
 * @title IPool
 * @notice Interface for Aave V3 Pool
 */
interface IPool {
    /**
     * @notice Allows users to access the liquidity of the pool for a flash loan
     * @param receiverAddress The address of the contract receiving the funds
     * @param asset The address of the asset being flash-borrowed
     * @param amount The amount of the asset being flash-borrowed
     * @param params Variadic packed params to pass to the receiver as extra information
     * @param referralCode Code used to register the integrator originating the operation
     */
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

/**
 * @title FlashLoanExecutor
 * @notice A contract that executes flash loans using Aave V3
 * @dev This contract borrows assets, executes custom logic, and repays within one transaction
 * @author Your Name
 */
contract FlashLoanExecutor is IFlashLoanSimpleReceiver, Ownable {
    using SafeERC20 for IERC20;

    // Aave V3 PoolAddressesProvider on Ethereum mainnet
    address public constant override ADDRESSES_PROVIDER =
        0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e;

    // Aave V3 Pool address (cached for gas efficiency)
    address public immutable override POOL;

    // Events for tracking flash loan operations
    event FlashLoanRequested(
        address indexed asset,
        uint256 amount,
        address indexed initiator
    );

    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 premium,
        uint256 totalRepayment
    );

    event FundsWithdrawn(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );

    /**
     * @notice Constructor initializes the contract with Aave V3 pool address
     * @dev Retrieves the pool address from the PoolAddressesProvider
     */
    constructor() Ownable(msg.sender) {
        // Fetch the current pool address from the provider
        // POOL = address(0);
        POOL = IPoolAddressesProvider(ADDRESSES_PROVIDER).getPool();
    }

    /**
     * @notice Requests a flash loan from Aave V3
     * @dev Only the contract owner can initiate flash loans
     * @param asset The address of the asset to borrow
     * @param amount The amount to borrow
     */
    function requestFlashLoan(
        address asset,
        uint256 amount
    ) external onlyOwner {
        // Validate inputs
        require(asset != address(0), "Invalid asset address");
        require(amount > 0, "Amount must be greater than 0");

        // Emit event for tracking
        emit FlashLoanRequested(asset, amount, msg.sender);

        // Prepare parameters (can be used to pass data to executeOperation)
        bytes memory params = "";

        // Initiate the flash loan
        // receiverAddress: this contract will receive the loan
        // asset: the token to borrow
        // amount: how much to borrow
        // params: additional data (empty in this case)
        // referralCode: 0 (no referral)
        IPool(POOL).flashLoanSimple(address(this), asset, amount, params, 0);
    }

    /**
     * @notice Executes the operation after receiving the flash loan
     * @dev This function is called by the Aave pool after transferring the borrowed amount
     * @param asset The address of the flash-borrowed asset
     * @param amount The amount of the flash-borrowed asset
     * @param premium The fee that must be paid back (0.05% on Aave V3)
     * @param initiator The address that initiated the flash loan
     * @param params Additional encoded parameters (if any)
     * @return bool Returns true to indicate successful execution
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external virtual override returns (bool) {
        // Security: Only the Aave pool can call this function
        require(msg.sender == POOL, "Caller must be the Aave pool");

        // Security: Only this contract can initiate flash loans
        require(initiator == address(this), "Initiator must be this contract");

        // At this point, the contract has received the borrowed funds
        // Current balance should be at least the borrowed amount
        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        require(currentBalance >= amount, "Did not receive borrowed funds");

        // ============================================
        // YOUR CUSTOM LOGIC GOES HERE
        // ============================================
        // Example use cases:
        // 1. Arbitrage: Swap tokens across DEXes for profit
        // 2. Liquidation: Liquidate undercollateralized positions
        // 3. Collateral swap: Change collateral type in one transaction
        // 4. Self-liquidation: Unwind your own position efficiently
        //
        // For this base implementation, we simply hold the funds
        // and prepare for repayment. Override this in derived contracts.
        // ============================================

        // Calculate total amount to repay (borrowed amount + premium)
        uint256 totalRepayment = amount + premium;

        // Ensure we have enough balance to repay
        // If your custom logic uses the borrowed funds, you must ensure
        // the contract ends up with at least 'totalRepayment' amount
        require(
            IERC20(asset).balanceOf(address(this)) >= totalRepayment,
            "Insufficient funds to repay flash loan"
        );

        // Approve the pool to pull the repayment amount
        // This is how the loan gets repaid - the pool will transfer the funds back
        // IERC20(asset).safeApprove(POOL, totalRepayment);
        IERC20(asset).safeIncreaseAllowance(POOL, totalRepayment);

        // Emit event for successful execution
        emit FlashLoanExecuted(asset, amount, premium, totalRepayment);

        // Return true to signal successful execution
        // Returning false will revert the entire transaction
        return true;
    }

    /**
     * @notice Allows the owner to withdraw tokens from the contract
     * @dev Use this to extract profits after successful flash loan operations
     * @param token The address of the token to withdraw
     */
    function withdraw(address token) external onlyOwner {
        uint256 balance;

        if (token == address(0)) {
            // Withdraw ETH
            balance = address(this).balance;
            require(balance > 0, "No ETH to withdraw");
            payable(owner()).transfer(balance);
        } else {
            // Withdraw ERC20 tokens
            balance = IERC20(token).balanceOf(address(this));
            require(balance > 0, "No tokens to withdraw");
            IERC20(token).safeTransfer(owner(), balance);
        }

        emit FundsWithdrawn(token, balance, owner());
    }

    /**
     * @notice Returns the balance of a specific token in this contract
     * @param token The address of the token to check
     * @return uint256 The token balance
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Allows the contract to receive ETH
     * @dev Necessary if you're working with WETH or receiving ETH
     */
    receive() external payable {}
}
