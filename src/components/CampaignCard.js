import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CURRENCY, ethToInr } from "../config/config";

const CampaignCard = ({ campaign, onClick }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const deadline = Number(campaign.deadline);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("Ended");
        if (Number(campaign.raisedAmount) >= Number(campaign.goalAmount)) {
          setStatus("FUNDED");
        } else {
          setStatus("EXPIRED");
        }
      } else {
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        setTimeLeft(`${days}d ${hours}h left`);
        
        if (Number(campaign.raisedAmount) >= Number(campaign.goalAmount)) {
          setStatus("FUNDED");
        } else {
          setStatus("ACTIVE");
        }
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [campaign]);

  const progress = Math.min(
    (Number(campaign.raisedAmount) / Number(campaign.goalAmount)) * 100,
    100
  );

  const getStatusColor = () => {
    switch (status) {
      case "FUNDED":
        return "#10b981";
      case "EXPIRED":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.imageContainer}>
        {campaign.imageURI ? (
          <img
            src={campaign.imageURI}
            alt={campaign.title}
            style={styles.image}
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/400x200?text=Campaign";
            }}
          />
        ) : (
          <div style={styles.placeholder}>📷</div>
        )}
        <div style={{ ...styles.badge, background: getStatusColor() }}>
          {status}
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.category}>{campaign.category}</div>
        <h3 style={styles.title}>{campaign.title}</h3>
        <p style={styles.description}>
          {campaign.description.length > 100
            ? campaign.description.substring(0, 100) + "..."
            : campaign.description}
        </p>

        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div style={styles.progressText}>{progress.toFixed(1)}%</div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statValue}>
              {CURRENCY.symbol}{ethToInr(ethers.formatEther(campaign.raisedAmount))}
            </div>
            <div style={styles.statLabel}>Raised</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>
              {CURRENCY.symbol}{ethToInr(ethers.formatEther(campaign.goalAmount))}
            </div>
            <div style={styles.statLabel}>Goal</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>{campaign.donorsCount.toString()}</div>
            <div style={styles.statLabel}>Donors</div>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.creator}>
            👤 {campaign.creatorInfo || "Anonymous"}
          </div>
          <div style={styles.time}>⏰ {timeLeft}</div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    background: "white",
    borderRadius: "15px",
    overflow: "hidden",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "transform 0.3s, box-shadow 0.3s",
    ":hover": {
      transform: "translateY(-5px)",
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
    },
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: "200px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontSize: "4rem",
  },
  badge: {
    position: "absolute",
    top: "10px",
    right: "10px",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    color: "white",
    fontWeight: "600",
    fontSize: "0.85rem",
  },
  content: {
    padding: "1.5rem",
  },
  category: {
    display: "inline-block",
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    fontSize: "0.85rem",
    fontWeight: "600",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 0.5rem 0",
  },
  description: {
    color: "#6b7280",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    marginBottom: "1rem",
  },
  progressContainer: {
    marginBottom: "1rem",
  },
  progressBar: {
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
    textAlign: "right",
  },
  stats: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
  },
  stat: {
    textAlign: "center",
  },
  statValue: {
    fontSize: "1rem",
    fontWeight: "700",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    marginTop: "0.25rem",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.85rem",
    color: "#6b7280",
  },
  creator: {
    fontWeight: "500",
  },
  time: {
    fontWeight: "600",
  },
};

export default CampaignCard;
