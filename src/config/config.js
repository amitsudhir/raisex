// Contract configuration - Auto-updated by deploy script
export const CONTRACT_ADDRESS = "0xf86eFF9d6B0e471776828C826A0D61107D737A09"; // Update after deployment

export const NETWORK_NAME = "Base Sepolia";

export const NETWORK_CONFIG = {
  chainId: "0x14a34", // Base Sepolia (84532 in hex)
  chainName: "Base Sepolia",
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
};

export const CATEGORIES = [
  "Charity",
  "Education",
  "Medical",
  "Technology",
  "Environment",
  "Arts",
  "Community",
  "Other",
];

// Demo mode - hides dev panels, shows polished UI
// Set to true for hackathon demo or use ?demo=1 in URL
export const DEMO_MODE = false;
