const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of FlashLoanExecutor...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy the contract
  console.log("Deploying FlashLoanExecutor...");
  const FlashLoanExecutor = await ethers.getContractFactory("FlashLoanExecutor");
  const flashLoanExecutor = await FlashLoanExecutor.deploy();

  await flashLoanExecutor.waitForDeployment();

  const contractAddress = await flashLoanExecutor.getAddress();
  console.log("FlashLoanExecutor deployed to:", contractAddress);

  // Get deployment transaction
  const deployTx = flashLoanExecutor.deploymentTransaction();
  if (deployTx) {
    console.log("Deployment transaction hash:", deployTx.hash);
    const receipt = await deployTx.wait();
    console.log("Gas used for deployment:", receipt.gasUsed.toString());
    console.log("Deployment block number:", receipt.blockNumber);
  }

  // Verify contract configuration
  console.log("\n=== Contract Configuration ===");
  const owner = await flashLoanExecutor.owner();
  const pool = await flashLoanExecutor.POOL();
  const addressesProvider = await flashLoanExecutor.ADDRESSES_PROVIDER();

  console.log("Owner:", owner);
  console.log("Aave V3 Pool:", pool);
  console.log("Addresses Provider:", addressesProvider);

  // Verify pool address matches expected mainnet address
  const EXPECTED_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  if (pool.toLowerCase() === EXPECTED_POOL.toLowerCase()) {
    console.log("✓ Pool address verified (Ethereum mainnet)");
  } else {
    console.log("⚠ Warning: Pool address does not match expected mainnet address");
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);

  console.log("\n=== Next Steps ===");
  console.log("1. Verify contract on Etherscan (if mainnet):");
  console.log(`   npx hardhat verify --network mainnet ${contractAddress}`);
  console.log("\n2. Fund the contract with tokens to cover flash loan premiums");
  console.log("\n3. Call requestFlashLoan() to execute flash loans");
  console.log("\n4. Withdraw profits using withdraw() function");

  console.log("\n=== Important Addresses (Ethereum Mainnet) ===");
  console.log("DAI:  0x6B175474E89094C44Da98b954EedeAC495271d0F");
  console.log("USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  console.log("WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  console.log("Aave V3 Pool: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2");

  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    owner: owner,
    aavePool: pool,
    timestamp: new Date().toISOString(),
    blockNumber: deployTx ? (await deployTx.wait()).blockNumber : null
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n✓ Deployment info saved to deployment-info.json");

  console.log("\n=== Deployment Complete ===\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });