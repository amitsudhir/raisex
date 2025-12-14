import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "../config/contract";
import { CURRENCY, ethToInr, CONTRACT_ADDRESS } from "../config/config";
import { getStoredDonations } from "../utils/donationTracker";

const MyDonations = ({ account }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      loadMyDonations();
    }
  }, [account]);

  const loadMyDonations = async () => {
    try {
      setLoading(true);
      const { contract } = await getReadOnlyContract();
      const allCampaigns = await contract.getAllCampaigns();

      // Get stored donation data
      const storedDonations = getStoredDonations(account);

      const myDonations = [];
      for (const campaign of allCampaigns) {
        const contribution = await contract.getContribution(campaign.id, account);
        if (contribution > 0) {
          // Get stored donations for this campaign
          const stored = storedDonations[campaign.id.toString()] || [];

          myDonations.push({
            campaign,
            contribution: ethers.formatEther(contribution),
            storedTransactions: stored.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          });
        }
      }

      // Sort donations by newest first
      myDonations.sort((a, b) => {
        const aLatestStored = a.storedTransactions.length > 0 ? 
          Math.max(...a.storedTransactions.map(tx => tx.timestamp || 0)) : 0;
        const bLatestStored = b.storedTransactions.length > 0 ? 
          Math.max(...b.storedTransactions.map(tx => tx.timestamp || 0)) : 0;
        
        if (aLatestStored && bLatestStored) {
          return bLatestStored - aLatestStored;
        }
        // Finally by campaign ID (higher = newer)
        return parseInt(b.campaign.id) - parseInt(a.campaign.id);
      });

      setDonations(myDonations);
    } catch (error) {
      console.error("Failed to load donations:", error);
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
          <p>Connect your wallet to see your donation history</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading your donations...</p>
        </div>
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>💝</div>
          <h3>No Donations Yet</h3>
          <p>Start supporting campaigns to see your donation history here!</p>
        </div>
      </div>
    );
  }

  const totalDonated = donations.reduce(
    (sum, d) => sum + parseFloat(d.contribution),
    0
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>💝 My Donations</h2>
        
        <div style={styles.totalCard}>
          <div style={styles.totalLabel}>Total Donated</div>
          <div style={styles.totalValue}>
            {CURRENCY.symbol}{ethToInr(totalDonated.toFixed(6))}
          </div>
          <div style={styles.totalEth}>{totalDonated.toFixed(6)} ETH</div>
        </div>
      </div>

      <div style={styles.list}>
        {donations.map((donation, index) => (
          <div key={index} style={styles.donationCard}>
            <div style={styles.donationHeader}>
              <h3 style={styles.campaignTitle}>{donation.campaign.title}</h3>
              <div style={styles.category}>{donation.campaign.category}</div>
            </div>
            <div style={styles.donationBody}>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Your Contribution</div>
                <div style={styles.statValue}>
                  {CURRENCY.symbol}{ethToInr(donation.contribution)}
                </div>
                <div style={styles.statEth}>{donation.contribution} ETH</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Campaign Progress</div>
                <div style={styles.progress}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(
                        (Number(donation.campaign.raisedAmount) /
                          Number(donation.campaign.goalAmount)) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div style={styles.progressText}>
                  {CURRENCY.symbol}
                  {ethToInr(ethers.formatEther(donation.campaign.raisedAmount))} /{" "}
                  {CURRENCY.symbol}
                  {ethToInr(ethers.formatEther(donation.campaign.goalAmount))}
                </div>
              </div>
            </div>
            
            {/* Transaction Links Section */}
            <div style={styles.transactionSection}>
              {donation.storedTransactions && donation.storedTransactions.length > 0 ? (
                <div style={styles.transactionList}>
                  <div style={styles.transactionLabel}>Your Donation Transactions:</div>
                  {donation.storedTransactions.slice(0, 2).map((tx, txIndex) => (
                    <div key={`${tx.txHash}-${txIndex}`} style={styles.transactionItem}>
                      <a
                        href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.transactionLink}
                      >
                        🔗 {tx.amount} ETH - View on BaseScan
                      </a>
                      <div style={styles.transactionDate}>
                        {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {donation.storedTransactions.length > 2 && (
                    <div style={styles.moreTransactions}>
                      +{donation.storedTransactions.length - 2} more transactions
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.noTransactionInfo}>
                  <div style={styles.noTransactionIcon}>💝</div>
                  <div style={styles.noTransactionText}>
                    Transaction details not available
                  </div>
                  <div style={styles.noTransactionSubtext}>
                    Your donation was recorded but transaction hash couldn't be retrieved
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
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
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "1.5rem",
  },
  totalCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "2rem",
    borderRadius: "20px",
    color: "white",
    textAlign: "center",
  },
  totalLabel: {
    fontSize: "1rem",
    opacity: 0.9,
    marginBottom: "0.5rem",
  },
  totalValue: {
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "0.25rem",
  },
  totalEth: {
    fontSize: "1rem",
    opacity: 0.8,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  donationCard: {
    background: "white",
    borderRadius: "15px",
    padding: "1.5rem",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },
  donationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #e5e7eb",
  },
  campaignTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
  },
  category: {
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "0.5rem 1rem",
    borderRadius: "12px",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  donationBody: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
  },
  statLabel: {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#667eea",
  },
  statEth: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginTop: "0.25rem",
  },
  progress: {
    width: "100%",
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    marginBottom: "0.5rem",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
    transition: "width 0.3s",
  },
  progressText: {
    fontSize: "0.85rem",
    color: "#6b7280",
  },
  transactionSection: {
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
  },
  transactionList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  transactionLabel: {
    fontSize: "0.85rem",
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: "0.75rem",
  },
  transactionItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  transactionLink: {
    display: "inline-block",
    padding: "0.75rem 1.25rem",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
    alignSelf: "flex-start",
  },
  transactionDate: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontStyle: "italic",
    marginLeft: "0.5rem",
  },
  moreTransactions: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: "0.25rem",
  },
  noTransactionInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem 1rem",
    background: "#f8fafc",
    borderRadius: "10px",
    border: "2px dashed #cbd5e1",
    textAlign: "center",
    marginTop: "0.5rem",
  },
  noTransactionIcon: {
    fontSize: "1.5rem",
    marginBottom: "0.5rem",
    opacity: 0.6,
  },
  noTransactionText: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#64748b",
    marginBottom: "0.25rem",
  },
  noTransactionSubtext: {
    fontSize: "0.8rem",
    color: "#94a3b8",
    lineHeight: "1.3",
    maxWidth: "240px",
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

export default MyDonations;
