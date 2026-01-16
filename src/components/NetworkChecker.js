import React, { useState, useEffect } from "react";
import { NETWORK_CONFIG } from "../config/config";
import { toast } from "react-toastify";

const NetworkChecker = () => {
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  useEffect(() => {
    checkNetwork();
    
    if (window.ethereum) {
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChainChanged = (chainId) => {
    setCurrentChainId(chainId);
    checkNetwork(chainId);
  };

  const checkNetwork = async (chainId = null) => {
    if (!window.ethereum) return;

    try {
      const currentChain = chainId || await window.ethereum.request({
        method: "eth_chainId",
      });
      
      setCurrentChainId(currentChain);
      setIsWrongNetwork(currentChain !== NETWORK_CONFIG.chainId);
    } catch (error) {
      console.error("Failed to check network:", error);
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask!");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      });
      toast.success("Switched to Base Sepolia!");
    } catch (error) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [NETWORK_CONFIG],
          });
          toast.success("Base Sepolia network added and switched!");
        } catch (addError) {
          console.error("Failed to add network:", addError);
          toast.error("Failed to add network: " + addError.message);
        }
      } else {
        console.error("Failed to switch network:", error);
        toast.error("Failed to switch network: " + error.message);
      }
    }
  };

  if (!isWrongNetwork || !currentChainId) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.text}>
            <h4 style={styles.title}>Wrong Network Detected</h4>
            <p style={styles.message}>
              Please switch to Base Sepolia network to use this dApp
            </p>
          </div>
        </div>
        <button style={styles.switchBtn} onClick={switchNetwork}>
          Switch to Base Sepolia
        </button>
      </div>
    </div>
  );
};

const styles = {
  banner: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "white",
    padding: "1rem 0",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  icon: {
    fontSize: "2rem",
  },
  text: {
    flex: 1,
  },
  title: {
    margin: "0 0 0.25rem 0",
    fontSize: "1.1rem",
    fontWeight: "600",
  },
  message: {
    margin: 0,
    fontSize: "0.9rem",
    opacity: 0.9,
  },
  switchBtn: {
    background: "white",
    color: "#d97706",
    border: "none",
    padding: "0.75rem 1.5rem",
    borderRadius: "25px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "transform 0.2s",
    whiteSpace: "nowrap",
  },
};

export default NetworkChecker;