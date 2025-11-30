import "./CrowdFund.css";
import React from "react";
import { ethers } from "ethers";
import { useState } from "react";

function CrowdFund() {
  const [balance, setBalance] = useState(null);
  const [contract, setContract] = useState(null);
  const [yourBalance, setYourBalance] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [amount, setAmount] = useState("");

  const contractAddress = "0xf86eFF9d6B0e471776828C826A0D61107D737A09";

  async function main() {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected account:", accounts[0]);
      setAccounts(accounts[0]);
      
      const provider1 = new ethers.BrowserProvider(window.ethereum);
      
      // Check network
      const network = await provider1.getNetwork();
      console.log("Connected to network:", network.name, "Chain ID:", network.chainId);
      
      // Verify contract exists
      const code = await provider1.getCode(contractAddress);
      if (code === "0x") {
        alert(`Contract not found at ${contractAddress}. Make sure you're on the correct network and the contract is deployed.`);
        return;
      }
      console.log("Contract found at:", contractAddress);

      const abi = [
      {
        inputs: [],
        name: "endFunding",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "setFund",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "_endTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "_goalAmount",
            type: "uint256",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
      {
        inputs: [
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        name: "withdrawalSomeFunds",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "withdrawlAll",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [],
        name: "checkAllFunds",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            internalType: "address",
            name: "myAddress",
            type: "address",
          },
        ],
        name: "checkYourFunds",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "endTime",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "goalAmount",
        outputs: [
          {
            internalType: "uint256",
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "isStarted",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ];

      const signer1 = await provider1.getSigner(accounts[0]);
      const crowdFundContract = new ethers.Contract(
        contractAddress,
        abi,
        signer1
      );
      
      // Test contract connection and get info
      try {
        const isStarted = await crowdFundContract.isStarted();
        const endTime = await crowdFundContract.endTime();
        const goalAmount = await crowdFundContract.goalAmount();
        const currentTime = Math.floor(Date.now() / 1000);
        const timeLeft = endTime > currentTime ? Math.floor((endTime - currentTime) / 3600) : 0;
        
        console.log("Contract is started:", isStarted);
        console.log("End time:", new Date(Number(endTime) * 1000));
        console.log("Goal amount:", ethers.formatEther(goalAmount), "ETH");
        console.log("Time left:", timeLeft, "hours");
        
        if (!isStarted) {
          alert("Warning: Funding has been stopped by the owner!");
        } else if (timeLeft <= 0) {
          alert("Warning: Funding period has expired!");
        }
      } catch (err) {
        console.error(err);
        alert("Contract connection failed. Make sure you're on the correct network (Sepolia, Goerli, etc.)");
        return;
      }
      
      setContract(crowdFundContract);
      alert(`Wallet connected successfully!\nNetwork: ${network.name}\nAddress: ${accounts[0]}`);
    } catch (error) {
      console.error(error);
      alert("Failed to connect wallet: " + error.message);
    }
  }

  async function handleBalanceCheck() {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      const balanceAll = await contract.checkAllFunds();
      setBalance(balanceAll.toString());
      console.log(balanceAll.toString());
    } catch (error) {
      console.error(error);
      alert("Failed to get balance: " + error.message);
    }
  }

  async function handleYourBalance() {
    if (!contract || !accounts) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      const yourFunds = await contract.checkYourFunds(accounts);
      setYourBalance(yourFunds.toString());
      console.log(yourFunds.toString());
    } catch (error) {
      console.error(error);
      alert("Failed to get your balance: " + error.message);
    }
  }

  async function handleSetFund() {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    try {
      // Check if funding is still active
      const isStarted = await contract.isStarted();
      if (!isStarted) {
        alert("Funding has ended");
        return;
      }

      // Check if you've already donated
      const yourCurrentFunds = await contract.checkYourFunds(accounts);
      if (yourCurrentFunds > 0) {
        alert("You have already donated. Each address can only donate once.");
        return;
      }

      // Check if goal is reached
      const currentBalance = await contract.checkAllFunds();
      const goal = await contract.goalAmount();
      if (currentBalance >= goal) {
        alert("Goal amount has already been reached");
        return;
      }

      // Check if time has expired
      const endTime = await contract.endTime();
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime >= endTime) {
        alert("Funding period has expired");
        return;
      }

      const txn = await contract.setFund({
        value: ethers.parseEther(amount),
      });
      await txn.wait();
      console.log(txn);
      alert("Donation successful!");
      setAmount("");
      // Refresh balances
      handleBalanceCheck();
      handleYourBalance();
    } catch (error) {
      console.error(error);
      let errorMsg = "Donation failed: ";
      if (error.message.includes("You are only allowed to transfer one time")) {
        errorMsg += "You have already donated once";
      } else if (error.message.includes("Goal amount has been reached")) {
        errorMsg += "Goal amount has been reached";
      } else if (error.message.includes("Funding is stopped")) {
        errorMsg += "Funding period has ended";
      } else if (error.message.includes("Funding hasn't started yet")) {
        errorMsg += "Funding hasn't started yet";
      } else {
        errorMsg += error.message;
      }
      alert(errorMsg);
    }
  }

  async function withdrawAll() {
    if (!contract) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      const txn = await contract.withdrawlAll();
      await txn.wait();
      console.log(txn);
      alert("Withdrawal successful!");
    } catch (error) {
      console.error(error);
      alert("Withdrawal failed: " + error.message);
    }
  }

  function shortenAddress(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  }

  return (
    <div className="crowdfund-page">
      <nav className="navbar crowdfund-navbar sticky-top">
        <div className="container-fluid justify-content-start">
          <button
            className="btn btn-outline-success me-2 nav-btn"
            onClick={main}
            type="button"
          >
            Connect Wallet
          </button>
          <button
            className="btn btn-sm btn-outline-secondary me-2 nav-btn"
            onClick={handleBalanceCheck}
            type="button"
          >
            Get Balance
          </button>
          <button
            className="btn btn-sm btn-outline-secondary nav-btn"
            onClick={handleYourBalance}
            type="button"
          >
            Get Your Balance
          </button>
          <span className="wallet-address ms-auto">{shortenAddress(accounts)}</span>
        </div>
      </nav>

      <main className="crowdfund-main">
        <div className="crowdfund-card">
          <img 
            className="fund-banner" 
            src="/fund.jpg" 
            alt="Crowdfunding banner"
          />
          
          <div className="card-content">
            <h2 className="card-title">Support Our Cause</h2>
            <p className="card-subtitle">Every contribution makes a difference</p>
            
            <div className="input-group mb-3">
              <span className="input-group-text">₹</span>
              <input
                type="text"
                className="form-control amount-input"
                aria-label="Amount (to the nearest rupees)"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="input-group-text">.00</span>
            </div>

            <div className="button-group">
              <button className="btn donate-btn" onClick={handleSetFund}>
                Donate Now
              </button>
              <button className="btn withdraw-btn" onClick={withdrawAll}>
                Withdraw All
              </button>
            </div>

            <div className="balances">
              <div className="balance-item">
                <span className="balance-label">Total Balance:</span>
                <span className="balance-value">{balance ?? "—"}</span>
              </div>
              <div className="balance-item">
                <span className="balance-label">Your Balance:</span>
                <span className="balance-value">{yourBalance ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CrowdFund;
