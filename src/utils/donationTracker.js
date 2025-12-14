/**
 * Utility functions for tracking donation transactions
 */

/**
 * Store donation transaction data in localStorage
 * @param {string} account - User's wallet address
 * @param {string} campaignId - Campaign ID
 * @param {string} txHash - Transaction hash
 * @param {string} amount - Amount donated in ETH
 * @param {string} title - Campaign title
 * @param {number} blockNumber - Block number (optional)
 * @param {number} timestamp - Transaction timestamp (optional)
 */
export const storeDonation = (account, campaignId, txHash, amount, title, blockNumber = null, timestamp = null) => {
  try {
    const key = `donations_${account.toLowerCase()}`;
    const stored = localStorage.getItem(key) || '{}';
    const donations = JSON.parse(stored);
    
    // Store as array since users can donate multiple times to same campaign
    if (!donations[campaignId]) {
      donations[campaignId] = [];
    }
    
    donations[campaignId].push({
      txHash,
      amount,
      title,
      blockNumber,
      timestamp: timestamp || Date.now(),
      blockExplorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
      dateCreated: new Date(timestamp || Date.now()).toISOString()
    });
    
    localStorage.setItem(key, JSON.stringify(donations));
    console.log(`Stored donation data for campaign ${campaignId}:`, donations[campaignId]);
  } catch (error) {
    console.error("Error storing donation:", error);
  }
};

/**
 * Get stored donation data for a user
 * @param {string} account - User's wallet address
 * @returns {Object} Stored donation data
 */
export const getStoredDonations = (account) => {
  try {
    const key = `donations_${account.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error reading stored donations:", error);
    return {};
  }
};

/**
 * Get donation data for a specific campaign
 * @param {string} account - User's wallet address
 * @param {string} campaignId - Campaign ID
 * @returns {Array} Array of donation transactions or empty array
 */
export const getDonationsForCampaign = (account, campaignId) => {
  const donations = getStoredDonations(account);
  return donations[campaignId] || [];
};

/**
 * Clear all stored donation data for a user (useful for testing)
 * @param {string} account - User's wallet address
 */
export const clearStoredDonations = (account) => {
  try {
    const key = `donations_${account.toLowerCase()}`;
    localStorage.removeItem(key);
    console.log(`Cleared donation data for ${account}`);
  } catch (error) {
    console.error("Error clearing stored donations:", error);
  }
};