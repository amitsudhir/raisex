import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract, getContract } from "../config/contract";
import { CURRENCY, ethToInr, CONTRACT_ADDRESS } from "../config/config";
import { getStoredDonations } from "../utils/donationTracker";
import { getStoredRefunds } from "../utils/refundTracker";
import { toast } from "react-toastify";
import { notifyTransactionSubmitted, notifyTransactionConfirmed, notifyTransactionFailed } from "../utils/notifications";
import { storeRefund } from "../utils/refundTracker";
import { useNavigate } from "react-router-dom";

const MyDonations = ({ account }) => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (account) {
      loadMyDonations();
    }
  }, [account]);

  const loadMyDonations = async () => {
    try {
      setLoading(true);
      const { getUserDonations } = await import("../utils/dataCache");
      const userDonations = await getUserDonations(account);

      // Get stored donation and refund data
      const storedDonations = getStoredDonations(account);
      const storedRefunds = getStoredRefunds(account);

      const myDonations = userDonations.map(({ campaign, contribution }) => {
        const now = Math.floor(Date.now() / 1000);
        const deadline = Number(campaign.deadline);
        const isExpired = now >= deadline;
        const goalReached = campaign.raisedAmount >= campaign.goalAmount;
        const canRefund = isExpired && !goalReached && !campaign.withdrawn;
        const hasRefund = storedRefunds[campaign.id.toString()];
        
        return {
          campaign,
          contribution: ethers.formatEther(contribution),
          storedTransactions: (storedDonations[campaign.id.toString()] || [])
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
          canRefund: canRefund && !hasRefund, // Can't refund if already refunded
          isExpired,
          goalReached,
          refundTransaction: hasRefund
        };
      });

      // Sort donations by campaign ID (higher = newer)
      myDonations.sort((a, b) => parseInt(b.campaign.id) - parseInt(a.campaign.id));

      setDonations(myDonations);
    } catch (error) {
      console.error("Failed to load donations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (campaignId, contribution, campaignTitle) => {
    try {
      setRefunding(campaignId);
      const { contract, provider } = await getContract();
      
      toast.info("Please confirm refund claim in MetaMask...");
      const tx = await contract.claimRefund(campaignId);
      
      await notifyTransactionSubmitted(tx.hash);
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Store refund data for future reference
        if (receipt.hash) {
          // Get block details for timestamp
          const block = await provider.getBlock(receipt.blockNumber);
          const timestamp = block ? block.timestamp * 1000 : Date.now();
          
          storeRefund(
            account,
            campaignId.toString(),
            receipt.hash,
            contribution,
            campaignTitle,
            receipt.blockNumber,
            timestamp
          );
        }
        
        await notifyTransactionConfirmed('refund', {
          body: `Successfully claimed refund of ${contribution} ETH`
        });
        
        // Reload donations to update the UI
        loadMyDonations();
      } else {
        await notifyTransactionFailed("Transaction failed", "refund");
      }
    } catch (error) {
      console.error("Refund failed:", error);
      await notifyTransactionFailed(error.message, "refund");
    } finally {
      setRefunding(null);
    }
  };



  if (!account) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <h3>Wallet Connection Required</h3>
          <p>Please connect your wallet to view your donation history</p>
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
        <h2 style={styles.title}>My Donations</h2>
        
        {donations.length > 0 && (
          <div style={styles.totalCard}>
            <div style={styles.totalLabel}>Total Donated</div>
            <div style={styles.totalValue}>
              {CURRENCY.symbol}{ethToInr(totalDonated.toFixed(4))}
            </div>
            <div style={styles.totalEth}>{totalDonated.toFixed(4)} ETH</div>
            <div style={styles.donationCount}>{donations.length} donation{donations.length !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      <div style={styles.list}>
        {donations.map((donation, index) => (
          <div key={index} style={styles.donationCard}>
            <div style={styles.donationHeader}>
              <h3 
                style={styles.campaignTitle}
                onClick={() => navigate(`/campaign/${donation.campaign.id.toString()}`)}
              >
                {donation.campaign.title}
              </h3>
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
            
            {/* Campaign Status and Refund Section */}
            <div style={styles.statusSection}>
              {donation.goalReached && (
                <div style={styles.statusBadge}>
                  <span style={styles.successBadge}>✓ Campaign Successful</span>
                </div>
              )}
              {donation.isExpired && !donation.goalReached && (
                <div style={styles.statusBadge}>
                  <span style={styles.failedBadge}>✗ Campaign Failed</span>
                </div>
              )}
              {!donation.isExpired && !donation.goalReached && (
                <div style={styles.statusBadge}>
                  <span style={styles.activeBadge}>⏳ Campaign Active</span>
                </div>
              )}
              
              {donation.canRefund && (
                <button
                  onClick={() => handleRefund(donation.campaign.id, donation.contribution, donation.campaign.title)}
                  disabled={refunding === donation.campaign.id.toString()}
                  style={styles.refundButton}
                >
                  {refunding === donation.campaign.id.toString() ? "Processing..." : `Claim Refund (${donation.contribution} ETH)`}
                </button>
              )}
              
              {donation.refundTransaction && (
                <div style={styles.refundCompleted}>
                  <span style={styles.refundCompletedText}>✓ Refund Claimed: {donation.refundTransaction.amount} ETH</span>
                  <a
                    href={donation.refundTransaction.blockExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.refundTxLink}
                  >
                    View Transaction
                  </a>
                </div>
              )}
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
                        {tx.amount} ETH - View on BaseScan
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
    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
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
    marginBottom: "0.5rem",
  },
  donationCount: {
    fontSize: "0.9rem",
    opacity: 0.9,
    fontWeight: "500",
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
    cursor: "pointer",
    transition: "color 0.2s ease",
    textDecoration: "underline",
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
  statusSection: {
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
  },
  successBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "1px solid #bbf7d0",
  },
  failedBadge: {
    background: "#fef2f2",
    color: "#dc2626",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "1px solid #fecaca",
  },
  activeBadge: {
    background: "#eff6ff",
    color: "#2563eb",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "1px solid #dbeafe",
  },
  refundButton: {
    padding: "0.75rem 1.5rem",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
  },
  refundCompleted: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "1rem",
    background: "#f0f9ff",
    border: "2px solid #0ea5e9",
    borderRadius: "10px",
  },
  refundCompletedText: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#0c4a6e",
  },
  refundTxLink: {
    fontSize: "0.85rem",
    color: "#0ea5e9",
    textDecoration: "none",
    fontWeight: "500",
    alignSelf: "flex-start",
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
};

export default MyDonations;
