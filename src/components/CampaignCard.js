import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CURRENCY, ethToInr } from "../config/config";
import { getCampaignImage } from "../utils/categoryImages";

const CampaignCard = ({ campaign, onClick }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [isHovered, setIsHovered] = useState(false);

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

  const handleCardClick = (e) => {
    // Don't trigger navigation if clicking on buttons
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    onClick();
  };

  return (
    <div 
      style={{
        ...styles.card,
        transform: isHovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: isHovered ? "0 8px 25px rgba(0,0,0,0.15)" : "0 4px 15px rgba(0,0,0,0.1)",
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.imageContainer}>
        <img
          src={getCampaignImage(campaign.imageURI, campaign.category)}
          alt={campaign.title}
          style={styles.image}
          onError={(e) => {
            // Fallback to placeholder if even category image fails
            e.target.src = "https://via.placeholder.com/400x200?text=Campaign";
          }}
        />
        <div style={{ ...styles.badge, background: getStatusColor() }}>
          {status}
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.cardHeader}>
          <h3 style={styles.title}>{campaign.title}</h3>
          <div style={styles.category}>{campaign.category}</div>
        </div>
        
        <p style={styles.description}>
          {campaign.description}
        </p>

        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div style={styles.progressText}>{progress.toFixed(1)}% funded</div>
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.statValue}>
              {CURRENCY.symbol}{ethToInr(ethers.formatEther(campaign.raisedAmount))}
            </div>
            <div style={styles.statLabel}>Raised ({ethers.formatEther(campaign.raisedAmount)} ETH)</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.statValue}>
              {CURRENCY.symbol}{ethToInr(ethers.formatEther(campaign.goalAmount))}
            </div>
            <div style={styles.statLabel}>Goal ({ethers.formatEther(campaign.goalAmount)} ETH)</div>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.infoItem}>
            <span>{campaign.donorsCount.toString()} donors</span>
          </div>
          <div style={styles.infoItem}>
            <span>{timeLeft}</span>
          </div>
          <div style={styles.statusBadge}>
            <span style={{ ...styles.statusText, color: getStatusColor() }}>
              {status}
            </span>
          </div>
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
    border: "2px solid #e5e7eb",
    cursor: "pointer",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    display: "flex",
    flexDirection: "column",
    height: "600px", // Consistent height with MyCampaigns cards
    width: "100%",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: "180px", // Fixed image height
    overflow: "hidden",
    flexShrink: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  badge: {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    padding: "0.5rem 1rem",
    borderRadius: "15px",
    color: "white",
    fontWeight: "600",
    fontSize: "0.85rem",
  },
  content: {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "420px", // Consistent content height
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.75rem",
    marginBottom: "1rem",
    minHeight: "50px", // Fixed header height
  },
  category: {
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "0.4rem 0.8rem",
    borderRadius: "10px",
    fontSize: "0.8rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
    height: "fit-content",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
    flex: 1,
    lineHeight: "1.3",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    maxHeight: "2.6em", // Fixed title height
  },
  description: {
    color: "#6b7280",
    fontSize: "0.9rem",
    lineHeight: "1.4",
    marginBottom: "1rem",
    display: "-webkit-box",
    WebkitLineClamp: 2, // Consistent with MyCampaigns
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    height: "2.8em", // Consistent description height
  },
  progressContainer: {
    marginBottom: "1rem",
    height: "40px", // Fixed progress container height
  },
  progressBar: {
    width: "100%",
    height: "8px", // Fixed progress bar height
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
  progressText: {
    fontSize: "0.85rem",
    color: "#6b7280",
    textAlign: "right",
    fontWeight: "600",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
    marginBottom: "1rem",
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #f1f5f9",
    minHeight: "80px", // Fixed stats height
  },
  stat: {
    display: "flex",
    flexDirection: "column",
  },
  statValue: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#1f2937",
    lineHeight: "1.2",
  },
  statLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    marginTop: "0.25rem",
    fontWeight: "600",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.85rem",
    color: "#6b7280",
    fontWeight: "500",
    marginTop: "auto", // Pushes to bottom
    minHeight: "50px", // Consistent footer height
    padding: "0.75rem 0",
    borderTop: "1px solid #f1f5f9",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
  },
  statusText: {
    fontSize: "0.8rem",
    fontWeight: "600",
    padding: "0.25rem 0.75rem",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.8)",
    border: "1px solid currentColor",
  },
};

export default CampaignCard;