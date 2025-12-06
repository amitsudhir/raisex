const fs = require("fs");
const path = require("path");

console.log("📝 Copying ABI to frontend...\n");

const artifactPath = path.join(
  __dirname,
  "../artifacts/contracts/Crowdfund.sol/Crowdfund.json"
);
const outputDir = path.join(__dirname, "../src/artifacts");
const outputPath = path.join(outputDir, "Crowdfund.json");

try {
  // Check if artifact exists
  if (!fs.existsSync(artifactPath)) {
    console.error("❌ Error: Contract artifact not found");
    console.log("💡 Run: npm run build:contracts");
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read artifact
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Extract ABI
  const abiExport = {
    abi: artifact.abi,
    contractName: artifact.contractName,
    bytecode: artifact.bytecode,
  };

  // Write to frontend
  fs.writeFileSync(outputPath, JSON.stringify(abiExport, null, 2));

  console.log("✅ ABI copied successfully!");
  console.log("📍 Location:", outputPath);
  console.log("\n💡 You can now import it in your frontend:");
  console.log('   import CrowdfundArtifact from "./artifacts/Crowdfund.json";');
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
