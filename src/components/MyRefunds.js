import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredRefunds } from "../utils/refundTracker";
import { CURRENCY, ethToInr } from "../config/config";

const MyRefunds = ({ account }) => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (account) {
      loadMyRefunds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const loadMyRefunds = async () => {
    try {
      setLoading(true);
      const storedRefunds = getStoredRefunds(account);
      
      // Convert to array format
      const refundArray = Object.entries(storedRefunds).map(([campaignId, refundData]) => ({
        campaignId,
        ...refundData
      }));

      // Sort by timestamp (newest first)
      refundArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setRefunds(refundArray);
    } catch (error) {
      console.error("Failed to load refunds:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignClick = (campaignId) => {
    navigate(`/campaign/${campaignId}`);
  };

  if (!account) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <h3>Wallet Connection Required</h3>
          <p>Please connect your wallet to view your refund history</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading your refunds...</p>
        </div>
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <h3>No Refunds Yet</h3>
          <p>Refunds from failed campaigns will appear here</p>
        </div>
      </div>
    );
  }

  const totalRefunded = refunds.reduce(
    (sum, r) => sum + parseFloat(r.amount),
    0
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>My Refunds</h2>
        
        {refunds.length > 0 && (
          <div style={styles.totalCard}>
            <div style={styles.totalLabel}>Total Refunded</div>
            <div style={styles.totalValue}>
              {CURRENCY.symbol}{ethToInr(totalRefunded.toFixed(4))}
            </div>
            <div style={styles.totalEth}>{totalRefunded.toFixed(4)} ETH</div>
            <div style={styles.refundCount}>{refunds.length} refund{refunds.length !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      <div style={styles.list}>
        {refunds.map((refund, index) => (
          <div key={index} style={styles.refundCard}>
            <div style={styles.refundHeader}>
              <h3 
                style={styles.campaignTitle}
                onClick={() => handleCampaignClick(refund.campaignId)}
              >
                {refund.title}
              </h3>
              <div style={styles.statusBadge}>Refunded</div>
            </div>
            
            <div style={styles.refundBody}>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Refund Amount</div>
                <div style={styles.statValue}>
                  {CURRENCY.symbol}{ethToInr(refund.amount)}
                </div>
                <div style={styles.statEth}>{refund.amount} ETH</div>
              </div>
              
              <div style={styles.stat}>
                <div style={styles.statLabel}>Refund Date</div>
                <div style={styles.statValue}>
                  {new Date(refund.timestamp).toLocaleDateString()}
                </div>
                <div style={styles.statEth}>
                  {new Date(refund.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <div style={styles.transactionSection}>
              <div style={styles.transactionLabel}>Transaction Details:</div>
              <a
                href={refund.blockExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.transactionLink}
              >
                View on BaseScan
              </a>
              <div style={styles.transactionDate}>
                Block: {refund.blockNumber} • {new Date(refund.timestamp).toLocaleString()}
              </div>
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
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    padding: "2rem",
    borderRadius: "20px",
    color: "white",
    textAlign: "center",
    boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
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
  refundCount: {
    fontSize: "0.9rem",
    opacity: 0.9,
    fontWeight: "500",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  refundCard: {
    background: "white",
    borderRadius: "15px",
    padding: "1.5rem",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    border: "2px solid #fef3c7",
  },
  refundHeader: {
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
  statusBadge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "1px solid #fcd34d",
  },
  refundBody: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "1rem",
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
    color: "#f59e0b",
  },
  statEth: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginTop: "0.25rem",
  },
  transactionSection: {
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
  },
  transactionLabel: {
    fontSize: "0.85rem",
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: "0.75rem",
  },
  transactionLink: {
    display: "inline-block",
    padding: "0.75rem 1.25rem",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
    marginBottom: "0.5rem",
  },
  transactionDate: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontStyle: "italic",
  },
  loading: {
    textAlign: "center",
    padding: "4rem 1rem",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #f59e0b",
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

export default MyRefunds;