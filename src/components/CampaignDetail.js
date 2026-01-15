import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { getContract } from "../config/contract";
import { CURRENCY, ethToInr, inrToEth } from "../config/config";
import { storeWithdrawal } from "../utils/withdrawalTracker";
import { storeDonation } from "../utils/donationTracker";
import { storeRefund, getRefundForCampaign } from "../utils/refundTracker";
import { notifyTransactionSubmitted, notifyTransactionConfirmed, notifyTransactionFailed } from "../utils/notifications";
import ProofUpload from "./ProofUpload";
import ProofViewer from "./ProofViewer";
import { getCampaignImage } from "../utils/categoryImages";

const CampaignDetail = ({ campaign, account, onClose, onSuccess, standalone = false }) => {
  const [donateAmount, setDonateAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [myContribution, setMyContribution] = useState("0");
  const [timeLeft, setTimeLeft] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [contract, setContract] = useState(null);
  const [proofCount, setProofCount] = useState(0);
  const [creationTime, setCreationTime] = useState(null);
  const [refundStatus, setRefundStatus] = useState(null);

  useEffect(() => {
    loadMyContribution();
    updateTimeLeft();
    checkRefundStatus();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [campaign, account]);

  useEffect(() => {
    // Load contract for proof functionality
    const loadContract = async () => {
      try {
        const { contract } = await getContract();
        setContract(contract);
        
        // Load proof count for withdrawal validation
        if (campaign?.id) {
          const proofs = await contract.getUsageProofs(campaign.id);
          setProofCount(proofs.length);
        }
      } catch (error) {
        console.error("Failed to load contract:", error);
      }
    };
    
    // Load campaign creation time
    const loadCreationTime = async () => {
      if (campaign?.id) {
        try {
          const { getCampaignCreationTime } = await import("../utils/dataCache");
          const creationData = await getCampaignCreationTime(campaign.id);
          setCreationTime(creationData);
        } catch (error) {
          console.error("Failed to load creation time:", error);
        }
      }
    };
    
    loadContract();
    loadCreationTime();
  }, [campaign?.id]);

  const copyShareLink = () => {
    const campaignUrl = `${window.location.origin}/campaign/${campaign.id.toString()}`;
    navigator.clipboard.writeText(campaignUrl).then(() => {
      toast.success("Campaign link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

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

  const checkRefundStatus = () => {
    if (!account || !campaign?.id) return;
    
    try {
      const refund = getRefundForCampaign(account, campaign.id.toString());
      setRefundStatus(refund);
    } catch (error) {
      console.error("Failed to check refund status:", error);
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
      toast.error("Please enter a valid amount");
      return;
    }

    // Check minimum donation (100 INR = 0.0004 ETH approximately)
    const minDonationEth = inrToEth("100");
    if (parseFloat(donateAmount) < parseFloat(minDonationEth)) {
      toast.error("Minimum donation is ₹100");
      return;
    }

    setLoading(true);
    try {
      const { contract, provider } = await getContract();
      
      // Show initial confirmation request
      toast.info("Please confirm donation in MetaMask...");
      
      const tx = await contract.donate(campaign.id, {
        value: ethers.parseEther(donateAmount),
      });
      
      // Show transaction submitted notification
      await notifyTransactionSubmitted(tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Only show success after confirmation
      if (receipt.status === 1) {
        // Store donation data for future reference
        if (receipt.hash) {
          // Get block details for timestamp
          const block = await provider.getBlock(receipt.blockNumber);
          const timestamp = block ? block.timestamp * 1000 : Date.now();
          
          storeDonation(
            account,
            campaign.id.toString(),
            receipt.hash,
            donateAmount,
            campaign.title,
            receipt.blockNumber,
            timestamp
          );
        }
        
        await notifyTransactionConfirmed('donation', {
          body: `Successfully donated ${donateAmount} ETH to ${campaign.title}`
        });
        setDonateAmount("");
        onSuccess();
      } else {
        await notifyTransactionFailed("Transaction failed", "donation");
      }
    } catch (error) {
      console.error(error);
      await notifyTransactionFailed(error.message, "donation");
    } finally {
      setLoading(false);
    }
  };



  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const { contract } = await getContract();
      
      // Show initial confirmation request
      toast.info("Please confirm withdrawal in MetaMask...");
      
      const tx = await contract.withdraw(campaign.id);
      
      // Show transaction submitted notification
      await notifyTransactionSubmitted(tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Only show success after confirmation
      if (receipt.status === 1) {
        // Store withdrawal data for future reference
        if (receipt.hash) {
          // Get block details for timestamp
          const { provider } = await getContract();
          const block = await provider.getBlock(receipt.blockNumber);
          const timestamp = block ? block.timestamp * 1000 : Date.now();
          
          storeWithdrawal(
            account,
            campaign.id.toString(), 
            receipt.hash, 
            ethers.formatEther(campaign.raisedAmount), 
            campaign.title,
            receipt.blockNumber,
            timestamp
          );
        }
        
        await notifyTransactionConfirmed('withdrawal', {
          body: `Successfully withdrew ${ethers.formatEther(campaign.raisedAmount)} ETH from ${campaign.title}`
        });
        onSuccess();
      } else {
        await notifyTransactionFailed("Transaction failed", "withdrawal");
      }
    } catch (error) {
      console.error(error);
      await notifyTransactionFailed(error.message, "withdrawal");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    setLoading(true);
    try {
      const { contract, provider } = await getContract();
      
      // Show initial confirmation request
      toast.info("Please confirm refund claim in MetaMask...");
      
      const tx = await contract.claimRefund(campaign.id);
      
      // Show transaction submitted notification
      await notifyTransactionSubmitted(tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      // Only show success after confirmation
      if (receipt.status === 1) {
        // Store refund data for future reference
        if (receipt.hash) {
          // Get block details for timestamp
          const block = await provider.getBlock(receipt.blockNumber);
          const timestamp = block ? block.timestamp * 1000 : Date.now();
          
          storeRefund(
            account,
            campaign.id.toString(),
            receipt.hash,
            myContribution,
            campaign.title,
            receipt.blockNumber,
            timestamp
          );
          
          // Update refund status immediately
          checkRefundStatus();
        }
        
        await notifyTransactionConfirmed('refund', {
          body: `Successfully claimed refund of ${myContribution} ETH from ${campaign.title}`
        });
        
        // Refresh refund status
        checkRefundStatus();
        onSuccess();
      } else {
        await notifyTransactionFailed("Transaction failed", "refund");
      }
    } catch (error) {
      console.error(error);
      await notifyTransactionFailed(error.message, "refund");
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.min(
    (Number(campaign.raisedAmount) / Number(campaign.goalAmount)) * 100,
    100
  );

  const isOwner = account && account.toLowerCase() === campaign.owner.toLowerCase();
  const hasProofRequirement = isOwner && !campaign.withdrawn && status === "FUNDED" && proofCount === 0;
  const canWithdraw = isOwner && !campaign.withdrawn && status === "FUNDED" && proofCount > 0;
  const canRefund = status === "EXPIRED" && parseFloat(myContribution) > 0 && !refundStatus;
  const canDonate = status === "ACTIVE";
  const shouldShowProofUpload = isOwner && status === "FUNDED" && !campaign.withdrawn;

  return (
    <div style={standalone ? styles.standalonePage : styles.overlay} onClick={standalone ? undefined : onClose}>
      <div style={standalone ? styles.standaloneModal : styles.modal} onClick={(e) => e.stopPropagation()}>
        {!standalone && (
          <button style={styles.closeBtn} onClick={onClose}>
            X
          </button>
        )}

        <img
          src={getCampaignImage(campaign.imageURI, campaign.category)}
          alt={campaign.title}
          style={styles.image}
          onError={(e) => {
            // Fallback to placeholder if even category image fails
            e.target.src = "https://via.placeholder.com/400x200?text=Campaign";
          }}
        />

        <div style={styles.content}>
          <div style={styles.header}>
            <div style={styles.category}>{campaign.category}</div>
            <div style={styles.headerActions}>
              <button style={styles.shareBtn} onClick={copyShareLink}>
                Copy Campaign Link
              </button>
              <div style={{ ...styles.statusBadge, background: getStatusColor(status) }}>
                {status}
              </div>
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
                {CURRENCY.symbol}{ethToInr(ethers.formatEther(campaign.raisedAmount))}
              </div>
              <div style={styles.statLabel}>Raised ({ethers.formatEther(campaign.raisedAmount)} ETH)</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>
                {CURRENCY.symbol}{ethToInr(ethers.formatEther(campaign.goalAmount))}
              </div>
              <div style={styles.statLabel}>Goal ({ethers.formatEther(campaign.goalAmount)} ETH)</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{campaign.donorsCount.toString()}</div>
              <div style={styles.statLabel}>Donors</div>
            </div>
          </div>

          <div style={styles.info}>
            <div style={styles.infoRow}>
              <span>Creator:</span>
              <span>{campaign.creatorInfo || "Anonymous"}</span>
            </div>
            <div style={styles.infoRow}>
              <span>Owner:</span>
              <span>{campaign.owner.slice(0, 6)}...{campaign.owner.slice(-4)}</span>
            </div>
            {creationTime && (
              <div style={styles.infoRow}>
                <span>Created:</span>
                <span>{new Date(creationTime.timestamp).toLocaleString()}</span>
              </div>
            )}
            <div style={styles.infoRow}>
              <span>Deadline:</span>
              <span>{new Date(Number(campaign.deadline) * 1000).toLocaleString()}</span>
            </div>
            {parseFloat(myContribution) > 0 && (
              <div style={styles.infoRow}>
                <span>Your Contribution:</span>
                <span style={styles.highlight}>{myContribution} ETH</span>
              </div>
            )}
            {isOwner && campaign.withdrawn && (
              <div style={styles.infoRow}>
                <span>Withdrawal Status:</span>
                <span style={{ ...styles.highlight, color: "#10b981" }}>
                  Funds Withdrawn ({ethers.formatEther(campaign.raisedAmount)} ETH)
                </span>
              </div>
            )}
            {isOwner && !campaign.withdrawn && status === "FUNDED" && (
              <div style={styles.infoRow}>
                <span>Withdrawal Status:</span>
                <span style={{ ...styles.highlight, color: "#f59e0b" }}>
                  Ready to Withdraw
                </span>
              </div>
            )}
          </div>

          {canDonate && account && (
            <div style={styles.donateSection}>
              <div style={styles.inputGroup}>
                <span style={styles.currencySymbol}>{CURRENCY.symbol}</span>
                <input
                  type="number"
                  value={donateAmount ? (parseFloat(donateAmount) * CURRENCY.ethToInr).toFixed(0) : ''}
                  onChange={(e) => {
                    const inrValue = e.target.value;
                    const ethValue = inrToEth(inrValue);
                    setDonateAmount(ethValue);
                  }}
                  placeholder="Minimum ₹100"
                  step="100"
                  min="100"
                  style={styles.input}
                />
              </div>
              <div style={styles.ethEquivalent}>
                ≈ {donateAmount || '0'} ETH {donateAmount && parseFloat(donateAmount) < parseFloat(inrToEth("100")) && <span style={{color: '#ef4444'}}>(Min: ₹100)</span>}
              </div>
              <button
                onClick={handleDonate}
                disabled={loading}
                style={styles.donateBtn}
              >
                {loading ? "Processing..." : "Donate Now"}
              </button>
            </div>
          )}

          {canDonate && !account && (
            <div style={styles.connectWalletSection}>
              <div style={styles.connectWalletContent}>
                <h4 style={styles.connectWalletTitle}>Want to Support This Campaign?</h4>
                <p style={styles.connectWalletText}>
                  Connect your wallet to donate and help this campaign reach its goal.
                </p>
                <button style={styles.connectWalletBtn} onClick={() => toast.info("Please use the Connect Wallet button in the top navigation")}>
                  Connect Wallet to Donate
                </button>
              </div>
            </div>
          )}

          {hasProofRequirement && (
            <div style={styles.proofRequirement}>
              <div style={styles.requirementContent}>
                <h4 style={styles.requirementTitle}>Proof Required for Withdrawal</h4>
                <p style={styles.requirementText}>
                  You must upload at least one fund utilization proof before withdrawing funds. 
                  This ensures transparency for your donors.
                </p>
              </div>
            </div>
          )}

          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={loading}
              style={styles.withdrawBtn}
            >
              {loading ? "Processing..." : "Withdraw Funds"}
            </button>
          )}

          {canRefund && (
            <div style={styles.refundSection}>
              <div style={styles.refundContent}>
                <h4 style={styles.refundTitle}>Campaign Failed - Refund Available</h4>
                <p style={styles.refundText}>
                  This campaign did not reach its funding goal by the deadline. 
                  You can claim a full refund of your contribution: {myContribution} ETH
                </p>
                <button
                  onClick={handleRefund}
                  disabled={loading}
                  style={styles.refundBtn}
                >
                  {loading ? "Processing..." : `Claim Refund (${myContribution} ETH)`}
                </button>
              </div>
            </div>
          )}

          {refundStatus && status === "EXPIRED" && (
            <div style={styles.refundCompletedSection}>
              <div style={styles.refundCompletedContent}>
                <h4 style={styles.refundCompletedTitle}>🎉 Refund Successfully Received!</h4>
                <p style={styles.refundCompletedText}>
                  Great news! You've successfully received your refund of {refundStatus.amount} ETH from this campaign.
                </p>
                <div style={styles.refundSummary}>
                  <div style={styles.refundSummaryItem}>
                    <span style={styles.refundLabel}>Amount Refunded</span>
                    <span style={styles.refundValue}>{refundStatus.amount} ETH</span>
                  </div>
                  <div style={styles.refundSummaryItem}>
                    <span style={styles.refundLabel}>Received On</span>
                    <span style={styles.refundValue}>{new Date(refundStatus.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                <a
                  href={refundStatus.blockExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.viewTransactionBtn}
                >
                  View Transaction Details
                </a>
              </div>
            </div>
          )}

          {status === "EXPIRED" && parseFloat(myContribution) > 0 && (
            <div style={styles.expiredContributorSection}>
              <div style={styles.expiredContent}>
                <h4 style={styles.expiredTitle}>Campaign Failed</h4>
                <p style={styles.expiredText}>
                  This campaign did not reach its funding goal by the deadline. 
                  {!refundStatus ? " You can claim a refund for your contribution." : " You have already claimed your refund."}
                </p>
              </div>
            </div>
          )}

          {status === "EXPIRED" && isOwner && (
            <div style={styles.expiredOwnerSection}>
              <div style={styles.expiredContent}>
                <h4 style={styles.expiredTitle}>Campaign Failed</h4>
                <p style={styles.expiredText}>
                  Your campaign did not reach its funding goal by the deadline. 
                  Donors can now claim refunds for their contributions.
                </p>
              </div>
            </div>
          )}

          {!account && status !== "ACTIVE" && (
            <div style={styles.infoMessage}>
              <div style={styles.infoText}>
                Connect your wallet to see your contribution history and interact with campaigns
              </div>
            </div>
          )}

          {/* Proof of Fund Utilization Section - Only for successful campaigns */}
          {status === "FUNDED" && (
            <div style={styles.proofSection}>
              {/* Show upload section only to campaign owner for funded campaigns */}
              {shouldShowProofUpload && contract && (
                <ProofUpload 
                  campaignId={campaign.id.toString()}
                  onProofUploaded={async (ipfsHash) => {
                    try {
                      const tx = await contract.addUsageProof(campaign.id, ipfsHash);
                      await tx.wait();
                      // Update proof count
                      setProofCount(prev => prev + 1);
                      // Refresh the proof viewer
                      window.location.reload();
                    } catch (error) {
                      console.error("Failed to add proof to contract:", error);
                    }
                  }}
                />
              )}
              
              {/* Show proof viewer to everyone for funded campaigns */}
              {contract && (
                <ProofViewer 
                  campaignId={campaign.id.toString()}
                  contract={contract}
                />
              )}
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
  standalonePage: {
    minHeight: "100vh",
    background: "#f9fafb",
    padding: "2rem 0",
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
  standaloneModal: {
    background: "white",
    borderRadius: "20px",
    maxWidth: "800px",
    width: "100%",
    margin: "0 auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
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
    flexWrap: "wrap",
    gap: "1rem",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  shareBtn: {
    padding: "0.5rem 1rem",
    background: "rgba(102, 126, 234, 0.1)",
    color: "#667eea",
    border: "2px solid #667eea",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s",
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
    marginBottom: "1rem",
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "0.5rem",
  },
  currencySymbol: {
    padding: "1rem",
    background: "#f3f4f6",
    fontWeight: "600",
    fontSize: "1.2rem",
  },
  input: {
    flex: 1,
    padding: "1rem",
    border: "none",
    fontSize: "1rem",
    outline: "none",
  },
  ethEquivalent: {
    fontSize: "0.9rem",
    color: "#6b7280",
    marginBottom: "1rem",
    textAlign: "right",
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
  refundSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    background: "#fef2f2",
    border: "2px solid #ef4444",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1rem",
  },
  refundContent: {
    flex: 1,
  },
  refundTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#dc2626",
    margin: "0 0 0.5rem 0",
  },
  refundText: {
    fontSize: "0.95rem",
    color: "#dc2626",
    margin: "0 0 1rem 0",
    lineHeight: "1.5",
  },
  refundCompletedSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    background: "#f0f9ff",
    border: "2px solid #0ea5e9",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1rem",
  },
  refundCompletedContent: {
    flex: 1,
  },
  refundCompletedTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#0c4a6e",
    margin: "0 0 0.5rem 0",
  },
  refundCompletedText: {
    fontSize: "0.95rem",
    color: "#0c4a6e",
    margin: "0 0 1rem 0",
    lineHeight: "1.5",
  },
  refundDetails: {
    background: "rgba(255, 255, 255, 0.7)",
    padding: "1rem",
    borderRadius: "8px",
    border: "1px solid rgba(14, 165, 233, 0.2)",
  },
  refundDetailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
    borderBottom: "1px solid rgba(14, 165, 233, 0.1)",
    fontSize: "0.9rem",
  },
  refundAmount: {
    fontWeight: "700",
    color: "#0ea5e9",
  },
  refundTxLink: {
    display: "inline-block",
    marginTop: "1rem",
    padding: "0.75rem 1.5rem",
    background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  expiredOwnerSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    background: "#f3f4f6",
    border: "2px solid #9ca3af",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1rem",
  },
  expiredContributorSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    background: "#fef3c7",
    border: "2px solid #f59e0b",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1rem",
  },
  expiredContent: {
    flex: 1,
  },
  expiredTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#6b7280",
    margin: "0 0 0.5rem 0",
  },
  expiredText: {
    fontSize: "0.95rem",
    color: "#6b7280",
    margin: 0,
    lineHeight: "1.5",
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
  proofSection: {
    marginTop: "2rem",
    paddingTop: "2rem",
    borderTop: "2px solid #e5e7eb",
  },
  proofRequirement: {
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    background: "#fef3c7",
    border: "2px solid #f59e0b",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1rem",
  },
  requirementContent: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#92400e",
    margin: "0 0 0.5rem 0",
  },
  requirementText: {
    fontSize: "0.95rem",
    color: "#92400e",
    margin: 0,
    lineHeight: "1.5",
  },
  connectWalletSection: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    border: "2px solid #0ea5e9",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1rem",
  },
  connectWalletContent: {
    flex: 1,
  },
  connectWalletTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#0c4a6e",
    margin: "0 0 0.5rem 0",
  },
  connectWalletText: {
    fontSize: "0.95rem",
    color: "#0c4a6e",
    margin: "0 0 1rem 0",
    lineHeight: "1.5",
  },
  connectWalletBtn: {
    padding: "0.75rem 1.5rem",
    background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s",
  },
  infoMessage: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    background: "#f9fafb",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1rem",
  },
  infoText: {
    fontSize: "0.95rem",
    color: "#6b7280",
    margin: 0,
    lineHeight: "1.5",
  },
  refundSummary: {
    background: "rgba(255, 255, 255, 0.7)",
    padding: "1rem",
    borderRadius: "8px",
    border: "1px solid rgba(14, 165, 233, 0.2)",
    marginBottom: "1rem",
  },
  refundSummaryItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
    borderBottom: "1px solid rgba(14, 165, 233, 0.1)",
    fontSize: "0.9rem",
  },
  refundLabel: {
    color: "#0c4a6e",
    fontWeight: "500",
  },
  refundValue: {
    fontWeight: "700",
    color: "#0ea5e9",
  },
  viewTransactionBtn: {
    display: "inline-block",
    padding: "0.75rem 1.5rem",
    background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(14, 165, 233, 0.3)",
  },
};

export default CampaignDetail;
