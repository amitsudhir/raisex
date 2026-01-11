import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "../config/contract";
import { CURRENCY, ethToInr, CONTRACT_ADDRESS } from "../config/config";
import { getStoredWithdrawals } from "../utils/withdrawalTracker";

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
      const { getUserWithdrawals } = await import("../utils/dataCache");
      const userWithdrawals = await getUserWithdrawals(account);

      // Get stored withdrawal data
      const storedWithdrawals = getStoredWithdrawals(account);

      // Process withdrawal data
      const withdrawalData = userWithdrawals.map(campaign => {
        const campaignId = campaign.id.toString();
        const stored = storedWithdrawals[campaignId];
        
        return {
          campaignId,
          campaignTitle: campaign.title,
          amount: ethers.formatEther(campaign.raisedAmount),
          txHash: stored?.txHash || null,
          blockNumber: stored?.blockNumber || null,
          timestamp: stored?.timestamp || null
        };
      });

      // Sort by campaign ID (higher = newer)
      withdrawalData.sort((a, b) => parseInt(b.campaignId) - parseInt(a.campaignId));

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
          <h3>Wallet Connection Required</h3>
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
      <div style={styles.headerSection}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>My Withdrawals</h2>
          <p style={styles.subtitle}>Track your successful fund withdrawals</p>
        </div>
        
        {withdrawals.length > 0 && (
          <div style={styles.statsCard}>
            <div style={styles.statsHeader}>
              <div style={styles.statsIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9L17 14.74L18.18 21.02L12 17.77L5.82 21.02L7 14.74L2 9L8.91 8.26L12 2Z" fill="currentColor"/>
                  <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.3)"/>
                </svg>
              </div>
              <div style={styles.statsInfo}>
                <div style={styles.statsLabel}>Total Withdrawn</div>
                <div style={styles.statsValue}>
                  {CURRENCY.symbol}{ethToInr(totalWithdrawn.toFixed(4))}
                </div>
                <div style={styles.statsSubValue}>{totalWithdrawn.toFixed(4)} ETH</div>
              </div>
            </div>
            <div style={styles.statsFooter}>
              <span style={styles.withdrawalCount}>{withdrawals.length} withdrawal{withdrawals.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {withdrawals.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M7 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <path d="M10 12h4" stroke="white" strokeWidth="1"/>
            </svg>
          </div>
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
                <div style={styles.badge}>Withdrawn</div>
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
                        View Transaction on BaseScan
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
                          View Your Transactions
                        </a>
                        <a
                          href={`https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}#events`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.fallbackButton}
                        >
                          View Contract Events
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
  headerSection: {
    marginBottom: "2rem",
  },
  titleArea: {
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 0.5rem 0",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#6b7280",
    margin: 0,
  },
  statsCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "20px",
    padding: "1.5rem",
    color: "white",
    boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  statsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
  },
  statsIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "60px",
    height: "60px",
    background: "rgba(255, 255, 255, 0.2)",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    color: "white",
  },
  statsInfo: {
    flex: 1,
  },
  statsLabel: {
    fontSize: "0.9rem",
    opacity: 0.9,
    marginBottom: "0.25rem",
    fontWeight: "500",
  },
  statsValue: {
    fontSize: "2rem",
    fontWeight: "700",
    marginBottom: "0.25rem",
    lineHeight: "1.2",
  },
  statsSubValue: {
    fontSize: "1rem",
    opacity: 0.8,
    fontWeight: "500",
  },
  statsFooter: {
    paddingTop: "1rem",
    borderTop: "1px solid rgba(255, 255, 255, 0.2)",
    textAlign: "center",
  },
  withdrawalCount: {
    fontSize: "0.9rem",
    opacity: 0.9,
    fontWeight: "500",
  },
  empty: {
    textAlign: "center",
    padding: "4rem 1rem",
    color: "#6b7280",
  },
  emptyIcon: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "1.5rem",
    color: "#9ca3af",
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
};

export default MyWithdrawals;
