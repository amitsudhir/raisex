# CrowdFund DApp

A decentralized crowdfunding application built with React and Solidity.

## Features

- Connect MetaMask wallet
- Donate ETH to the crowdfund
- Check total balance
- Check your contribution
- Withdraw funds (owner only)

## Contract Details

- **Network**: Base Sepolia
- **Contract Address**: `0xf86eFF9d6B0e471776828C826A0D61107D737A09`
- **End Time**: December 30, 2025

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd BizThon
```

2. Install dependencies:
```bash
cd crowdfund
npm install
```

3. Start the development server:
```bash
npm start
```

4. Make sure you have:
   - MetaMask installed
   - Connected to Base Sepolia network
   - Test ETH in your wallet (get from [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia))

## Smart Contract

The smart contract is deployed on Base Sepolia testnet. Key features:
- Time-limited funding period
- Goal amount tracking
- One donation per address
- Owner-only withdrawal

## Technologies Used

- React
- ethers.js v6
- Solidity ^0.8.10
- Bootstrap CSS
