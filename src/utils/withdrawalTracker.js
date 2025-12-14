/**
 * Utility functions for tracking withdrawal transactions
 */

/**
 * Store withdrawal transaction data in localStorage
 * @param {string} account - User's wallet address
 * @param {string} campaignId - Campaign ID
 * @param {string} txHash - Transaction hash
 * @param {string} amount - Amount withdrawn in ETH
 * @param {string} title - Campaign title
 * @param {number} blockNumber - Block number (optional)
 * @param {number} timestamp - Transaction timestamp (optional)
 */
export const storeWithdrawal = (account, campaignId, txHash, amount, title, blockNumber = null, timestamp = null) => {
  try {
    const key = `withdrawals_${account.toLowerCase()}`;
    const stored = localStorage.getItem(key) || '{}';
    const withdrawals = JSON.parse(stored);
    
    withdrawals[campaignId] = {
      txHash,
      amount,
      title,
      blockNumber,
      timestamp: timestamp || Date.now(),
      blockExplorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
      dateCreated: new Date(timestamp || Date.now()).toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(withdrawals));
    console.log(`Stored withdrawal data for campaign ${campaignId}:`, withdrawals[campaignId]);
  } catch (error) {
    console.error("Error storing withdrawal:", error);
  }
};

/**
 * Get stored withdrawal data for a user
 * @param {string} account - User's wallet address
 * @returns {Object} Stored withdrawal data
 */
export const getStoredWithdrawals = (account) => {
  try {
    const key = `withdrawals_${account.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error reading stored withdrawals:", error);
    return {};
  }
};

/**
 * Get withdrawal data for a specific campaign
 * @param {string} account - User's wallet address
 * @param {string} campaignId - Campaign ID
 * @returns {Object|null} Withdrawal data or null if not found
 */
export const getWithdrawalForCampaign = (account, campaignId) => {
  const withdrawals = getStoredWithdrawals(account);
  return withdrawals[campaignId] || null;
};

/**
 * Clear all stored withdrawal data for a user (useful for testing)
 * @param {string} account - User's wallet address
 */
export const clearStoredWithdrawals = (account) => {
  try {
    const key = `withdrawals_${account.toLowerCase()}`;
    localStorage.removeItem(key);
    console.log(`Cleared withdrawal data for ${account}`);
  } catch (error) {
    console.error("Error clearing stored withdrawals:", error);
  }
};

/**
 * Enhanced block range strategy for fetching historical events
 * Base Sepolia produces ~2 blocks per second
 */
export const getBlockRanges = (currentBlock) => [
  { 
    from: Math.max(0, currentBlock - 500000), 
    to: "latest", 
    desc: "last ~3 days",
    priority: 1 
  },
  { 
    from: Math.max(0, currentBlock - 1000000), 
    to: "latest", 
    desc: "last ~6 days",
    priority: 2 
  },
  { 
    from: Math.max(0, currentBlock - 2000000), 
    to: "latest", 
    desc: "last ~12 days",
    priority: 3 
  },
  { 
    from: Math.max(0, currentBlock - 5000000), 
    to: "latest", 
    desc: "last ~30 days",
    priority: 4 
  },
  { 
    from: 0, 
    to: "latest", 
    desc: "from genesis (may be slow)",
    priority: 5 
  }
];