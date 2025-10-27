# Flash Loan Executor - Complete Usage Guide

## 📚 Table of Contents

1. [Initial Setup](#initial-setup)
2. [Running Tests](#running-tests)
3. [Deploying the Contract](#deploying-the-contract)
4. [Executing Flash Loans](#executing-flash-loans)
5. [Extending for Arbitrage](#extending-for-arbitrage)
6. [Extending for Liquidations](#extending-for-liquidations)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Topics](#advanced-topics)

---

## Initial Setup

### 1. Install Dependencies

```bash
# Initialize npm project
npm init -y

# Install required packages
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-ethers hardhat-deploy hardhat-deploy-ethers dotenv

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts
```

### 2. Initialize Hardhat

```bash
npx hardhat init
# Select "Create an empty hardhat.config.js"
```

### 3. Configure Environment

Create `.env` file:

```env
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
REPORT_GAS=true
```

**Important:** Add `.env` to your `.gitignore`!

### 4. Project Structure

Create the following structure:

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
├── .env
└── .gitignore
```

---

## Running Tests

### Run All Tests

```bash
npx hardhat test
```

### Run with Gas Reporting

```bash
REPORT_GAS=true npx hardhat test
```

### Run Specific Test

```bash
npx hardhat test --grep "should execute flash loan"
```

### Expected Test Output

```
FlashLoanExecutor
  Deployment
    ✓ Should set the correct owner
    ✓ Should set the correct Aave pool address
    ✓ Should set the correct AddressesProvider
  Flash Loan Execution - DAI
    ✓ Should successfully execute a flash loan with DAI (156ms)
    ✓ Should emit FlashLoanRequested event (134ms)
    ✓ Should emit FlashLoanExecuted event with correct parameters (145ms)
    ✓ Should calculate premium correctly (0.05%) (132ms)
  Flash Loan Execution - USDC
    ✓ Should successfully execute a flash loan with USDC (128ms)
    ✓ Should handle USDC decimals correctly (119ms)
  Failure Scenarios
    ✓ Should revert when insufficient funds to pay premium
    ✓ Should revert if non-owner tries to request flash loan
    ✓ Should revert with zero amount
    ✓ Should revert with invalid asset address
  Withdrawal Functions
    ✓ Should allow owner to withdraw DAI (98ms)
    ✓ Should allow owner to withdraw USDC (87ms)
    ✓ Should revert if non-owner tries to withdraw
    ✓ Should revert when withdrawing with zero balance

  17 passing (2.3s)
```

---

## Deploying the Contract

### Deploy to Local Fork (Testing)

```bash
# Start a local Hardhat node with mainnet fork
npx hardhat node

# In another terminal, deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Deploy to Mainnet

```bash
# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS>
```

### Deployment Output

```
Starting deployment of FlashLoanExecutor...

Deploying contracts with account: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Account balance: 1.5 ETH

Deploying FlashLoanExecutor...
FlashLoanExecutor deployed to: 0x1234567890123456789012345678901234567890
Deployment transaction hash: 0xabcdef...
Gas used for deployment: 1234567
Deployment block number: 18500123

=== Contract Configuration ===
Owner: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Aave V3 Pool: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
Addresses Provider: 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
✓ Pool address verified (Ethereum mainnet)

=== Deployment Complete ===
```

---

## Executing Flash Loans

### Using Ethers.js (Script)

Create `scripts/executeFlashLoan.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x..."; // Your deployed contract
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  
  // Connect to contract
  const flashLoan = await ethers.getContractAt(
    "FlashLoanExecutor",
    CONTRACT_ADDRESS
  );

  // Amount to borrow (1000 DAI)
  const amount = ethers.parseEther("1000");

  // Calculate premium (0.05%)
  const premium = (amount * 5n) / 10000n;

  console.log("Loan Amount:", ethers.formatEther(amount), "DAI");
  console.log("Premium:", ethers.formatEther(premium), "DAI");

  // Step 1: Fund contract with premium
  const dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
  const fundTx = await dai.transfer(CONTRACT_ADDRESS, premium);
  await fundTx.wait();
  console.log("✓ Contract funded with premium");

  // Step 2: Execute flash loan
  console.log("Executing flash loan...");
  const tx = await flashLoan.requestFlashLoan(DAI_ADDRESS, amount);
  const receipt = await tx.wait();
  
  console.log("✓ Flash loan executed successfully!");
  console.log("Transaction hash:", receipt.hash);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Step 3: Check events
  const events = receipt.logs;
  console.log(`Emitted ${events.length} events`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run the script:

```bash
npx hardhat run scripts/executeFlashLoan.js --network mainnet
```

### Using Hardhat Console

```bash
# Start console connected to mainnet fork
npx hardhat console --network hardhat

# In console:
const FlashLoan = await ethers.getContractFactory("FlashLoanExecutor");
const flashLoan = await FlashLoan.deploy();
await flashLoan.waitForDeployment();

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const amount = ethers.parseEther("1000");

// Fund with premium first
const premium = (amount * 5n) / 10000n;
// ... fund contract with DAI ...

// Execute flash loan
await flashLoan.requestFlashLoan(DAI, amount);
```

### Flash Loan Flow Diagram

```
1. Owner calls requestFlashLoan(asset, amount)
   ↓
2. Contract calls Aave Pool.flashLoanSimple()
   ↓
3. Aave transfers 'amount' of asset to contract
   ↓
4. Aave calls contract.executeOperation()
   ↓
5. Contract executes custom logic (arbitrage, etc.)
   ↓
6. Contract approves Aave to pull back (amount + premium)
   ↓
7. Aave transfers repayment from contract
   ↓
8. Transaction completes or reverts entirely
```

---

## Extending for Arbitrage

### Strategy Overview

Flash loan arbitrage exploits price differences between DEXes:

1. **Borrow** Token A from Aave
2. **Swap** Token A → Token B on DEX 1 (lower price)
3. **Swap** Token B → Token A on DEX 2 (higher price)
4. **Repay** loan + premium
5. **Keep** the profit

### Implementation Steps

#### 1. Create Extended Contract

See `FlashLoanArbitrage.sol` for full implementation example.

#### 2. Find Arbitrage Opportunities

Create `scripts/findArbitrage.js`:

```javascript
const { ethers } = require("hardhat");

async function findArbitrageOpportunity() {
  const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const SUSHISWAP_ROUTER = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
  
  const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  
  const uniswapRouter = await ethers.getContractAt(
    "IUniswapV2Router",
    UNISWAP_ROUTER
  );
  
  const sushiswapRouter = await ethers.getContractAt(
    "IUniswapV2Router",
    SUSHISWAP_ROUTER
  );

  const amount = ethers.parseEther("1000"); // 1000 DAI

  // Get price on Uniswap
  const pathUni = [DAI, USDC];
  const amountsUni = await uniswapRouter.getAmountsOut(amount, pathUni);
  
  // Get price on Sushiswap
  const pathSushi = [USDC, DAI];
  const amountsSushi = await sushiswapRouter.getAmountsOut(
    amountsUni[1],
    pathSushi
  );

  // Calculate profit
  const premium = (amount * 5n) / 10000n;
  const repayment = amount + premium;
  const received = amountsSushi[1];
  
  if (received > repayment) {
    const profit = received - repayment;
    console.log("✓ ARBITRAGE OPPORTUNITY FOUND!");
    console.log("Profit:", ethers.formatEther(profit), "DAI");
    console.log("ROI:", ((profit * 10000n) / amount).toString() / 100, "%");
    return true;
  } else {
    console.log("✗ No profitable arbitrage at this time");
    return false;
  }
}

findArbitrageOpportunity();
```

#### 3. Execute Arbitrage

```javascript
// In your script or bot
const arbitrageContract = await ethers.getContractAt(
  "FlashLoanArbitrage",
  CONTRACT_ADDRESS
);

// Simulate first
const [profit, isProfitable] = await arbitrageContract.simulateArbitrage(
  DAI_ADDRESS,
  USDC_ADDRESS,
  ethers.parseEther("1000")
);

if (isProfitable) {
  console.log("Expected profit:", ethers.formatEther(profit), "DAI");
  
  // Execute
  const minProfit = ethers.parseEther("1"); // Minimum 1 DAI profit
  const tx = await arbitrageContract.executeArbitrage(
    DAI_ADDRESS,
    USDC_ADDRESS,
    ethers.parseEther("1000"),
    minProfit
  );
  
  await tx.wait();
  console.log("Arbitrage executed!");
}
```

### Arbitrage Bot Template

```javascript
const { ethers } = require("hardhat");

class ArbitrageBot {
  constructor(contractAddress) {
    this.contractAddress = contractAddress;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.log("🤖 Arbitrage bot started");
    
    while (this.isRunning) {
      try {
        await this.checkOpportunity();
        await new Promise(resolve => setTimeout(resolve, 12000)); // Every block
      } catch (error) {
        console.error("Error:", error.message);
      }
    }
  }

  async checkOpportunity() {
    const contract = await ethers.getContractAt(
      "FlashLoanArbitrage",
      this.contractAddress
    );

    // Check DAI/USDC arbitrage
    const [profit, profitable] = await contract.simulateArbitrage(
      DAI_ADDRESS,
      USDC_ADDRESS,
      ethers.parseEther("10000")
    );

    if (profitable && profit > ethers.parseEther("10")) {
      console.log("💰 Opportunity found! Executing...");
      await this.executeArbitrage(contract, profit);
    }
  }

  async executeArbitrage(contract, expectedProfit) {
    const minProfit = (expectedProfit * 90n) / 100n; // 90% of expected
    
    const tx = await contract.executeArbitrage(
      DAI_ADDRESS,
      USDC_ADDRESS,
      ethers.parseEther("10000"),
      minProfit,
      { gasLimit: 500000 }
    );

    const receipt = await tx.wait();
    console.log("✓ Arbitrage successful! TX:", receipt.hash);
  }

  stop() {
    this.isRunning = false;
    console.log("🛑 Bot stopped");
  }
}

// Usage
const bot = new ArbitrageBot(CONTRACT_ADDRESS);
bot.start();
```

---

## Extending for Liquidations

### Strategy Overview

Flash loans can efficiently liquidate undercollateralized positions:

1. **Borrow** collateral token (e.g., WETH) from Aave
2. **Liquidate** position on lending protocol (e.g., Compound, Aave)
3. **Receive** liquidation bonus + collateral
4. **Sell** collateral for borrowed token
5. **Repay** flash loan
6. **Keep** the liquidation bonus profit

### Implementation

Create `FlashLoanLiquidation.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FlashLoanExecutor.sol";

interface ILendingProtocol {
    function liquidate(
        address borrower,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external;
}

contract FlashLoanLiquidation is FlashLoanExecutor {
    
    event LiquidationExecuted(
        address indexed borrower,
        address indexed collateral,
        address indexed debt,
        uint256 profit
    );

    function executeLiquidation(
        address protocol,
        address borrower,
        address collateralAsset,
        address debtAsset,
        uint256 debtAmount
    ) external onlyOwner {
        bytes memory params = abi.encode(
            protocol,
            borrower,
            collateralAsset,
            debtAsset
        );
        
        IPool(POOL).flashLoanSimple(
            address(this),
            debtAsset,
            debtAmount,
            params,
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == POOL, "Caller must be the Aave pool");
        require(initiator == address(this), "Initiator must be this contract");

        (
            address protocol,
            address borrower,
            address collateralAsset,
            address debtAsset
        ) = abi.decode(params, (address, address, address, address));

        // Step 1: Approve lending protocol to take debt tokens
        IERC20(debtAsset).safeApprove(protocol, amount);

        // Step 2: Liquidate position
        ILendingProtocol(protocol).liquidate(
            borrower,
            collateralAsset,
            debtAsset,
            amount
        );

        // Step 3: We now have collateral tokens
        uint256 collateralReceived = IERC20(collateralAsset).balanceOf(
            address(this)
        );

        // Step 4: Swap collateral back to debt asset (implement DEX swap)
        // ... swap logic here ...

        // Step 5: Ensure we can repay
        uint256 totalRepayment = amount + premium;
        require(
            IERC20(asset).balanceOf(address(this)) >= totalRepayment,
            "Insufficient funds to repay"
        );

        // Step 6: Approve repayment
        IERC20(asset).safeApprove(POOL, totalRepayment);

        uint256 profit = IERC20(asset).balanceOf(address(this)) - totalRepayment;
        emit LiquidationExecuted(borrower, collateralAsset, debtAsset, profit);

        return true;
    }
}
```

### Finding Liquidation Opportunities

```javascript
async function findLiquidations() {
  const aavePool = await ethers.getContractAt("IPool", AAVE_POOL_ADDRESS);
  
  // Monitor health factors
  // Health factor < 1.0 means liquidatable
  const users = await getUsersFromSubgraph(); // Use The Graph
  
  for (const user of users) {
    const userData = await aavePool.getUserAccountData(user);
    const healthFactor = userData.healthFactor;
    
    if (healthFactor < ethers.parseEther("1")) {
      console.log(`Liquidatable user found: ${user}`);
      console.log(`Health factor: ${ethers.formatEther(healthFactor)}`);
      // Execute liquidation
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Insufficient funds to repay flash loan"

**Cause:** Contract doesn't have enough tokens to pay premium

**Solution:**
```javascript
// Calculate and fund premium before executing
const premium = (amount * 5n) / 10000n;
await dai.transfer(contractAddress, premium);
```

#### 2. "Caller must be the Aave pool"

**Cause:** Direct call to `executeOperation()` (only pool should call this)

**Solution:** Always use `requestFlashLoan()`, never call `executeOperation()` directly

#### 3. Tests Failing with RPC Errors

**Cause:** Mainnet fork RPC issues

**Solution:**
```javascript
// In hardhat.config.js, use a stable RPC
forking: {
  url: process.env.MAINNET_RPC_URL,
  blockNumber: 18500000, // Pin to specific block
}
```

#### 4. "Transaction Reverted" During Flash Loan

**Cause:** Custom logic in `executeOperation()` failed

**Solution:** Add detailed logging:
```solidity
console.log("Balance before:", IERC20(asset).balanceOf(address(this)));
// ... your logic ...
console.log("Balance after:", IERC20(asset).balanceOf(address(this)));
```

#### 5. High Gas Costs

**Cause:** Inefficient contract or network congestion

**Solution:**
- Use gas profiler: `REPORT_GAS=true npx hardhat test`
- Optimize storage reads
- Use Flashbots to avoid front-running
- Execute during low-gas periods

---

## Advanced Topics

### 1. MEV Protection

Use Flashbots to avoid front-running:

```javascript
const { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle");

const flashbotsProvider = await FlashbotsBundleProvider.create(
  provider,
  authSigner,
  "https://relay.flashbots.net"
);

const signedBundle = await flashbotsProvider.signBundle([
  {
    signer: wallet,
    transaction: await flashLoan.populateTransaction.requestFlashLoan(
      DAI_ADDRESS,
      amount
    ),
  },
]);

const simulation = await flashbotsProvider.simulate(
  signedBundle,
  targetBlockNumber
);

if (simulation.firstRevert) {
  console.log("Simulation failed:", simulation.firstRevert);
} else {
  const bundleSubmission = await flashbotsProvider.sendRawBundle(
    signedBundle,
    targetBlockNumber
  );
  console.log("Bundle submitted:", bundleSubmission.bundleHash);
}
```

### 2. Multi-Asset Flash Loans

Borrow multiple assets simultaneously:

```solidity
// Use flashLoan() instead of flashLoanSimple()
function requestMultiAssetFlashLoan(
    address[] calldata assets,
    uint256[] calldata amounts
) external onlyOwner {
    uint256[] memory modes = new uint256[](assets.length);
    // modes[i] = 0 means no debt, must repay in same transaction
    
    IPool(POOL).flashLoan(
        address(this),
        assets,
        amounts,
        modes,
        address(this),
        "",
        0
    );
}
```

### 3. Gas Optimization

```solidity
// Use custom errors instead of strings
error InsufficientFunds();
error Unauthorized();

// Cache storage variables
address poolCached = POOL;

// Use calldata instead of memory
function execute(bytes calldata data) external {
    // ...
}

// Batch approve operations
IERC20(token).approve(spender, type(uint256).max);
```

### 4. Monitoring and Alerts

Set up monitoring with Discord/Telegram webhooks:

```javascript
async function sendAlert(message) {
  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `🚨 **Flash Loan Alert** 🚨\n${message}`
    })
  });
}

// In your bot
if (profitable) {
  await sendAlert(`Profit opportunity: ${profit} DAI`);
  await executeArbitrage();
}
```

### 5. Emergency Functions

Add pause/unpause functionality:

```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract FlashLoanExecutor is IFlashLoanSimpleReceiver, Ownable, Pausable {
    function requestFlashLoan(address asset, uint256 amount) 
        external 
        onlyOwner 
        whenNotPaused 
    {
        // ...
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
```

---

## Production Checklist

Before deploying to mainnet:

- [ ] All tests passing
- [ ] Tested on mainnet fork with real data
- [ ] Gas optimization completed
- [ ] Security audit performed
- [ ] Access controls verified
- [ ] Emergency pause implemented
- [ ] Monitoring/alerts configured
- [ ] MEV protection added
- [ ] Slippage protection configured
- [ ] Profitability thresholds set
- [ ] Documentation complete
- [ ] Team reviewed code
- [ ] Contract verified on Etherscan
- [ ] Start with small amounts

---

## Resources

- **Aave V3 Docs**: https://docs.aave.com/developers/
- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin**: https://docs.openzeppelin.com/
- **Flashbots**: https://docs.flashbots.net/
- **DeFi Dev Resources**: https://github.com/OffcierCia/DeFi-Developer-Road-Map

---

## Support

For questions or issues:
1. Check test output for detailed errors
2. Review Aave pool liquidity
3. Verify RPC endpoint connectivity
4. Check contract balance before operations
5. Review transaction on Etherscan

Happy flash loaning! 🚀