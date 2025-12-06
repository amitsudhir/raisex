import React, { useState, useEffect } from "react";
import { getReadOnlyContract } from "../config/contract";
import CampaignCard from "./CampaignCard";
import CampaignDetail from "./CampaignDetail";

const CampaignList = ({ account, refreshTrigger }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    loadCampaigns();
  }, [refreshTrigger]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { contract } = await getReadOnlyContract();
      const allCampaigns = await contract.getAllCampaigns();
      
      // Reverse to show newest first
      setCampaigns([...allCampaigns].reverse());
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      // Don't show alert, just set empty campaigns
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCampaigns = () => {
    const now = Math.floor(Date.now() / 1000);
    
    switch (filter) {
      case "ACTIVE":
        return campaigns.filter(
          (c) =>
            Number(c.deadline) > now &&
            Number(c.raisedAmount) < Number(c.goalAmount)
        );
      case "FUNDED":
        return campaigns.filter(
          (c) => Number(c.raisedAmount) >= Number(c.goalAmount)
        );
      case "EXPIRED":
        return campaigns.filter(
          (c) =>
            Number(c.deadline) <= now &&
            Number(c.raisedAmount) < Number(c.goalAmount)
        );
      default:
        return campaigns;
    }
  };

  const filteredCampaigns = getFilteredCampaigns();

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.filters}>
        {["ALL", "ACTIVE", "FUNDED", "EXPIRED"].map((f) => (
          <button
            key={f}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredCampaigns.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📭</div>
          <h3>No campaigns found</h3>
          <p>Be the first to create a campaign!</p>
          {campaigns.length === 0 && !loading && (
            <div style={styles.setupNote}>
              <p style={styles.setupText}>
                ⚠️ Make sure you have:
                <br />
                1. Deployed the contract on Remix
                <br />
                2. Updated CONTRACT_ADDRESS in src/config/config.js
                <br />
                3. Updated CONTRACT_ABI in src/config/contract.js
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id.toString()}
              campaign={campaign}
              onClick={() => setSelectedCampaign(campaign)}
            />
          ))}
        </div>
      )}

      {selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          account={account}
          onClose={() => setSelectedCampaign(null)}
          onSuccess={() => {
            setSelectedCampaign(null);
            loadCampaigns();
          }}
        />
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
  filters: {
    display: "flex",
    gap: "1rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "0.75rem 1.5rem",
    border: "2px solid #e5e7eb",
    background: "white",
    borderRadius: "25px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.95rem",
    color: "#6b7280",
    transition: "all 0.3s",
  },
  filterBtnActive: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    borderColor: "transparent",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "2rem",
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
  setupNote: {
    marginTop: "2rem",
    padding: "1.5rem",
    background: "#fef3c7",
    borderRadius: "15px",
    maxWidth: "500px",
    margin: "2rem auto 0",
  },
  setupText: {
    color: "#92400e",
    fontSize: "0.95rem",
    lineHeight: "1.8",
    margin: 0,
    textAlign: "left",
  },
};

export default CampaignList;
