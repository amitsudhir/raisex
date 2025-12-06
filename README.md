# 🚀 Crowdfund DApp - India Edition

Multi-campaign crowdfunding platform with INR support, built on Base Sepolia blockchain.

## ⚡ Quick Start (5 min)

1. Install dependencies
npm install

2. Setup environment file
cp .env.example .env
Then open .env and add:
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere

3. Deploy & Seed demo campaigns
npm run demo:setup

4. Start frontend
npm start

Visit:
http://localhost:3000?demo=1

---

## ✨ Features

- INR Currency Display (₹)
- Multi-Campaign Creation
- Auto-Seeding (3 demo campaigns)
- Demo Mode UI for Hackathons
- Refund Logic (if goal not met by deadline)
- Secure Withdrawal (only if goal reached)
- Analytics Dashboard (total raised, active stats)
- Base Sepolia Blockchain Deployment

---

## 💰 Currency

All funding displayed in Indian Rupees.
ETH to INR conversion rate defined here:
src/config/config.js

Update:
ethToInr: 250000

---

## 📝 Commands

npm run demo:setup      Deploy + seed demo
npm run deploy:base     Deploy contract only
npm run seed:demo       Seed demo only
npm start               Start frontend app

---

## 🎬 Demo Mode

Add "?demo=1" to URL
Example:
http://localhost:3000?demo=1
https://your-vercel-url.vercel.app?demo=1

Demo mode:
- Hides developer sections
- Displays clean UI
- Ideal for hackathon judging panels

---

## 🌐 Live Contract

Network: Base Sepolia Testnet
Contract Address:
0x4cB30f15d42683ecbCD70968fFeA3ad0327991E2

Explorer:
https://sepolia.basescan.org/address/0x4cB30f15d42683ecbCD70968fFeA3ad0327991E2

---

## 📊 Seeded Campaigns

1. Community Center – 80% funded
2. Medical Equipment – 10% funded
3. Coding Bootcamp – 40% funded

Seed script auto-creates these when running:
npm run demo:setup

---

## 🔧 Configuration

Update conversion rate:
src/config/config.js

Example:
ethToInr: 250000

---

## 🆘 Troubleshooting

If "Setup Required" appears:
- Run npm run demo:setup
- Ensure Base Sepolia network is active in MetaMask

If wallet not connecting:
- Switch network to Base Sepolia manually

If demo seeding fails:
- Remove SEEDER_PRIVATE_KEY from .env

Need test ETH:
https://www.alchemy.com/faucets/base-sepolia

---

## 📚 Tech Stack

Solidity
Hardhat
React
Ethers.js v6
Base Sepolia Testnet
MetaMask

---

## 🔐 Smart Contract Rules

- Donations locked on-chain
- Refunds only if goal not reached by deadline
- Withdrawal only if funding target achieved
- Reentrancy guard enabled (nonReentrant)

---

## 🚀 Future Scope

- Milestone-based fund release
- IPFS storage for campaign images
- Donor NFT badges
- Fiat on-ramp for INR → Crypto conversion

---

## 🇮🇳 Conclusion

Crowdfund DApp brings transparency, on-chain integrity, and accountability to fundraising in India.
Built for trust. Built for impact. Built for India.
