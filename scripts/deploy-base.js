const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Crowdfund deployment to Base Sepolia...\n");

  // Check environment variables
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    console.error("❌ Error: DEPLOYER_PRIVATE_KEY not found in .env file");
    console.log("\n📝 TODO:");
    console.log("   1. Copy .env.example to .env");
    console.log("   2. Add your MetaMask private key");
    console.log("   3. Run: npm run deploy:base");
    process.exit(1);
  }

  if (!process.env.RPC_URL_BASE_SEPOLIA) {
    console.error("❌ Error: RPC_URL_BASE_SEPOLIA not found in .env file");
    process.exit(1);
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("❌ Error: Deployer account has no ETH");
    console.log("💡 Get test ETH from: https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }

  console.log("\n⏳ Compiling contracts...");

  // Get contract factory
  const Crowdfund = await ethers.getContractFactory("Crowdfund");

  console.log("⏳ Deploying Crowdfund contract...");

  // Deploy contract
  const crowdfund = await Crowdfund.deploy();
  await crowdfund.waitForDeployment();

  const contractAddress = await crowdfund.getAddress();

  console.log("\n✅ Contract deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🔗 View on BaseScan:", `https://sepolia.basescan.org/address/${contractAddress}`);

  // Wait for a few confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await crowdfund.deploymentTransaction().wait(3);
  console.log("✅ Confirmed!");

  // Update frontend config
  console.log("\n📝 Updating frontend configuration...");
  updateFrontendConfig(contractAddress);

  // Export ABI
  console.log("📝 Exporting ABI to frontend...");
  exportABI();

  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("   1. Start your React app: npm start");
  console.log("   2. Connect your wallet");
  console.log("   3. Create campaigns!");
  console.log("\n💡 To redeploy: npm run deploy:base");
}

function updateFrontendConfig(contractAddress) {
  const configPath = path.join(__dirname, "../src/config/config.js");

  try {
    let configContent = fs.readFileSync(configPath, "utf8");

    // Update CONTRACT_ADDRESS
    const addressRegex = /export const CONTRACT_ADDRESS = ["']0x[a-fA-F0-9]{40}["'];/;
    const newAddressLine = `export const CONTRACT_ADDRESS = "${contractAddress}";`;

    if (addressRegex.test(configContent)) {
      configContent = configContent.replace(addressRegex, newAddressLine);
    } else {
      // If pattern not found, try to find and replace the line
      const lines = configContent.split("\n");
      const addressLineIndex = lines.findIndex((line) =>
        line.includes("CONTRACT_ADDRESS")
      );
      if (addressLineIndex !== -1) {
        lines[addressLineIndex] = newAddressLine;
        configContent = lines.join("\n");
      }
    }

    // Ensure DEMO_MODE exists
    if (!configContent.includes("DEMO_MODE")) {
      configContent += '\n\nexport const DEMO_MODE = false; // Set to true for demo\n';
    }

    fs.writeFileSync(configPath, configContent);
    console.log("   ✅ Updated src/config/config.js");
  } catch (error) {
    console.error("   ⚠️  Warning: Could not update config.js:", error.message);
    console.log("   💡 Manually update CONTRACT_ADDRESS in src/config/config.js");
  }
}

function exportABI() {
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/Crowdfund.sol/Crowdfund.json"
  );
  const outputDir = path.join(__dirname, "../src/artifacts");
  const outputPath = path.join(outputDir, "Crowdfund.json");

  try {
    // Create artifacts directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read the artifact
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Extract only what we need
    const abiExport = {
      abi: artifact.abi,
      contractName: artifact.contractName,
      bytecode: artifact.bytecode,
    };

    // Write to frontend
    fs.writeFileSync(outputPath, JSON.stringify(abiExport, null, 2));
    console.log("   ✅ Exported ABI to src/artifacts/Crowdfund.json");

    // Also update contract.js with the ABI
    updateContractABI(artifact.abi);
  } catch (error) {
    console.error("   ⚠️  Warning: Could not export ABI:", error.message);
    console.log("   💡 Manually copy ABI from artifacts/contracts/Crowdfund.sol/Crowdfund.json");
  }
}

function updateContractABI(abi) {
  const contractPath = path.join(__dirname, "../src/config/contract.js");

  try {
    let contractContent = fs.readFileSync(contractPath, "utf8");

    // Find and replace the ABI array
    const abiString = JSON.stringify(abi, null, 2);
    const abiRegex = /export const CONTRACT_ABI = \[[\s\S]*?\];/;

    if (abiRegex.test(contractContent)) {
      contractContent = contractContent.replace(
        abiRegex,
        `export const CONTRACT_ABI = ${abiString};`
      );
      fs.writeFileSync(contractPath, contractContent);
      console.log("   ✅ Updated ABI in src/config/contract.js");
    }
  } catch (error) {
    console.error("   ⚠️  Warning: Could not update contract.js:", error.message);
  }
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
