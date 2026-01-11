import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getReadOnlyContract } from "../config/contract";
import CampaignCard from "./CampaignCard";
import CampaignDetail from "./CampaignDetail";
import SearchBar from "./SearchBar";
import { CATEGORIES } from "../config/config";

const CampaignList = ({ account, refreshTrigger, showHeader = true }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaigns();
  }, [refreshTrigger]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { getCachedCampaigns } = await import("../utils/dataCache");
      const allCampaigns = await getCachedCampaigns();
      
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
    
    let filtered = campaigns;
    
    // Filter by status
    switch (filter) {
      case "ACTIVE":
        filtered = campaigns.filter(
          (c) =>
            Number(c.deadline) > now &&
            Number(c.raisedAmount) < Number(c.goalAmount)
        );
        break;
      case "FUNDED":
        filtered = campaigns.filter(
          (c) => Number(c.raisedAmount) >= Number(c.goalAmount)
        );
        break;
      case "EXPIRED":
        filtered = campaigns.filter(
          (c) =>
            Number(c.deadline) <= now &&
            Number(c.raisedAmount) < Number(c.goalAmount)
        );
        break;
      default:
        filtered = campaigns;
    }
    
    // Filter by category
    if (categoryFilter !== "ALL") {
      filtered = filtered.filter(
        (c) => c.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.creatorInfo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const handleCampaignClick = (campaign) => {
    navigate(`/campaign/${campaign.id.toString()}`);
  };

  let filteredCampaigns = getFilteredCampaigns();

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
      {showHeader && (
        <div style={styles.header}>
          <h2 style={styles.title}>Explore Campaigns</h2>
          <p style={styles.subtitle}>Discover and support amazing causes</p>
        </div>
      )}
      
      <div style={styles.filtersContainer}>
        <SearchBar 
          searchTerm={searchTerm} 
          onSearch={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          account={account}
        />
        
        <div style={styles.statusFilters}>
          <label style={styles.filterLabel}>Status:</label>
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
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
        <div style={styles.empty}>
          <h3>No campaigns found</h3>
          {searchTerm || categoryFilter !== "ALL" ? (
            <p>Try adjusting your search or filters to find more campaigns.</p>
          ) : (
            <p>Be the first to create a campaign!</p>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id.toString()}
              campaign={campaign}
              onClick={() => handleCampaignClick(campaign)}
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
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "700",
    margin: "0 0 0.5rem 0",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#6b7280",
    margin: 0,
  },
  filtersContainer: {
    marginBottom: "2rem",
  },
  statusFilters: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    marginTop: "1rem",
  },
  filterLabel: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#374151",
  },
  filters: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  filterBtn: {
    padding: "0.5rem 1rem",
    border: "2px solid #e5e7eb",
    background: "white",
    borderRadius: "20px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.85rem",
    color: "#6b7280",
    transition: "all 0.3s",
    whiteSpace: "nowrap",
  },
  filterBtnActive: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    borderColor: "transparent",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "2rem",
    alignItems: "start",
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



export default CampaignList;
