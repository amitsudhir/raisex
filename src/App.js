import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from "react-router-dom";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import CampaignList from "./components/CampaignList";
import CreateCampaign from "./components/CreateCampaign";
import Analytics from "./components/Analytics";
import MyDonations from "./components/MyDonations";
import MyWithdrawals from "./components/MyWithdrawals";
import MyRefunds from "./components/MyRefunds";
import MyCampaigns from "./components/MyCampaigns";
import CampaignDetail from "./components/CampaignDetail";
import FAQ from "./components/FAQ";
import Terms from "./components/Terms";
import Privacy from "./components/Privacy";
import Footer from "./components/Footer";
import NetworkChecker from "./components/NetworkChecker";
import { getReadOnlyContract } from "./config/contract";
import { notifyWalletConnected, requestNotificationPermission } from "./utils/notifications";

function App() {
  const [account, setAccount] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkWalletConnection();
    
    // Request notification permission on app load
    requestNotificationPermission();
    
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
      toast.error("Please install MetaMask!");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      await notifyWalletConnected(accounts[0]);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet: " + error.message);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <Router>
      <div className="App">
        <Navbar account={account} onConnect={connectWallet} />
        <NetworkChecker />

        <Routes>
          <Route path="/" element={
            <HomePage 
              account={account}
              refreshTrigger={refreshTrigger}
            />
          } />
          <Route path="/explore" element={
            <ExplorePage account={account} refreshTrigger={refreshTrigger} />
          } />
          <Route path="/campaign/:id" element={
            <CampaignDetailPage account={account} />
          } />
          <Route path="/create" element={
            <CreateCampaignPage 
              onSuccess={handleCreateSuccess}
            />
          } />
          <Route path="/my-campaigns" element={
            <MyCampaigns account={account} />
          } />
          <Route path="/my-donations" element={
            <MyDonations account={account} />
          } />
          <Route path="/my-withdrawals" element={
            <MyWithdrawals account={account} />
          } />
          <Route path="/my-refunds" element={
            <MyRefunds account={account} />
          } />
          <Route path="/analytics" element={
            <Analytics />
          } />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>

        <Footer />

        {showCreateModal && (
          <CreateCampaign
            onSuccess={handleCreateSuccess}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </Router>
  );
}

// Home Page Component
const HomePage = ({ account, refreshTrigger }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.mainTitle}>
          Welcome to RaiseX
        </h1>
        <p style={styles.subtitle}>
          RaiseX — Trust, Raised on Chain
        </p>
      </div>
      
      <CampaignList account={account} refreshTrigger={refreshTrigger} showHeader={false} />
    </div>
  );
};

// Explore Page Component (dedicated campaigns page)
const ExplorePage = ({ account, refreshTrigger }) => {
  return (
    <div style={styles.container}>
      <CampaignList account={account} refreshTrigger={refreshTrigger} showHeader={true} />
    </div>
  );
};

// Campaign Detail Page Component
const CampaignDetailPage = ({ account }) => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const { contract } = await getReadOnlyContract();
      const campaignData = await contract.getCampaign(id);
      setCampaign(campaignData);
    } catch (error) {
      console.error("Failed to load campaign:", error);
      toast.error("Campaign not found");
      navigate("/explore");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading campaign...</p>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  return (
    <div style={styles.container}>
      <CampaignDetail
        campaign={campaign}
        account={account}
        onClose={() => navigate("/explore")}
        onSuccess={() => loadCampaign()}
        standalone={true}
      />
    </div>
  );
};

// Create Campaign Page Component
const CreateCampaignPage = ({ onSuccess }) => {
  const navigate = useNavigate();
  
  const handleSuccess = () => {
    onSuccess();
    navigate("/explore");
  };

  const handleClose = () => {
    navigate("/");
  };

  return (
    <div style={styles.container}>
      <CreateCampaign
        onSuccess={handleSuccess}
        onClose={handleClose}
        standalone={true}
      />
    </div>
  );
};

const styles = {
  container: {
    minHeight: "calc(100vh - 80px)",
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    padding: "3rem 1rem 2rem",
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "0 0 30px 30px",
    color: "#2d1b69",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
  mainTitle: {
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "0 0 1rem 0",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: "1.25rem",
    opacity: 0.8,
    margin: "0 0 2rem 0",
    color: "#4c1d95",
  },
  headerActions: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
  },
  primaryBtn: {
    padding: "1rem 2rem",
    border: "none",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    borderRadius: "25px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1.1rem",
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
    transition: "all 0.3s ease",
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

export default App;