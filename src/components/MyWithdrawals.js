import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "../config/contract";
import { CURRENCY, ethToInr, CONTRACT_ADDRESS } from "../config/config";
import { getStoredWithdrawals, getBlockRanges } from "../utils/withdrawalTracker";

const MyWithdrawals = ({ account }) => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      loadWithdrawals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  // Helper function to store withdrawal data (for backward compatibility)
  const storeWithdrawal = (campaignId, txHash, amount, title) => {
    try {
      const stored = getStoredWithdrawals(account);
      stored[campaignId] = {
        txHash,
        amount,
        title,
        timestamp: Date.now()
      };
      localStorage.setItem(`withdrawals_${account.toLowerCase()}`, JSON.stringify(stored));
    } catch (error) {
      console.error("Error storing withdrawal:", error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const { contract, provider } = await getReadOnlyContract();
      
      // Get all campaigns
      const allCampaigns = await contract.getAllCampaigns();
      
      // Filter campaigns owned by user that have been withdrawn
      const myWithdrawnCampaigns = allCampaigns.filter(
        (c) => 
          c.owner.toLowerCase() === account.toLowerCase() && 
          c.withdrawn === true
      );

      // If no withdrawn campaigns, return early
      if (myWithdrawnCampaigns.length === 0) {
        setWithdrawals([]);
        setLoading(false);
        return;
      }

      // Get stored withdrawal data
      const storedWithdrawals = getStoredWithdrawals(account);

      // Get withdrawal events - try multiple strategies with better block range handling
      const filter = contract.filters.FundsWithdrawn();
      let events = [];
      
      // Get current block number for better range calculation
      const currentBlock = await provider.getBlockNumber();
      console.log("Current block:", currentBlock);
      
      // More aggressive block range strategy - try to find ALL withdrawal events
      const blockRanges = [
        { from: Math.max(0, currentBlock - 500000), to: "latest", desc: "last 3 days" },
        { from: Math.max(0, currentBlock - 1000000), to: "latest", desc: "last 6 days" },
        { from: Math.max(0, currentBlock - 2000000), to: "latest", desc: "last 12 days" },
        { from: Math.max(0, currentBlock - 5000000), to: "latest", desc: "last 30 days" },
        { from: Math.max(0, currentBlock - 10000000), to: "latest", desc: "last 60 days" },
        { from: 0, to: "latest", desc: "from contract deployment" }
      ];

      for (const range of blockRanges) {
        try {
          console.log(`Fetching withdrawal events from ${range.desc} (blocks ${range.from} to ${range.to})...`);
          events = await contract.queryFilter(filter, range.from, range.to);
          console.log(`Found ${events.length} events in ${range.desc}`);
          if (events.length > 0) {
            // Filter events for this user to see if we have any matches
            const userEvents = events.filter(e => 
              e.args.owner.toLowerCase() === account.toLowerCase()
            );
            console.log(`Found ${userEvents.length} withdrawal events for user`);
            if (userEvents.length > 0) break;
          }
        } catch (error) {
          console.log(`Failed to fetch from ${range.desc}:`, error.message);
          continue;
        }
      }
      
      // Process withdrawal data
      const withdrawalData = [];
      
      for (const campaign of myWithdrawnCampaigns) {
        const campaignId = campaign.id.toString();
        let withdrawalInfo = {
          campaignId,
          campaignTitle: campaign.title,
          amount: ethers.formatEther(campaign.raisedAmount),
          txHash: null,
          blockNumber: null,
          timestamp: null
        };

        // Try to find event for this campaign
        const event = events.find(e => 
          e.args.campaignId.toString() === campaignId &&
          e.args.owner.toLowerCase() === account.toLowerCase()
        );

        if (event) {
          // Found event - use real transaction data
          withdrawalInfo.txHash = event.transactionHash;
          withdrawalInfo.blockNumber = event.blockNumber;
          withdrawalInfo.amount = ethers.formatEther(event.args.amount);
          
          // Get block timestamp
          try {
            const block = await provider.getBlock(event.blockNumber);
            withdrawalInfo.timestamp = block ? block.timestamp * 1000 : Date.now();
          } catch (error) {
            console.log("Failed to get block timestamp:", error);
            withdrawalInfo.timestamp = Date.now();
          }
          
          // Store for future reference
          storeWithdrawal(campaignId, event.transactionHash, withdrawalInfo.amount, campaign.title);
        } else if (storedWithdrawals[campaignId]) {
          // Use stored data if available
          const stored = storedWithdrawals[campaignId];
          withdrawalInfo.txHash = stored.txHash;
          withdrawalInfo.timestamp = stored.timestamp;
          withdrawalInfo.blockNumber = stored.blockNumber;
        }

        withdrawalData.push(withdrawalInfo);
      }

      // Sort by newest first (block number > timestamp > campaign ID)
      withdrawalData.sort((a, b) => {
        // First priority: block number (newest first)
        if (a.blockNumber && b.blockNumber) {
          return b.blockNumber - a.blockNumber;
        }
        // Second priority: timestamp (newest first)
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        // Third priority: if one has timestamp and other doesn't
        if (a.timestamp && !b.timestamp) return -1;
        if (!a.timestamp && b.timestamp) return 1;
        // Last priority: campaign ID (higher ID = newer)
        return parseInt(b.campaignId) - parseInt(a.campaignId);
      });

      setWithdrawals(withdrawalData);
    } catch (error) {
      console.error("Failed to load withdrawals:", error);
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🔐</div>
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to view your withdrawal history</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading withdrawal history...</p>
        </div>
      </div>
    );
  }

  const totalWithdrawn = withdrawals.reduce(
    (sum, w) => sum + parseFloat(w.amount),
    0
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>💰 My Withdrawals</h2>
        <div style={styles.totalBox}>
          <div style={styles.totalLabel}>Total Withdrawn</div>
          <div style={styles.totalAmount}>
            {CURRENCY.symbol}{ethToInr(totalWithdrawn.toFixed(4))}
          </div>
          <div style={styles.totalEth}>{totalWithdrawn.toFixed(4)} ETH</div>
        </div>
      </div>

      {withdrawals.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📭</div>
          <h3>No Withdrawals Yet</h3>
          <p>
            When your campaigns reach their goals, you can withdraw the funds here.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {withdrawals.map((withdrawal, index) => (
            <div key={index} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.campaignInfo}>
                  <div style={styles.campaignTitle}>
                    {withdrawal.campaignTitle}
                  </div>
                  <div style={styles.campaignId}>
                    Campaign #{withdrawal.campaignId}
                  </div>
                </div>
                <div style={styles.badge}>✅ Withdrawn</div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.amountSection}>
                  <div style={styles.amountLabel}>Amount Withdrawn</div>
                  <div style={styles.amount}>
                    {CURRENCY.symbol}{ethToInr(withdrawal.amount)}
                  </div>
                  <div style={styles.ethAmount}>{withdrawal.amount} ETH</div>
                  
                  {/* Date/Time Section */}
                  {(withdrawal.timestamp || withdrawal.blockNumber) && (
                    <div style={styles.dateSection}>
                      <div style={styles.dateLabel}>Withdrawn On</div>
                      <div style={styles.dateValue}>
                        {withdrawal.timestamp 
                          ? new Date(withdrawal.timestamp).toLocaleString()
                          : "Date not available"
                        }
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.transactionSection}>
                  {withdrawal.txHash && withdrawal.txHash !== "N/A" ? (
                    <>
                      <a
                        href={`https://sepolia.basescan.org/tx/${withdrawal.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.viewTxButton}
                      >
                        🔗 View Transaction on BaseScan
                      </a>
                      <div style={styles.txHashSection}>
                        <div style={styles.txHashLabel}>Transaction Hash</div>
                        <div style={styles.txHash}>
                          {withdrawal.txHash}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={styles.fallbackOptions}>
                      <div style={styles.fallbackLinks}>
                        <a
                          href={`https://sepolia.basescan.org/address/${account}#internaltx`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.fallbackButton}
                        >
                          📋 View Your Transactions
                        </a>
                        <a
                          href={`https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}#events`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.fallbackButton}
                        >
                          📊 View Contract Events
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
  },
  totalBox: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    padding: "1.5rem 2rem",
    borderRadius: "15px",
    color: "white",
    textAlign: "right",
  },
  totalLabel: {
    fontSize: "0.9rem",
    opacity: 0.9,
    marginBottom: "0.5rem",
  },
  totalAmount: {
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "0.25rem",
  },
  totalEth: {
    fontSize: "0.95rem",
    opacity: 0.9,
  },
  list: {
    display: "grid",
    gap: "1.5rem",
  },
  card: {
    background: "white",
    borderRadius: "20px",
    padding: "2rem",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    border: "1px solid #f1f5f9",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 12px 35px rgba(0,0,0,0.12)"
    }
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #e5e7eb",
  },
  campaignInfo: {
    flex: 1,
  },
  campaignTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "0.5rem",
  },
  campaignId: {
    fontSize: "0.9rem",
    color: "#6b7280",
  },
  badge: {
    background: "#d1fae5",
    color: "#065f46",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  amountSection: {
    background: "#f9fafb",
    padding: "1.5rem",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
  },
  amountLabel: {
    fontSize: "0.9rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
  },
  amount: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#10b981",
    marginBottom: "0.25rem",
  },
  ethAmount: {
    fontSize: "1rem",
    color: "#6b7280",
  },
  dateSection: {
    textAlign: "right",
  },
  dateLabel: {
    fontSize: "0.9rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
  },
  dateValue: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#374151",
  },
  transactionSection: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  viewTxButton: {
    display: "block",
    padding: "1rem 1.5rem",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "10px",
    textAlign: "center",
    fontWeight: "600",
    fontSize: "1rem",
    transition: "all 0.2s ease",
    cursor: "pointer",
    marginBottom: "1rem",
    boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
  },
  txHashSection: {
    marginTop: "1rem",
  },
  txHashLabel: {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
    fontWeight: "600",
  },
  txHash: {
    fontSize: "0.8rem",
    color: "#374151",
    wordBreak: "break-all",
    padding: "0.75rem",
    background: "#f9fafb",
    borderRadius: "8px",
    fontFamily: "monospace",
    border: "1px solid #e5e7eb",
  },
  fallbackOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  fallbackLinks: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  fallbackButton: {
    flex: 1,
    minWidth: "140px",
    padding: "1rem 1.25rem",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "10px",
    textAlign: "center",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
    cursor: "pointer",
    display: "block",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
  },
  loading: {
    textAlign: "center",
    padding: "4rem 1rem",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 1rem",
  },
  empty: {
    textAlign: "center",
    padding: "4rem 1rem",
    color: "#6b7280",
  },
  emptyIcon: {
    fontSize: "4rem",
    marginBottom: "1rem",
  },
};

export default MyWithdrawals;
