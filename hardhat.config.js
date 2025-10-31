require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: 
        process.env.MAINNET_RPC_URL ||
        "https://mainnet.infura.io/v3/d12857ef66d9423cbe9e9bab463c44947777",
        // blockNumber: 39900000, //39951866
        blockNumber: 20700000, //39951866
        // url:
        //   process.env.MAINNET_RPC_URL ||
        //   "https://mainnet.infura.io/v3/d12857ef66d9423cbe9e9bab463c4494",
        // blockNumber: 18500000, // Pin to a specific block for consistent tests
        // blockNumber: 18763327,
      },
      // chainId: 1,
      timeout: 120000,
    },
    mainnet: {
      url:
        process.env.MAINNET_RPC_URL ||
        "https://mainnet.infura.io/v3/d12857ef66d9423cbe9e9bab463c4494",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      timeout: 120000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};
