import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "../config/contract";

const Analytics = () => {
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRaised: "0",
    activeCampaigns: 0,
    expiredCampaigns: 0,
    topCampaigns: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { contract } = await getReadOnlyContract();
      const allCampaigns = await contract.getAllCampaigns();

      const now = Math.floor(Date.now() / 1000);
      let totalRaisedBigInt = 0n;
      let activeCampaigns = 0;
      let expiredCampaigns = 0;

      allCampaigns.forEach((campaign) => {
        totalRaisedBigInt += campaign.raisedAmount;
        
        if (Number(campaign.deadline) > now && Number(campaign.raisedAmount) < Number(campaign.goalAmount)) {
          activeCampaigns++;
        } else if (Number(campaign.deadline) <= now && Number(campaign.raisedAmount) < Number(campaign.goalAmount)) {
          expiredCampaigns++;
        }
      });

      // Get top 5 funded campaigns
      const sortedCampaigns = [...allCampaigns]
        .sort((a, b) => Number(b.raisedAmount) - Number(a.raisedAmount))
        .slice(0, 5);

      setStats({
        totalCampaigns: allCampaigns.length,
        totalRaised: ethers.formatEther(totalRaisedBigInt),
        activeCampaigns,
        expiredCampaigns,
        topCampaigns: sortedCampaigns,
      });
    } catch (error) {
      console.error("Failed to load analytics:", error);
      // Set default stats on error
      setStats({
        totalCampaigns: 0,
        totalRaised: "0",
        activeCampaigns: 0,
        expiredCampaigns: 0,
        topCampaigns: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 Platform Analytics</h2>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🎯</div>
          <div style={styles.statValue}>{stats.totalCampaigns}</div>
          <div style={styles.statLabel}>Total Campaigns</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <div style={styles.statValue}>{parseFloat(stats.totalRaised).toFixed(4)} ETH</div>
          <div style={styles.statLabel}>Total Raised</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔥</div>
          <div style={styles.statValue}>{stats.activeCampaigns}</div>
          <div style={styles.statLabel}>Active Campaigns</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏰</div>
          <div style={styles.statValue}>{stats.expiredCampaigns}</div>
          <div style={styles.statLabel}>Expired Campaigns</div>
        </div>
      </div>

      {stats.topCampaigns.length > 0 && (
        <div style={styles.topSection}>
          <h3 style={styles.sectionTitle}>🏆 Top Funded Campaigns</h3>
          <div style={styles.topList}>
            {stats.topCampaigns.map((campaign, index) => (
              <div key={campaign.id.toString()} style={styles.topItem}>
                <div style={styles.topRank}>#{index + 1}</div>
                <div style={styles.topInfo}>
                  <div style={styles.topTitle}>{campaign.title}</div>
                  <div style={styles.topCategory}>{campaign.category}</div>
                </div>
                <div style={styles.topAmount}>
                  {ethers.formatEther(campaign.raisedAmount)} ETH
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "2rem",
    textAlign: "center",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1.5rem",
    marginBottom: "3rem",
  },
  statCard: {
    background: "white",
    padding: "2rem",
    borderRadius: "20px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    textAlign: "center",
    transition: "transform 0.3s",
  },
  statIcon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "0.5rem",
  },
  statLabel: {
    fontSize: "1rem",
    color: "#6b7280",
  },
  topSection: {
    background: "white",
    padding: "2rem",
    borderRadius: "20px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "1.5rem",
  },
  topList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  topItem: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: "15px",
    transition: "background 0.3s",
  },
  topRank: {
    width: "50px",
    height: "50px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.25rem",
    fontWeight: "700",
  },
  topInfo: {
    flex: 1,
  },
  topTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "0.25rem",
  },
  topCategory: {
    fontSize: "0.9rem",
    color: "#6b7280",
  },
  topAmount: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#667eea",
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

export default Analytics;
