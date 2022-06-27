require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider');
const mnemonic = process.env.MNEMONIC;
const INFURA = process.env.INFURA;
const KEY = process.env.ETHERSCANKEY;

module.exports = {
  networks: {

    test: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "*",
    },

    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, `wss://ropsten.infura.io/ws/v3/${INFURA}`),
      network_id: 3,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, `wss://rinkeby.infura.io/ws/v3/${INFURA}`),
      network_id: 4,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    kovan: {
      provider: () => new HDWalletProvider(mnemonic, `wss://kovan.infura.io/ws/v3/${INFURA}`),
      network_id: 42,
      timeoutBlocks: 200,
      skipDryRun: true
    }
    
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.7",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },

  mocha: {
    enableTimeouts: false,
    before_timeout: 300000
  },

  plugins: [
    "solidity-coverage",
    "truffle-plugin-verify"
  ],

  api_keys: {
    etherscan: KEY
  }
};
