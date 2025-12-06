import React from "react";
import { NETWORK_CONFIG } from "../config/config";

const Navbar = ({ account, onConnect }) => {
  const shortenAddress = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  const switchNetwork = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      });
      alert("Switched to Base Sepolia!");
    } catch (error) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [NETWORK_CONFIG],
          });
          alert("Base Sepolia network added!");
        } catch (addError) {
          console.error("Failed to add network:", addError);
          alert("Failed to add network: " + addError.message);
        }
      } else {
        console.error("Failed to switch network:", error);
        alert("Failed to switch network: " + error.message);
      }
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <div style={styles.brand}>
          <h1 style={styles.logo}>🚀 CrowdFund</h1>
        </div>
        <div style={styles.actions}>
          {account ? (
            <div style={styles.accountInfo}>
              <span style={styles.network}>{NETWORK_CONFIG.chainName}</span>
              <span style={styles.address}>{shortenAddress(account)}</span>
            </div>
          ) : (
            <button style={styles.connectBtn} onClick={onConnect}>
              Connect Wallet
            </button>
          )}
          <button style={styles.networkBtn} onClick={switchNetwork}>
            Switch Network
          </button>
        </div>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "1rem 0",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    display: "flex",
    alignItems: "center",
  },
  logo: {
    color: "white",
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: 0,
  },
  actions: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  accountInfo: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  },
  network: {
    background: "rgba(255,255,255,0.2)",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontSize: "0.9rem",
  },
  address: {
    background: "white",
    color: "#667eea",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    fontWeight: "600",
  },
  connectBtn: {
    background: "white",
    color: "#667eea",
    border: "none",
    padding: "0.75rem 1.5rem",
    borderRadius: "25px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "transform 0.2s",
  },
  networkBtn: {
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "1px solid white",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
};

export default Navbar;
