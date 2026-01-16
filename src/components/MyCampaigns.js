import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { getContract } from "../config/contract";
import { CURRENCY, ethToInr } from "../config/config";
import { toast } from "react-toastify";
import { storeWithdrawal } from "../utils/withdrawalTracker";
import { getCampaignImage } from "../utils/categoryImages";

const MyCampaigns = ({ account }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (account) {
      loadMyCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const loadMyCampaigns = async () => {
    try {
      setLoading(true);
      const { getUserCampaigns } = await import("../utils/dataCache");
      const userCampaigns = await getUserCampaigns(account);
      
      const myCampaigns = userCampaigns.map(c => ({
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
        createdAt: null, // Skip timestamp fetching for performance
      }));

      // Sort by campaign ID (higher = newer)
      myCampaigns.sort((a, b) => parseInt(b.id) - parseInt(a.id));

      setCampaigns(myCampaigns);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
      toast.error("Failed to load your campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignClick = (campaignId) => {
    navigate(`/campaign/${campaignId}`);
  };



  const handleWithdraw = async (campaignId) => {
    try {
      setWithdrawing(campaignId);
      const { provider } = await getContract();
      const { contract } = await getContract();
      
      // Find the campaign to get details
      const campaign = campaigns.find(c => c.id === campaignId);
      
      toast.info("Please confirm withdrawal in MetaMask...");
      const tx = await contract.withdraw(campaignId);
      
      toast.info("Transaction submitted. Waiting for blockchain confirmation...");
      const receipt = await tx.wait();
      
      // Only proceed if transaction was successful
      if (receipt.status !== 1) {
        throw new Error("Transaction failed");
      }
      
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
      
      toast.success("Withdrawal confirmed! Funds transferred successfully.");
      
      // Invalidate cache and reload campaigns
      const { invalidateCache } = await import("../utils/dataCache");
      invalidateCache();
      loadMyCampaigns();
      
      // Also refresh the page after a short delay to ensure all components update
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
          <h3>Wallet Connection Required</h3>
          <p>Please connect your wallet to view and manage your campaigns</p>
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
        <h2 style={styles.title}>My Campaigns</h2>
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
          <div style={styles.emptyText}>No Campaigns</div>
          <h3>No Campaigns Yet</h3>
          <p>Create your first campaign to get started!</p>
        </div>
      ) : (
        <>
          {activeCampaigns.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Active Campaigns</h3>
              <div style={styles.grid}>
                {activeCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onWithdraw={handleWithdraw}
                    withdrawing={withdrawing}
                    onClick={() => handleCampaignClick(campaign.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {completedCampaigns.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Completed Campaigns</h3>
              <div style={styles.grid}>
                {completedCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onWithdraw={handleWithdraw}
                    withdrawing={withdrawing}
                    onClick={() => handleCampaignClick(campaign.id)}
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

const CampaignCard = ({ campaign, onWithdraw, withdrawing, onClick }) => {
  const [proofCount, setProofCount] = useState(0);
  const [contract, setContract] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const loadProofCount = async () => {
      try {
        const { contract } = await getContract();
        setContract(contract);
        const proofs = await contract.getUsageProofs(campaign.id);
        setProofCount(proofs.length);
      } catch (error) {
        console.error("Failed to load proof count:", error);
      }
    };
    
    if (campaign.goalReached && !campaign.withdrawn && !campaign.isActive) {
      loadProofCount();
    }
  }, [campaign.id, campaign.goalReached, campaign.withdrawn, campaign.isActive]);

  const progress = (parseFloat(campaign.raisedAmount) / parseFloat(campaign.goalAmount)) * 100;
  const daysLeft = Math.ceil((campaign.deadline - new Date()) / (1000 * 60 * 60 * 24));
  const needsProof = campaign.goalReached && !campaign.withdrawn && !campaign.isActive && proofCount === 0;
  const canWithdraw = campaign.goalReached && !campaign.withdrawn && !campaign.isActive && proofCount > 0;

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
      {/* Image Section - Fixed Height */}
      <div style={styles.cardImage}>
        <img
          src={getCampaignImage(campaign.imageURI, campaign.category)}
          alt={campaign.title}
          style={styles.image}
          onError={(e) => {
            // Fallback to placeholder if even category image fails
            e.target.src = "https://via.placeholder.com/400x200?text=Campaign";
          }}
        />
        <div style={styles.badge}>
          {campaign.withdrawn ? "Withdrawn" : campaign.isActive ? "Active" : "Ended"}
        </div>
      </div>

      {/* Content Section - Fixed Height with Proper Layout */}
      <div style={styles.cardContent}>
        {/* Header - Fixed Height */}
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>{campaign.title}</h3>
          <div style={styles.category}>{campaign.category}</div>
        </div>
        
        {/* Description - Fixed Height with Truncation */}
        <p style={styles.cardDescription}>{campaign.description}</p>

        {/* Creation Date - Fixed Height */}
        <div style={styles.creationDate}>
          <span style={styles.creationLabel}>Created:</span>
          <span style={styles.creationValue}>
            {campaign.createdAt 
              ? campaign.createdAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              : `Campaign #${campaign.id}`
            }
          </span>
        </div>

        {/* Progress Section - Fixed Height */}
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div style={styles.progressText}>{progress.toFixed(1)}% funded</div>
        </div>

        {/* Amounts Section - Fixed Height */}
        <div style={styles.amounts}>
          <div style={styles.amountColumn}>
            <div style={styles.amountLabel}>Raised</div>
            <div style={styles.amountValue}>
              {CURRENCY.symbol}{ethToInr(campaign.raisedAmount)}
            </div>
            <div style={styles.ethValue}>{campaign.raisedAmount} ETH</div>
          </div>
          <div style={styles.amountColumn}>
            <div style={styles.amountLabel}>Goal</div>
            <div style={styles.amountValue}>
              {CURRENCY.symbol}{ethToInr(campaign.goalAmount)}
            </div>
            <div style={styles.ethValue}>{campaign.goalAmount} ETH</div>
          </div>
        </div>

        {/* Info Section - Fixed Height */}
        <div style={styles.info}>
          <div style={styles.infoItem}>
            <span>{campaign.donorsCount} donors</span>
          </div>
          <div style={styles.infoItem}>
            <span>
              {campaign.isActive
                ? `${daysLeft > 0 ? `${daysLeft} days left` : "Ending soon"}`
                : "Ended"}
            </span>
          </div>
        </div>

        {/* Action Section - Always at Bottom with Fixed Height */}
        <div style={styles.actionSection}>
          {needsProof && (
            <div style={styles.proofRequired}>
              <div style={styles.proofText}>
                <strong>Proof Required</strong><br />
                Upload fund utilization proof to withdraw
              </div>
            </div>
          )}

          {canWithdraw && (
            <button
              style={styles.withdrawBtn}
              onClick={(e) => {
                e.stopPropagation();
                onWithdraw(campaign.id);
              }}
              disabled={withdrawing === campaign.id}
            >
              {withdrawing === campaign.id ? "Withdrawing..." : "Withdraw Funds"}
            </button>
          )}

          {campaign.withdrawn && (
            <div style={styles.withdrawnNote}>
              Funds have been withdrawn
            </div>
          )}

          {!campaign.goalReached && !campaign.isActive && (
            <div style={styles.failedNote}>
              Goal not reached - Donors can claim refunds
            </div>
          )}
        </div>
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
    border: "2px solid #e5e7eb",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    height: "600px", // Consistent height for all cards
    width: "100%",
  },
  cardImage: {
    position: "relative",
    height: "180px", // Good image height
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
    background: "rgba(255,255,255,0.95)",
    padding: "0.5rem 1rem",
    borderRadius: "15px",
    fontSize: "0.85rem",
    fontWeight: "600",
    backdropFilter: "blur(10px)",
    color: "#1f2937",
  },
  cardContent: {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "420px", // Adjusted content height
    overflow: "hidden", // Prevent content overflow
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "0.75rem",
    marginBottom: "1rem",
    minHeight: "50px", // INCREASED header height
  },
  cardTitle: {
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
    maxHeight: "2.6em", // Better title space
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
  cardDescription: {
    fontSize: "0.9rem",
    color: "#6b7280",
    lineHeight: "1.4",
    display: "-webkit-box",
    WebkitLineClamp: 2, // Reduced to 2 lines for better spacing
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    height: "2.8em", // Adjusted description height
    marginBottom: "1rem",
  },
  creationDate: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    background: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    marginBottom: "1rem",
    minHeight: "40px", // INCREASED date section height
  },
  creationLabel: {
    fontSize: "0.8rem",
    color: "#64748b",
    fontWeight: "600",
  },
  creationValue: {
    fontSize: "0.8rem",
    color: "#334155",
    fontWeight: "500",
  },
  progressSection: {
    marginBottom: "1rem",
    height: "40px", // INCREASED progress section height
  },
  progressBar: {
    height: "8px", // Slightly thicker progress bar
    background: "#e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    marginBottom: "0.75rem",
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
    fontWeight: "600",
  },
  amounts: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: "8px",
    border: "1px solid #f1f5f9",
    marginBottom: "1rem",
    minHeight: "80px", // INCREASED amounts section height
  },
  amountLabel: {
    fontSize: "0.8rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
    fontWeight: "600",
  },
  amountValue: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#1f2937",
    lineHeight: "1.2",
  },
  ethValue: {
    fontSize: "0.8rem",
    color: "#6b7280",
    marginTop: "0.25rem",
  },
  info: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: "1rem",
    minHeight: "25px", // INCREASED info section height
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  // Action section - FIXED at bottom with better height
  actionSection: {
    marginTop: "auto", // Pushes to bottom
    minHeight: "60px", // Increased action section height for better alignment
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  withdrawBtn: {
    width: "100%",
    padding: "0.875rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  withdrawnNote: {
    padding: "0.875rem",
    background: "#d1fae5",
    color: "#065f46",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "600",
    fontSize: "0.85rem",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #a7f3d0",
  },
  failedNote: {
    padding: "0.875rem",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "8px",
    textAlign: "center",
    fontWeight: "600",
    fontSize: "0.85rem",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #fcd34d",
  },
  proofRequired: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.875rem",
    background: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: "8px",
    marginBottom: "0",
    minHeight: "44px",
  },
  proofText: {
    fontSize: "0.8rem",
    color: "#92400e",
    lineHeight: "1.3",
    fontWeight: "600",
    textAlign: "center",
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
  emptyText: {
    fontSize: "2rem",
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: "1rem",
  },
};

export default MyCampaigns;
