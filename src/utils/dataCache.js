/**
 * Centralized data cache and blockchain query optimization
 */
import { trackNetworkCall } from './performance';

let campaignCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Get all campaigns with caching
 */
export const getCachedCampaigns = async () => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (campaignCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[CACHE] Using cached campaigns data');
    return campaignCache;
  }
  
  // Fetch fresh data
  return await trackNetworkCall('getAllCampaigns', async () => {
    const { getReadOnlyContract } = await import('../config/contract');
    const { contract } = await getReadOnlyContract();
    
    try {
      const campaigns = await contract.getAllCampaigns();
      campaignCache = campaigns;
      cacheTimestamp = now;
      console.log(`[SUCCESS] Fetched ${campaigns.length} campaigns from blockchain`);
      return campaigns;
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      // Return cached data if available, even if stale
      if (campaignCache) {
        console.log('[WARNING] Using stale cached data due to network error');
        return campaignCache;
      }
      return [];
    }
  });
};

/**
 * Invalidate cache (call after creating/updating campaigns)
 */
export const invalidateCache = () => {
  campaignCache = null;
  cacheTimestamp = null;
};

/**
 * Get user's campaigns efficiently
 */
export const getUserCampaigns = async (account) => {
  if (!account) return [];
  
  const campaigns = await getCachedCampaigns();
  return campaigns.filter(c => c.owner.toLowerCase() === account.toLowerCase());
};

/**
 * Get user's donations efficiently using batch queries
 */
export const getUserDonations = async (account) => {
  if (!account) return [];
  
  return await trackNetworkCall('getUserDonations', async () => {
    const { getReadOnlyContract } = await import('../config/contract');
    const { contract } = await getReadOnlyContract();
    const campaigns = await getCachedCampaigns();
    
    console.log(`[INFO] Checking contributions for ${campaigns.length} campaigns`);
    
    // Batch contribution queries with limited concurrency
    const batchSize = 10; // Process 10 campaigns at a time
    const results = [];
    
    for (let i = 0; i < campaigns.length; i += batchSize) {
      const batch = campaigns.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (campaign) => {
        try {
          const contribution = await contract.getContribution(campaign.id, account);
          return {
            campaign,
            contribution: contribution.toString(),
            hasContribution: contribution > 0
          };
        } catch (error) {
          console.error(`Failed to get contribution for campaign ${campaign.id}:`, error);
          return {
            campaign,
            contribution: "0",
            hasContribution: false
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the RPC
      if (i + batchSize < campaigns.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const donations = results.filter(r => r.hasContribution);
    console.log(`[SUCCESS] Found ${donations.length} campaigns with donations`);
    return donations;
  });
};

/**
 * Get user's withdrawals efficiently
 */
export const getUserWithdrawals = async (account) => {
  if (!account) return [];
  
  const campaigns = await getCachedCampaigns();
  return campaigns.filter(c => 
    c.owner.toLowerCase() === account.toLowerCase() && 
    c.withdrawn === true
  );
};

/**
 * Optimized event fetching with smart block ranges
 */
export const getEventsOptimized = async (contract, provider, filter, maxBlocks = 100000) => {
  try {
    const currentBlock = await provider.getBlockNumber();
    
    // Start with recent blocks and expand if needed
    const ranges = [
      { from: Math.max(0, currentBlock - 10000), to: "latest" },   // ~5 hours
      { from: Math.max(0, currentBlock - 50000), to: "latest" },   // ~1 day
      { from: Math.max(0, currentBlock - maxBlocks), to: "latest" } // configurable max
    ];
    
    for (const range of ranges) {
      try {
        const events = await contract.queryFilter(filter, range.from, range.to);
        if (events.length > 0) {
          return events;
        }
      } catch (error) {
        console.log(`Range ${range.from}-${range.to} failed:`, error.message);
        continue;
      }
    }
    
    return [];
  } catch (error) {
    console.error("Event fetching failed:", error);
    return [];
  }
};