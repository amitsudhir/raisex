import React, { useState, useEffect } from "react";
import { CONTRACT_ADDRESS, DEMO_MODE } from "../config/config";
import { getReadOnlyContract } from "../config/contract";

const SetupChecker = () => {
  const [status, setStatus] = useState({
    contractAddress: false,
    contractExists: false,
    networkCorrect: false,
    checking: true,
    isSeeded: false,
  });

  // Check for demo mode from URL or config
  const urlParams = new URLSearchParams(window.location.search);
  const isDemoMode = DEMO_MODE || urlParams.get('demo') === '1';

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    const newStatus = {
      contractAddress: false,
      contractExists: false,
      networkCorrect: false,
      checking: false,
      isSeeded: false,
    };

    // Check if contract address exists (any valid address)
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS.startsWith("0x") && CONTRACT_ADDRESS.length === 42) {
      newStatus.contractAddress = true;
    }

    // Check if contract exists
    try {
      if (window.ethereum) {
        const { contract, provider } = await getReadOnlyContract();
        const network = await provider.getNetwork();
        
        // Check network
        if (network.chainId === 84532n) {
          newStatus.networkCorrect = true;
        }

        // Check if contract exists
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code !== "0x") {
          newStatus.contractExists = true;
          
          // Check if seeded (has campaigns)
          try {
            const { contract } = await getReadOnlyContract();
            const count = await contract.campaignCount();
            if (count > 0) {
              newStatus.isSeeded = true;
            }
          } catch (err) {
            // Ignore
          }
        }
      }
    } catch (error) {
      console.error("Setup check failed:", error);
    }

    setStatus(newStatus);
  };

  if (status.checking) {
    return null;
  }

  const allGood = status.contractAddress && status.contractExists && status.networkCorrect;

  // Hide setup panel in demo mode if contract exists
  if (isDemoMode && status.contractExists) {
    return (
      <div style={styles.demoBanner}>
        <span style={styles.demoIcon}>🎬</span>
        <span style={styles.demoText}>
          Demo Mode • Base Sepolia
          {status.isSeeded && " • Seeded with sample campaigns"}
        </span>
      </div>
    );
  }

  if (allGood) {
    // Show success banner
    return (
      <div style={styles.successBanner}>
        <span style={styles.successIcon}>✅</span>
        <span style={styles.successText}>
          Ready • Connected to Base Sepolia • Contract deployed
          {status.isSeeded && " • Demo campaigns loaded"}
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h3 style={styles.title}>⚙️ Setup Required</h3>
        <p style={styles.subtitle}>Please complete these steps to use the DApp:</p>

        <div style={styles.checklist}>
          <div style={styles.checkItem}>
            <span style={status.networkCorrect ? styles.checkGood : styles.checkBad}>
              {status.networkCorrect ? "✅" : "❌"}
            </span>
            <span>Connected to Base Sepolia network</span>
          </div>

          <div style={styles.checkItem}>
            <span style={status.contractAddress ? styles.checkGood : styles.checkBad}>
              {status.contractAddress ? "✅" : "❌"}
            </span>
            <span>Contract address updated in config.js</span>
          </div>

          <div style={styles.checkItem}>
            <span style={status.contractExists ? styles.checkGood : styles.checkBad}>
              {status.contractExists ? "✅" : "❌"}
            </span>
            <span>Contract deployed and accessible</span>
          </div>
        </div>

        <div style={styles.instructions}>
          <h4 style={styles.instructionTitle}>Quick Setup Guide:</h4>
          <ol style={styles.instructionList}>
            <li>Deploy contract on Remix IDE to Base Sepolia</li>
            <li>Copy contract address</li>
            <li>Update <code>CONTRACT_ADDRESS</code> in <code>src/config/config.js</code></li>
            <li>Copy ABI from Remix</li>
            <li>Update <code>CONTRACT_ABI</code> in <code>src/config/contract.js</code></li>
            <li>Refresh this page</li>
          </ol>
          <p style={styles.helpText}>
            📖 See <strong>DEPLOYMENT_GUIDE.md</strong> for detailed instructions
          </p>
        </div>

        <button style={styles.refreshBtn} onClick={checkSetup}>
          🔄 Check Again
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "800px",
    margin: "2rem auto",
    padding: "0 1rem",
  },
  card: {
    background: "white",
    borderRadius: "20px",
    padding: "2rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    border: "3px solid #fbbf24",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 0.5rem 0",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#6b7280",
    margin: "0 0 2rem 0",
  },
  checklist: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginBottom: "2rem",
  },
  checkItem: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    background: "#f9fafb",
    borderRadius: "10px",
    fontSize: "1rem",
  },
  checkGood: {
    fontSize: "1.5rem",
  },
  checkBad: {
    fontSize: "1.5rem",
  },
  instructions: {
    background: "#eff6ff",
    padding: "1.5rem",
    borderRadius: "15px",
    marginBottom: "1.5rem",
  },
  instructionTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#1e40af",
    margin: "0 0 1rem 0",
  },
  instructionList: {
    margin: "0 0 1rem 0",
    paddingLeft: "1.5rem",
    color: "#1f2937",
    lineHeight: "1.8",
  },
  helpText: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#6b7280",
  },
  refreshBtn: {
    width: "100%",
    padding: "1rem",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  successBanner: {
    maxWidth: "1200px",
    margin: "1rem auto",
    padding: "1rem 2rem",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
  },
  successIcon: {
    fontSize: "1.5rem",
  },
  successText: {
    color: "white",
    fontSize: "1rem",
    fontWeight: "600",
  },
  demoBanner: {
    maxWidth: "1200px",
    margin: "1rem auto",
    padding: "1rem 2rem",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
  },
  demoIcon: {
    fontSize: "1.5rem",
  },
  demoText: {
    color: "white",
    fontSize: "1rem",
    fontWeight: "600",
  },
};

export default SetupChecker;
