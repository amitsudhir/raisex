import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContract } from "../config/contract";

const CampaignDetail = ({ campaign, account, onClose, onSuccess }) => {
  const [donateAmount, setDonateAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [myContribution, setMyContribution] = useState("0");
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    loadMyContribution();
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [campaign, account]);

  const loadMyContribution = async () => {
    if (!account) return;
    try {
      const { contract } = await getContract();
      const contribution = await contract.getContribution(campaign.id, account);
      setMyContribution(ethers.formatEther(contribution));
    } catch (error) {
      console.error("Failed to load contribution:", error);
    }
  };

  const updateTimeLeft = () => {
    const now = Math.floor(Date.now() / 1000);
    const deadline = Number(campaign.deadline);
    const diff = deadline - now;

    if (diff <= 0) {
      setTimeLeft("Campaign Ended");
      if (Number(campaign.raisedAmount) >= Number(campaign.goalAmount)) {
        setStatus("FUNDED");
      } else {
        setStatus("EXPIRED");
      }
    } else {
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      
      if (Number(campaign.raisedAmount) >= Number(campaign.goalAmount)) {
        setStatus("FUNDED");
      } else {
        setStatus("ACTIVE");
      }
    }
  };

  const handleDonate = async () => {
    if (!donateAmount || parseFloat(donateAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const { contract } = await getContract();
      const tx = await contract.donate(campaign.id, {
        value: ethers.parseEther(donateAmount),
      });
      await tx.wait();
      alert("Donation successful! 🎉");
      setDonateAmount("");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Donation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const { contract } = await getContract();
      const tx = await contract.withdraw(campaign.id);
      await tx.wait();
      alert("Withdrawal successful! 💰");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Withdrawal failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    setLoading(true);
    try {
      const { contract } = await getContract();
      const tx = await contract.claimRefund(campaign.id);
      await tx.wait();
      alert("Refund claimed successfully! 💸");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Refund failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.min(
    (Number(campaign.raisedAmount) / Number(campaign.goalAmount)) * 100,
    100
  );

  const isOwner = account && account.toLowerCase() === campaign.owner.toLowerCase();
  const canWithdraw = isOwner && !campaign.withdrawn && status === "FUNDED";
  const canRefund = !isOwner && status === "EXPIRED" && parseFloat(myContribution) > 0;
  const canDonate = status === "ACTIVE" && !isOwner;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        {campaign.imageURI && (
          <img
            src={campaign.imageURI}
            alt={campaign.title}
            style={styles.image}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}

        <div style={styles.content}>
          <div style={styles.header}>
            <div style={styles.category}>{campaign.category}</div>
            <div style={{ ...styles.statusBadge, background: getStatusColor(status) }}>
              {status}
            </div>
          </div>

          <h2 style={styles.title}>{campaign.title}</h2>
          <p style={styles.description}>{campaign.description}</p>

          <div style={styles.progressSection}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <div style={styles.progressStats}>
              <span>{progress.toFixed(1)}% funded</span>
              <span>{timeLeft}</span>
            </div>
          </div>

          <div style={styles.stats}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>
                {ethers.formatEther(campaign.raisedAmount)} ETH
              </div>
              <div style={styles.statLabel}>Raised</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>
                {ethers.formatEther(campaign.goalAmount)} ETH
              </div>
              <div style={styles.statLabel}>Goal</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{campaign.donorsCount.toString()}</div>
              <div style={styles.statLabel}>Donors</div>
            </div>
          </div>

          <div style={styles.info}>
            <div style={styles.infoRow}>
              <span>👤 Creator:</span>
              <span>{campaign.creatorInfo || "Anonymous"}</span>
            </div>
            <div style={styles.infoRow}>
              <span>📍 Owner:</span>
              <span>{campaign.owner.slice(0, 6)}...{campaign.owner.slice(-4)}</span>
            </div>
            {parseFloat(myContribution) > 0 && (
              <div style={styles.infoRow}>
                <span>💝 Your Contribution:</span>
                <span style={styles.highlight}>{myContribution} ETH</span>
              </div>
            )}
          </div>

          {canDonate && (
            <div style={styles.donateSection}>
              <input
                type="number"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                placeholder="Amount in ETH"
                step="0.001"
                min="0.001"
                style={styles.input}
              />
              <button
                onClick={handleDonate}
                disabled={loading}
                style={styles.donateBtn}
              >
                {loading ? "Processing..." : "Donate Now 💖"}
              </button>
            </div>
          )}

          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={loading}
              style={styles.withdrawBtn}
            >
              {loading ? "Processing..." : "Withdraw Funds 💰"}
            </button>
          )}

          {canRefund && (
            <button
              onClick={handleRefund}
              disabled={loading}
              style={styles.refundBtn}
            >
              {loading ? "Processing..." : "Claim Refund 💸"}
            </button>
          )}

          {!account && (
            <div style={styles.warning}>
              Please connect your wallet to interact with this campaign
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case "FUNDED":
      return "#10b981";
    case "EXPIRED":
      return "#ef4444";
    default:
      return "#3b82f6";
  }
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
    padding: "1rem",
  },
  modal: {
    background: "white",
    borderRadius: "20px",
    maxWidth: "700px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    position: "relative",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  closeBtn: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "rgba(0,0,0,0.5)",
    color: "white",
    border: "none",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    fontSize: "1.5rem",
    cursor: "pointer",
    zIndex: 10,
  },
  image: {
    width: "100%",
    height: "300px",
    objectFit: "cover",
  },
  content: {
    padding: "2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  category: {
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "0.5rem 1rem",
    borderRadius: "15px",
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  statusBadge: {
    padding: "0.5rem 1rem",
    borderRadius: "15px",
    color: "white",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 1rem 0",
  },
  description: {
    color: "#6b7280",
    fontSize: "1.1rem",
    lineHeight: "1.6",
    marginBottom: "2rem",
  },
  progressSection: {
    marginBottom: "2rem",
  },
  progressBar: {
    width: "100%",
    height: "12px",
    background: "#e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    marginBottom: "0.75rem",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
    transition: "width 0.3s",
  },
  progressStats: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.95rem",
    color: "#6b7280",
    fontWeight: "600",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
    marginBottom: "2rem",
  },
  statBox: {
    background: "#f9fafb",
    padding: "1.5rem",
    borderRadius: "15px",
    textAlign: "center",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "0.5rem",
  },
  statLabel: {
    fontSize: "0.9rem",
    color: "#9ca3af",
  },
  info: {
    background: "#f9fafb",
    padding: "1.5rem",
    borderRadius: "15px",
    marginBottom: "2rem",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.75rem 0",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "0.95rem",
  },
  highlight: {
    color: "#667eea",
    fontWeight: "700",
  },
  donateSection: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1rem",
  },
  input: {
    flex: 1,
    padding: "1rem",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "1rem",
  },
  donateBtn: {
    padding: "1rem 2rem",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  withdrawBtn: {
    width: "100%",
    padding: "1rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  refundBtn: {
    width: "100%",
    padding: "1rem",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  warning: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "1rem",
    borderRadius: "12px",
    textAlign: "center",
    fontWeight: "600",
  },
};

export default CampaignDetail;
