# Aave V3 Flash Loan - Hardhat Project

Complete implementation of a flash loan contract using Aave V3 on Ethereum mainnet.

## 📋 Project Structure

```
aave-flashloan/
├── contracts/
│   └── FlashLoanExecutor.sol
├── test/
│   └── FlashLoanExecutor.test.js
├── scripts/
│   └── deploy.js
├── hardhat.config.js
├── package.json
└── README.md
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-ethers hardhat-deploy hardhat-deploy-ethers
npm install @openzeppelin/contracts
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Run Tests

```bash
# Run all tests with mainnet fork
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test
npx hardhat test --grep "should execute flash loan"
```

### 4. Deploy

```bash
# Deploy to mainnet fork (testing)
npx hardhat run scripts/deploy.js --network hardhat

# Deploy to actual mainnet (requires funded account)
npx hardhat run scripts/deploy.js --network mainnet
```

## 📖 Contract Overview

### FlashLoanExecutor.sol

The contract implements Aave V3's `IFlashLoanSimpleReceiver` interface and provides:

- **Flash Loan Execution**: Borrows assets from Aave V3 pool
- **Custom Logic Hook**: `executeOperation` for your arbitrage/liquidation logic
- **Automatic Repayment**: Returns borrowed amount + premium in same transaction
- **Safety Features**: Only pool can call execution, comprehensive event logging
- **Graceful Failures**: Reverts entire transaction if repayment fails

### Key Functions

```solidity
// Request a flash loan
function requestFlashLoan(address asset, uint256 amount)

// Execute custom logic (override this for your use case)
function executeOperation(...)

// Withdraw profits (owner only)
function withdraw(address token)
```

### Events

```solidity
event FlashLoanRequested(address indexed asset, uint256 amount, address indexed initiator);
event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 totalRepayment);
event FundsWithdrawn(address indexed token, uint256 amount, address indexed recipient);
```

## 🧪 Test Coverage

The test suite covers:

1. ✅ **Successful Flash Loan Execution**: Borrows 1000 DAI, verifies repayment
2. ✅ **Event Emission**: Validates all events with correct parameters
3. ✅ **Premium Calculation**: Ensures correct fee calculation (0.05%)
4. ✅ **Reversion on Insufficient Funds**: Tests failure scenarios
5. ✅ **Authorization**: Only pool can call executeOperation
6. ✅ **Withdrawal**: Owner can withdraw profits
7. ✅ **Multiple Assets**: Tests with different tokens (DAI, USDC, WETH)

## 🔧 Extending for Arbitrage/Liquidations

### For Arbitrage:

Override `executeOperation` to:
1. Swap borrowed tokens on DEX A
2. Swap back on DEX B at better price
3. Keep the profit, repay the loan

```solidity
function executeOperation(
    address asset,
    uint256 amount,
    uint256 premium,
    address initiator,
    bytes calldata params
) external override returns (bool) {
    // 1. Decode parameters (DEX addresses, paths, etc.)
    // 2. Execute swaps
    // 3. Calculate profit
    // 4. Approve repayment
    // 5. Return true
}
```

### For Liquidations:

1. Borrow collateral token needed for liquidation
2. Call liquidation on lending protocol
3. Receive liquidation bonus
4. Repay flash loan
5. Keep profit

## 📊 Mainnet Addresses (Ethereum)

- **Aave V3 Pool**: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
- **DAI**: `0x6B175474E89094C44Da98b954EedeAC495271d0F`
- **USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **WETH**: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

## ⚠️ Security Considerations

1. **Always test on fork first**: Never deploy untested code to mainnet
2. **Start with small amounts**: Test with minimal amounts initially
3. **Monitor gas prices**: Flash loans can be expensive during high network activity
4. **Implement access controls**: Use `onlyOwner` for sensitive functions
5. **Add emergency pause**: Consider pausable pattern for production
6. **Audit before mainnet**: Have contracts audited for production use

## 💡 Gas Optimization Tips

- Use `calldata` instead of `memory` where possible
- Cache storage variables in memory
- Use custom errors instead of string reverts
- Batch operations when possible
- Consider using assembly for critical paths

## 📚 Additional Resources

- [Aave V3 Documentation](https://docs.aave.com/developers/guides/flash-loans)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## 🤝 Support

For issues or questions:
- Review test output for detailed error messages
- Check Aave V3 pool liquidity before large loans
- Ensure sufficient funds in contract for premium payment
- Verify RPC endpoint is working for mainnet fork

## 📄 License

MIT