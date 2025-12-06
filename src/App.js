import React, { useState, useEffect } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import CampaignList from "./components/CampaignList";
import CreateCampaign from "./components/CreateCampaign";
import Analytics from "./components/Analytics";
import SetupChecker from "./components/SetupChecker";

function App() {
  const [account, setAccount] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkWalletConnection();
    
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (error) {
        console.error("Failed to check wallet connection:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      alert("Wallet connected successfully! 🎉");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet: " + error.message);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="App">
      <Navbar account={account} onConnect={connectWallet} />

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.mainTitle}>
            Welcome to CrowdFund Platform 🚀
          </h1>
          <p style={styles.subtitle}>
            Create campaigns, support causes, and make a difference
          </p>
        </div>

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "campaigns" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("campaigns")}
          >
            📋 Campaigns
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "analytics" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Analytics
          </button>
          <button
            style={styles.createBtn}
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Create Campaign
          </button>
        </div>

        <SetupChecker />
        
        {activeTab === "campaigns" ? (
          <CampaignList account={account} refreshTrigger={refreshTrigger} />
        ) : (
          <Analytics />
        )}
      </div>

      {showCreateModal && (
        <CreateCampaign
          onSuccess={handleCreateSuccess}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 80px)",
  },
  header: {
    textAlign: "center",
    padding: "3rem 1rem 2rem",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
  },
  mainTitle: {
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "0 0 1rem 0",
  },
  subtitle: {
    fontSize: "1.25rem",
    opacity: 0.9,
    margin: 0,
  },
  tabs: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1rem 0",
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  tab: {
    padding: "0.75rem 1.5rem",
    border: "2px solid #e5e7eb",
    background: "white",
    borderRadius: "25px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
    color: "#6b7280",
    transition: "all 0.3s",
  },
  tabActive: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    borderColor: "transparent",
  },
  createBtn: {
    marginLeft: "auto",
    padding: "0.75rem 1.5rem",
    border: "none",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    borderRadius: "25px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
  },
};

export default App;