/**
 * Utility functions for tracking refund transactions
 */

/**
 * Store refund transaction data in localStorage
 * @param {string} account - User's wallet address
 * @param {string} campaignId - Campaign ID
 * @param {string} txHash - Transaction hash
 * @param {string} amount - Amount refunded in ETH
 * @param {string} title - Campaign title
 * @param {number} blockNumber - Block number (optional)
 * @param {number} timestamp - Transaction timestamp (optional)
 */
export const storeRefund = (account, campaignId, txHash, amount, title, blockNumber = null, timestamp = null) => {
  try {
    const key = `refunds_${account.toLowerCase()}`;
    const stored = localStorage.getItem(key) || '{}';
    const refunds = JSON.parse(stored);
    
    // Check if this transaction hash already exists to prevent duplicates
    if (refunds[campaignId] && refunds[campaignId].txHash === txHash) {
      return;
    }
    
    refunds[campaignId] = {
      txHash,
      amount,
      title,
      blockNumber,
      timestamp: timestamp || Date.now(),
      blockExplorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
      dateCreated: new Date(timestamp || Date.now()).toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(refunds));
  } catch (error) {
    console.error("Error storing refund:", error);
  }
};

/**
 * Get stored refund transactions for an account
 * @param {string} account - User's wallet address
 * @returns {Object} Object with campaignId as keys and refund data as values
 */
export const getStoredRefunds = (account) => {
  try {
    const key = `refunds_${account.toLowerCase()}`;
    const stored = localStorage.getItem(key) || '{}';
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error retrieving refunds:", error);
    return {};
  }
};

/**
 * Clear all stored refund data for an account
 * @param {string} account - User's wallet address
 */
export const clearStoredRefunds = (account) => {
  try {
    const key = `refunds_${account.toLowerCase()}`;
    localStorage.removeItem(key);
    console.log(`Cleared refund data for account ${account}`);
  } catch (error) {
    console.error("Error clearing refunds:", error);
  }
};

/**
 * Get refund transaction for a specific campaign
 * @param {string} account - User's wallet address
 * @param {string} campaignId - Campaign ID
 * @returns {Object|null} Refund transaction data or null if not found
 */
export const getRefundForCampaign = (account, campaignId) => {
  try {
    const refunds = getStoredRefunds(account);
    return refunds[campaignId] || null;
  } catch (error) {
    console.error("Error getting refund for campaign:", error);
    return null;
  }
};

/**
 * Test function to verify refund storage (for debugging)
 */
export const testRefundStorage = (account) => {
  try {
    // Test storing a refund
    storeRefund(account, "999", "0x123test", "0.1", "Test Campaign", 12345, Date.now());
    
    // Test retrieving refunds
    const refunds = getStoredRefunds(account);
    console.log("Test refunds stored:", refunds);
    
    // Clean up test data
    const key = `refunds_${account.toLowerCase()}`;
    const stored = localStorage.getItem(key) || '{}';
    const refundsObj = JSON.parse(stored);
    delete refundsObj["999"];
    localStorage.setItem(key, JSON.stringify(refundsObj));
    
    return refunds["999"] ? "✅ Refund storage working" : "❌ Refund storage failed";
  } catch (error) {
    console.error("Refund storage test failed:", error);
    return "❌ Refund storage test failed: " + error.message;
  }
};