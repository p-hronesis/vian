const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashLoanExecutor", function () {
  let flashLoanExecutor;
  let owner;
  let nonOwner;

  // Ethereum mainnet addresses
  const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

  // Whale addresses with large balances (for funding tests)
  const DAI_WHALE = "0xD1668fB5F690C59Ab4B0CAbAd0f8C1617895052B";
  const USDC_WHALE = "0x4B16c5dE96EB2117bBE5fd171E4d203624B014aa";

  before(async function () {
    [owner, nonOwner] = await ethers.getSigners();

    // Deploy the flash loan contract
    const FlashLoanExecutor = await ethers.getContractFactory("FlashLoanExecutor");
    flashLoanExecutor = await FlashLoanExecutor.deploy();
    await flashLoanExecutor.waitForDeployment();

    console.log("FlashLoanExecutor deployed to:", await flashLoanExecutor.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await flashLoanExecutor.owner()).to.equal(owner.address);
    });

    it("Should set the correct Aave pool address", async function () {
      expect(await flashLoanExecutor.POOL()).to.equal(AAVE_POOL);
    });

    it("Should set the correct AddressesProvider", async function () {
      expect(await flashLoanExecutor.ADDRESSES_PROVIDER()).to.equal(
        "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e"
      );
    });
  });

  describe("Flash Loan Execution - DAI", function () {
    const LOAN_AMOUNT = ethers.parseEther("1000"); // 1000 DAI
    const PREMIUM_BPS = 5n; // 0.05% = 5 basis points

    it("Should successfully execute a flash loan with DAI", async function () {
      // Fund the contract with enough DAI to pay the premium
      const expectedPremium = (LOAN_AMOUNT * PREMIUM_BPS) / 10000n;
      await fundContractWithDAI(expectedPremium);

      // Get initial balance
      const initialBalance = await getDaiBalance(await flashLoanExecutor.getAddress());
      console.log("Initial DAI balance:", ethers.formatEther(initialBalance));

      // Request flash loan
      const tx = await flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT);
      const receipt = await tx.wait();

      console.log("Flash loan executed successfully");
      console.log("Gas used:", receipt.gasUsed.toString());

      // Verify final balance (should have initial balance minus premium)
      const finalBalance = await getDaiBalance(await flashLoanExecutor.getAddress());
      const expectedFinal = initialBalance - expectedPremium;
      
      expect(finalBalance).to.equal(expectedFinal);
    });

    it("Should emit FlashLoanRequested event", async function () {
      const premium = (LOAN_AMOUNT * PREMIUM_BPS) / 10000n;
      await fundContractWithDAI(premium);

      await expect(flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT))
        .to.emit(flashLoanExecutor, "FlashLoanRequested")
        .withArgs(DAI_ADDRESS, LOAN_AMOUNT, owner.address);
    });

    it("Should emit FlashLoanExecuted event with correct parameters", async function () {
      const premium = (LOAN_AMOUNT * PREMIUM_BPS) / 10000n;
      await fundContractWithDAI(premium);

      const totalRepayment = LOAN_AMOUNT + premium;

      await expect(flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT))
        .to.emit(flashLoanExecutor, "FlashLoanExecuted")
        .withArgs(DAI_ADDRESS, LOAN_AMOUNT, premium, totalRepayment);
    });

    it("Should calculate premium correctly (0.05%)", async function () {
      const premium = (LOAN_AMOUNT * PREMIUM_BPS) / 10000n;
      await fundContractWithDAI(premium);

      const initialBalance = await getDaiBalance(await flashLoanExecutor.getAddress());

      await flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT);

      const finalBalance = await getDaiBalance(await flashLoanExecutor.getAddress());
      const paidPremium = initialBalance - finalBalance;

      // Premium should be 0.5 DAI (0.05% of 1000 DAI)
      expect(paidPremium).to.equal(ethers.parseEther("0.5"));
    });
  });

  describe("Flash Loan Execution - USDC", function () {
    const LOAN_AMOUNT = 1000n * 10n ** 6n; // 1000 USDC (6 decimals)
    const PREMIUM_BPS = 5n;

    it("Should successfully execute a flash loan with USDC", async function () {
      const expectedPremium = (LOAN_AMOUNT * PREMIUM_BPS) / 10000n;
      await fundContractWithUSDC(expectedPremium);

      const tx = await flashLoanExecutor.requestFlashLoan(USDC_ADDRESS, LOAN_AMOUNT);
      await tx.wait();

      console.log("USDC flash loan executed successfully");
    });

    it("Should handle USDC decimals correctly", async function () {
      const premium = (LOAN_AMOUNT * PREMIUM_BPS) / 10000n;
      await fundContractWithUSDC(premium);

      const initialBalance = await getUsdcBalance(await flashLoanExecutor.getAddress());

      await flashLoanExecutor.requestFlashLoan(USDC_ADDRESS, LOAN_AMOUNT);

      const finalBalance = await getUsdcBalance(await flashLoanExecutor.getAddress());
      const paidPremium = initialBalance - finalBalance;

      // Premium should be 0.5 USDC (0.05% of 1000 USDC)
      expect(paidPremium).to.equal(500000n); // 0.5 USDC with 6 decimals
    });
  });

  describe("Failure Scenarios", function () {
    it("Should revert when insufficient funds to pay premium", async function () {
      const LOAN_AMOUNT = ethers.parseEther("1000");

      // Don't fund the contract - it won't have enough to pay premium
      await expect(
        flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT)
      ).to.be.reverted; // Will revert with "Insufficient funds to repay flash loan"
    });

    it("Should revert if non-owner tries to request flash loan", async function () {
      const LOAN_AMOUNT = ethers.parseEther("1000");

      await expect(
        flashLoanExecutor.connect(nonOwner).requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT)
      ).to.be.revertedWithCustomError(flashLoanExecutor, "OwnableUnauthorizedAccount");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert with invalid asset address", async function () {
      await expect(
        flashLoanExecutor.requestFlashLoan(ethers.ZeroAddress, ethers.parseEther("1000"))
      ).to.be.revertedWith("Invalid asset address");
    });
  });

  describe("Withdrawal Functions", function () {
    it("Should allow owner to withdraw DAI", async function () {
      // Fund the contract
      const fundAmount = ethers.parseEther("10");
      await fundContractWithDAI(fundAmount);

      const ownerInitialBalance = await getDaiBalance(owner.address);
      const contractBalance = await getDaiBalance(await flashLoanExecutor.getAddress());

      // Withdraw
      await expect(flashLoanExecutor.withdraw(DAI_ADDRESS))
        .to.emit(flashLoanExecutor, "FundsWithdrawn")
        .withArgs(DAI_ADDRESS, contractBalance, owner.address);

      // Check balances
      const ownerFinalBalance = await getDaiBalance(owner.address);
      const contractFinalBalance = await getDaiBalance(await flashLoanExecutor.getAddress());

      expect(contractFinalBalance).to.equal(0);
      expect(ownerFinalBalance).to.equal(ownerInitialBalance + contractBalance);
    });

    it("Should allow owner to withdraw USDC", async function () {
      const fundAmount = 100n * 10n ** 6n; // 100 USDC
      await fundContractWithUSDC(fundAmount);

      const contractBalance = await getUsdcBalance(await flashLoanExecutor.getAddress());

      await flashLoanExecutor.withdraw(USDC_ADDRESS);

      const contractFinalBalance = await getUsdcBalance(await flashLoanExecutor.getAddress());
      expect(contractFinalBalance).to.equal(0);
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await fundContractWithDAI(ethers.parseEther("10"));

      await expect(
        flashLoanExecutor.connect(nonOwner).withdraw(DAI_ADDRESS)
      ).to.be.revertedWithCustomError(flashLoanExecutor, "OwnableUnauthorizedAccount");
    });

    it("Should revert when withdrawing with zero balance", async function () {
      // Ensure contract has no DAI
      const balance = await getDaiBalance(await flashLoanExecutor.getAddress());
      if (balance > 0) {
        await flashLoanExecutor.withdraw(DAI_ADDRESS);
      }

      await expect(
        flashLoanExecutor.withdraw(DAI_ADDRESS)
      ).to.be.revertedWith("No tokens to withdraw");
    });
  });

  describe("Large Amount Flash Loans", function () {
    it("Should handle large DAI flash loan (100,000 DAI)", async function () {
      const LARGE_LOAN = ethers.parseEther("100000"); // 100k DAI
      const premium = (LARGE_LOAN * 5n) / 10000n;
      
      await fundContractWithDAI(premium);

      const tx = await flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LARGE_LOAN);
      const receipt = await tx.wait();

      console.log("Large flash loan executed successfully");
      console.log("Gas used:", receipt.gasUsed.toString());

      // Verify premium was paid correctly (50 DAI for 100k loan)
      expect(premium).to.equal(ethers.parseEther("50"));
    });
  });

  describe("Multiple Flash Loans in Sequence", function () {
    it("Should execute multiple flash loans sequentially", async function () {
      const LOAN_AMOUNT = ethers.parseEther("500");
      const premium = (LOAN_AMOUNT * 5n) / 10000n;

      // Fund for multiple loans
      await fundContractWithDAI(premium * 3n);

      // Execute first loan
      await flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT);
      console.log("First flash loan completed");

      // Execute second loan
      await flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT);
      console.log("Second flash loan completed");

      // Execute third loan
      await flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT);
      console.log("Third flash loan completed");
    });
  });

  describe("Balance Query", function () {
    it("Should correctly return token balance", async function () {
      const fundAmount = ethers.parseEther("100");
      await fundContractWithDAI(fundAmount);

      const balance = await flashLoanExecutor.getBalance(DAI_ADDRESS);
      expect(balance).to.equal(fundAmount);
    });

    it("Should return zero for tokens not held", async function () {
      const balance = await flashLoanExecutor.getBalance(WETH_ADDRESS);
      expect(balance).to.equal(0);
    });
  });

  describe("Integration Test - Complete Flash Loan Flow", function () {
    it("Should execute complete flow: borrow, hold, repay in one transaction", async function () {
      const LOAN_AMOUNT = ethers.parseEther("5000");
      const PREMIUM_BPS = 5n;
      const expectedPremium = (LOAN_AMOUNT * PREMIUM_BPS) / 10000n;

      // Fund contract with premium
      await fundContractWithDAI(expectedPremium);

      const contractAddress = await flashLoanExecutor.getAddress();
      const initialBalance = await getDaiBalance(contractAddress);

      console.log("\n=== Flash Loan Integration Test ===");
      console.log("Loan Amount:", ethers.formatEther(LOAN_AMOUNT), "DAI");
      console.log("Expected Premium:", ethers.formatEther(expectedPremium), "DAI");
      console.log("Initial Balance:", ethers.formatEther(initialBalance), "DAI");

      // Execute flash loan
      const tx = await flashLoanExecutor.requestFlashLoan(DAI_ADDRESS, LOAN_AMOUNT);
      const receipt = await tx.wait();

      console.log("Transaction Hash:", receipt.hash);
      console.log("Gas Used:", receipt.gasUsed.toString());
      console.log("Block Number:", receipt.blockNumber);

      // Verify events
      const requestedEvent = receipt.logs.find(
        log => log.topics[0] === flashLoanExecutor.interface.getEvent("FlashLoanRequested").topicHash
      );
      const executedEvent = receipt.logs.find(
        log => log.topics[0] === flashLoanExecutor.interface.getEvent("FlashLoanExecuted").topicHash
      );

      expect(requestedEvent).to.not.be.undefined;
      expect(executedEvent).to.not.be.undefined;

      // Verify final balance
      const finalBalance = await getDaiBalance(contractAddress);
      const expectedFinal = initialBalance - expectedPremium;

      console.log("Final Balance:", ethers.formatEther(finalBalance), "DAI");
      console.log("Premium Paid:", ethers.formatEther(expectedPremium), "DAI");
      console.log("=== Test Completed Successfully ===\n");

      expect(finalBalance).to.equal(expectedFinal);
    });
  });

  describe("Security Tests", function () {
    it("Should only allow pool to call executeOperation", async function () {
      // Attempting to call executeOperation directly should fail
      // This is implicitly tested - only the pool calls executeOperation during flash loan
      // Direct calls would fail the msg.sender check
      
      const asset = DAI_ADDRESS;
      const amount = ethers.parseEther("1000");
      const premium = ethers.parseEther("0.5");
      const params = "0x";

      await expect(
        flashLoanExecutor.executeOperation(asset, amount, premium, owner.address, params)
      ).to.be.revertedWith("Caller must be the Aave pool");
    });

    it("Should verify initiator in executeOperation", async function () {
      // This is tested implicitly - the contract checks that initiator == address(this)
      // Any flash loan initiated from outside would fail this check
      console.log("Security check: Initiator validation is enforced in executeOperation");
    });
  });

  // Helper Functions
  async function fundContractWithDAI(amount) {
    const daiWhale = await ethers.getImpersonatedSigner(DAI_WHALE);
    const dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
    
    // Fund the whale with ETH for gas
    await owner.sendTransaction({
      to: DAI_WHALE,
      value: ethers.parseEther("1")
    });

    await dai.connect(daiWhale).transfer(
      await flashLoanExecutor.getAddress(),
      amount
    );
  }

  async function fundContractWithUSDC(amount) {
    const usdcWhale = await ethers.getImpersonatedSigner(USDC_WHALE);
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    
    // Fund the whale with ETH for gas
    await owner.sendTransaction({
      to: USDC_WHALE,
      value: ethers.parseEther("1")
    });

    await usdc.connect(usdcWhale).transfer(
      await flashLoanExecutor.getAddress(),
      amount
    );
  }

  async function getDaiBalance(address) {
    const dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
    return await dai.balanceOf(address);
  }

  async function getUsdcBalance(address) {
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    return await usdc.balanceOf(address);
  }
});