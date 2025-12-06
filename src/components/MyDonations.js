import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract } from "../config/contract";
import { CURRENCY, ethToInr } from "../config/config";

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

      const myDonations = [];
      for (const campaign of allCampaigns) {
        const contribution = await contract.getContribution(campaign.id, account);
        if (contribution > 0) {
          myDonations.push({
            campaign,
            contribution: ethers.formatEther(contribution),
          });
        }
      }

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
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1200px",
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
