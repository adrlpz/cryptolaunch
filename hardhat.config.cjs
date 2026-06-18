require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const cleanKey = PRIVATE_KEY?.startsWith("0x") ? PRIVATE_KEY.slice(2) : PRIVATE_KEY;
const sepoliaNetwork = cleanKey && cleanKey.length === 64
  ? {
      sepolia: {
        url: SEPOLIA_RPC_URL,
        accounts: [`0x${cleanKey}`],
        chainId: 11155111,
      },
    }
  : {};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    ...sepoliaNetwork,
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
