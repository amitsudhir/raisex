import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadOnlyContract, getContract } from "../config/contract";
import { CURRENCY, ethToInr } from "../config/config";
import { toast } from "react-toastify";
import { storeWithdrawal } from "../utils/withdrawalTracker";

const MyCampaigns = ({ account }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(null);

  useEffect(() => {
    if (account) {
      loadMyCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const loadMyCampaigns = async () => {
    try {
      setLoading(true);
      const { contract } = await getReadOnlyContract();
      const allCampaigns = await contract.getAllCampaigns();
      
      const myCampaigns = allCampaigns
        .filter((c) => c.owner.toLowerCase() === account.toLowerCase())
        .map((c) => ({
          id: c.id.toString(),
          title: c.title,
          description: c.description,
          goalAmount: ethers.formatEther(c.goalAmount),
          raisedAmount: ethers.formatEther(c.raisedAmount),
          deadline: new Date(Number(c.deadline) * 1000),
          imageURI: c.imageURI,
          category: c.category,
          donorsCount: c.donorsCount.toString(),
          withdrawn: c.withdrawn,
          isActive: Number(c.deadline) * 1000 > Date.now(),
          goalReached: c.raisedAmount >= c.goalAmount,
        }));

      setCampaigns(myCampaigns);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      toast.error("Failed to load your campaigns");
    } finally {
      setLoading(false);
    }
  };



  const handleWithdraw = async (campaignId) => {
    try {
      setWithdrawing(campaignId);
      const { contract, provider } = await getContract();
      
      // Find the campaign to get details
      const campaign = campaigns.find(c => c.id === campaignId);
      
      toast.info("Initiating withdrawal...");
      const tx = await contract.withdraw(campaignId);
      
      toast.info("Transaction submitted. Waiting for confirmation...");
      const receipt = await tx.wait();
      
      // Store withdrawal data for future reference
      if (campaign && receipt.hash) {
        // Get block details for timestamp
        const block = await provider.getBlock(receipt.blockNumber);
        const timestamp = block ? block.timestamp * 1000 : Date.now();
        
        storeWithdrawal(
          account, 
          campaignId, 
          receipt.hash, 
          campaign.raisedAmount, 
          campaign.title,
          receipt.blockNumber,
          timestamp
        );
      }
      
      toast.success("Funds withdrawn successfully! 🎉");
      loadMyCampaigns();
    } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error("Withdrawal failed: " + (error.reason || error.message));
    } finally {
      setWithdrawing(null);
    }
  };

  if (!account) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🔐</div>
          <h3>Connect Your Wallet</h3>
          <p>Please connect your wallet to view your campaigns</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading your campaigns...</p>
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter((c) => c.isActive);
  const completedCampaigns = campaigns.filter((c) => !c.isActive);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎯 My Campaigns</h2>
        <div style={styles.stats}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{campaigns.length}</div>
            <div style={styles.statLabel}>Total Campaigns</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{activeCampaigns.length}</div>
            <div style={styles.statLabel}>Active</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{completedCampaigns.length}</div>
            <div style={styles.statLabel}>Completed</div>
          </div>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📝</div>
          <h3>No Campaigns Yet</h3>
          <p>Create your first campaign to get started!</p>
        </div>
      ) : (
        <>
          {activeCampaigns.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🟢 Active Campaigns</h3>
              <div style={styles.grid}>
                {activeCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onWithdraw={handleWithdraw}
                    withdrawing={withdrawing}
                  />
                ))}
              </div>
            </div>
          )}

          {completedCampaigns.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>⚫ Completed Campaigns</h3>
              <div style={styles.grid}>
                {completedCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onWithdraw={handleWithdraw}
                    withdrawing={withdrawing}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const CampaignCard = ({ campaign, onWithdraw, withdrawing }) => {
  const progress = (parseFloat(campaign.raisedAmount) / parseFloat(campaign.goalAmount)) * 100;
  const daysLeft = Math.ceil((campaign.deadline - new Date()) / (1000 * 60 * 60 * 24));
  const canWithdraw = campaign.goalReached && !campaign.withdrawn && !campaign.isActive;

  return (
    <div style={styles.card}>
      <div style={styles.cardImage}>
        <img
          src={campaign.imageURI || "/fund.jpg"}
          alt={campaign.title}
          style={styles.image}
          onError={(e) => (e.target.src = "/fund.jpg")}
        />
        <div style={styles.badge}>
          {campaign.withdrawn ? "✅ Withdrawn" : campaign.isActive ? "🟢 Active" : "⚫ Ended"}
        </div>
      </div>

      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{campaign.title}</h3>
        <p style={styles.cardDescription}>{campaign.description}</p>

        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div style={styles.progressText}>{progress.toFixed(1)}% funded</div>
        </div>

        <div style={styles.amounts}>
          <div>
            <div style={styles.amountLabel}>Raised</div>
            <div style={styles.amountValue}>
              {CURRENCY.symbol}{ethToInr(campaign.raisedAmount)}
            </div>
            <div style={styles.ethValue}>{campaign.raisedAmount} ETH</div>
          </div>
          <div>
            <div style={styles.amountLabel}>Goal</div>
            <div style={styles.amountValue}>
              {CURRENCY.symbol}{ethToInr(campaign.goalAmount)}
            </div>
            <div style={styles.ethValue}>{campaign.goalAmount} ETH</div>
          </div>
        </div>

        <div style={styles.info}>
          <div style={styles.infoItem}>
            <span>👥 {campaign.donorsCount} donors</span>
          </div>
          <div style={styles.infoItem}>
            <span>
              {campaign.isActive
                ? `⏰ ${daysLeft > 0 ? `${daysLeft} days left` : "Ending soon"}`
                : "⏰ Ended"}
            </span>
          </div>
        </div>

        {canWithdraw && (
          <button
            style={styles.withdrawBtn}
            onClick={() => onWithdraw(campaign.id)}
            disabled={withdrawing === campaign.id}
          >
            {withdrawing === campaign.id ? "Withdrawing..." : "💰 Withdraw Funds"}
          </button>
        )}

        {campaign.withdrawn && (
          <div style={styles.withdrawnNote}>
            ✅ Funds have been withdrawn
          </div>
        )}

        {!campaign.goalReached && !campaign.isActive && (
          <div style={styles.failedNote}>
            ⚠️ Goal not reached - Donors can claim refunds
          </div>
        )}
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
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "1rem",
  },
  statBox: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "1.5rem",
    borderRadius: "15px",
    color: "white",
    textAlign: "center",
  },
  statValue: {
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
  },
  statLabel: {
    fontSize: "0.9rem",
    opacity: 0.9,
  },
  section: {
    marginBottom: "3rem",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "1.5rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "2rem",
  },
  card: {
    background: "white",
    borderRadius: "15px",
    overflow: "hidden",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    border: "2px solid #e5e7eb",
    transition: "transform 0.3s",
  },
  cardImage: {
    position: "relative",
    height: "200px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  badge: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "rgba(255,255,255,0.95)",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.9rem",
    fontWeight: "600",
  },
  cardContent: {
    padding: "1.5rem",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "0.5rem",
  },
  cardDescription: {
    fontSize: "0.95rem",
    color: "#6b7280",
    marginBottom: "1rem",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  progressSection: {
    marginBottom: "1rem",
  },
  progressBar: {
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    marginBottom: "0.5rem",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
    transition: "width 0.3s",
  },
  progressText: {
    fontSize: "0.85rem",
    color: "#6b7280",
    textAlign: "right",
  },
  amounts: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1rem",
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: "10px",
  },
  amountLabel: {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginBottom: "0.25rem",
  },
  amountValue: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#1f2937",
  },
  ethValue: {
    fontSize: "0.85rem",
    color: "#6b7280",
  },
  info: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1rem",
    fontSize: "0.9rem",
    color: "#6b7280",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  withdrawBtn: {
    width: "100%",
    padding: "1rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  withdrawnNote: {
    padding: "1rem",
    background: "#d1fae5",
    color: "#065f46",
    borderRadius: "10px",
    textAlign: "center",
    fontWeight: "600",
  },
  failedNote: {
    padding: "1rem",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "10px",
    textAlign: "center",
    fontWeight: "600",
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

export default MyCampaigns;
