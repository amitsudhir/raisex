const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🌱 Seeding demo campaigns...\n");

  // Check environment
  if (!process.env.SEEDER_PRIVATE_KEY && !process.env.DEPLOYER_PRIVATE_KEY) {
    console.error("❌ Error: SEEDER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not found");
    console.log("\n💡 Add to .env:");
    console.log("   SEEDER_PRIVATE_KEY=your_private_key");
    console.log("   (or it will use DEPLOYER_PRIVATE_KEY)");
    process.exit(1);
  }

  const privateKey = process.env.SEEDER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL_BASE_SEPOLIA || "https://sepolia.base.org";

  // Read contract address
  const configPath = path.join(__dirname, "../src/config/config.js");
  if (!fs.existsSync(configPath)) {
    console.error("❌ Error: config.js not found");
    console.log("💡 Run: npm run deploy:base first");
    process.exit(1);
  }

  const configContent = fs.readFileSync(configPath, "utf8");
  const addressMatch = configContent.match(/CONTRACT_ADDRESS = ["']([^"']+)["']/);
  
  if (!addressMatch) {
    console.error("❌ Error: CONTRACT_ADDRESS not found in config.js");
    console.log("💡 Run: npm run deploy:base first");
    process.exit(1);
  }

  const contractAddress = addressMatch[1];
  console.log("📍 Contract address:", contractAddress);

  // Read ABI
  const abiPath = path.join(__dirname, "../src/artifacts/Crowdfund.json");
  if (!fs.existsSync(abiPath)) {
    console.error("❌ Error: ABI not found");
    console.log("💡 Run: npm run deploy:base first");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const abi = artifact.abi;

  // Connect to network
  console.log("🔗 Connecting to Base Sepolia...");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log("👤 Seeder address:", wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("❌ Error: Seeder has no ETH");
    console.log("💡 Get test ETH: https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }

  console.log("\n📝 Creating demo campaigns...\n");

  // Campaign 1: Funded campaign (small goal, easy to reach)
  try {
    console.log("1️⃣ Creating funded campaign...");
    const tx1 = await contract.createCampaign(
      "Help Build Community Center",
      "We're building a community center for local youth. This campaign is almost funded!",
      ethers.parseEther("0.05"), // Small goal
      30 * 24 * 60 * 60, // 30 days
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800",
      "Community",
      "Local Community Group"
    );
    await tx1.wait();
    console.log("   ✅ Created campaign 1");

    // Donate to make it almost funded
    console.log("   💰 Donating to campaign 1...");
    const tx1donate = await contract.donate(1, {
      value: ethers.parseEther("0.04"), // 80% funded
    });
    await tx1donate.wait();
    console.log("   ✅ Donated 0.04 ETH (80% funded)");
  } catch (error) {
    console.error("   ⚠️  Campaign 1 failed:", error.message);
  }

  // Campaign 2: Active campaign (larger goal, needs funding)
  try {
    console.log("\n2️⃣ Creating active campaign...");
    const tx2 = await contract.createCampaign(
      "Medical Equipment for Rural Clinic",
      "Help us purchase essential medical equipment for our rural clinic serving 5000+ patients.",
      ethers.parseEther("0.5"), // Larger goal
      45 * 24 * 60 * 60, // 45 days
      "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800",
      "Medical",
      "Rural Health Initiative"
    );
    await tx2.wait();
    console.log("   ✅ Created campaign 2");

    // Small donation
    console.log("   💰 Donating to campaign 2...");
    const tx2donate = await contract.donate(2, {
      value: ethers.parseEther("0.05"), // 10% funded
    });
    await tx2donate.wait();
    console.log("   ✅ Donated 0.05 ETH (10% funded)");
  } catch (error) {
    console.error("   ⚠️  Campaign 2 failed:", error.message);
  }

  // Campaign 3: Education campaign
  try {
    console.log("\n3️⃣ Creating education campaign...");
    const tx3 = await contract.createCampaign(
      "Coding Bootcamp for Underprivileged Youth",
      "Sponsor a student to learn web3 development and blockchain technology.",
      ethers.parseEther("0.2"),
      60 * 24 * 60 * 60, // 60 days
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
      "Education",
      "Tech Education Foundation"
    );
    await tx3.wait();
    console.log("   ✅ Created campaign 3");

    // Donation
    console.log("   💰 Donating to campaign 3...");
    const tx3donate = await contract.donate(3, {
      value: ethers.parseEther("0.08"), // 40% funded
    });
    await tx3donate.wait();
    console.log("   ✅ Donated 0.08 ETH (40% funded)");
  } catch (error) {
    console.error("   ⚠️  Campaign 3 failed:", error.message);
  }

  console.log("\n🎉 Demo seeding complete!");
  console.log("\n📊 Summary:");
  console.log("   • 3 campaigns created");
  console.log("   • Sample donations made");
  console.log("   • Ready for demo!");
  console.log("\n💡 Next steps:");
  console.log("   1. Run: npm start");
  console.log("   2. Visit: http://localhost:3000");
  console.log("   3. See your seeded campaigns!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Seeding failed:");
    console.error(error.message);
    process.exit(1);
  });
