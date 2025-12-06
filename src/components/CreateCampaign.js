import React, { useState } from "react";
import { ethers } from "ethers";
import { getContract } from "../config/contract";
import { CATEGORIES, CURRENCY, inrToEth } from "../config/config";

const CreateCampaign = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goalAmount: "",
    duration: "",
    imageURI: "",
    category: CATEGORIES[0],
    creatorInfo: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { contract } = await getContract();

      // Convert INR to ETH
      const goalInEth = inrToEth(formData.goalAmount);
      const goalInWei = ethers.parseEther(goalInEth);
      const durationInSeconds = parseInt(formData.duration) * 24 * 60 * 60; // Convert days to seconds

      const tx = await contract.createCampaign(
        formData.title,
        formData.description,
        goalInWei,
        durationInSeconds,
        formData.imageURI,
        formData.category,
        formData.creatorInfo
      );

      await tx.wait();
      alert("Campaign created successfully!");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Failed to create campaign: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create New Campaign</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Campaign Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              style={styles.input}
              placeholder="Enter campaign title"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              style={{ ...styles.input, minHeight: "100px" }}
              placeholder="Describe your campaign"
            />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Goal Amount ({CURRENCY.symbol} INR) *</label>
              <input
                type="number"
                name="goalAmount"
                value={formData.goalAmount}
                onChange={handleChange}
                required
                step="1000"
                min="1000"
                style={styles.input}
                placeholder="50000"
              />
              <div style={styles.ethEquivalent}>
                ≈ {formData.goalAmount ? inrToEth(formData.goalAmount) : '0'} ETH
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Duration (Days) *</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                min="1"
                style={styles.input}
                placeholder="30"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              style={styles.input}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Image URL</label>
            <input
              type="url"
              name="imageURI"
              value={formData.imageURI}
              onChange={handleChange}
              style={styles.input}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Creator Info</label>
            <input
              type="text"
              name="creatorInfo"
              value={formData.creatorInfo}
              onChange={handleChange}
              style={styles.input}
              placeholder="Your name or social link"
            />
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    padding: "1rem",
  },
  modal: {
    background: "white",
    borderRadius: "20px",
    maxWidth: "600px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    borderBottom: "1px solid #eee",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    color: "#333",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "#999",
  },
  form: {
    padding: "1.5rem",
  },
  formGroup: {
    marginBottom: "1.5rem",
    flex: 1,
  },
  label: {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: "600",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e0e0e0",
    borderRadius: "10px",
    fontSize: "1rem",
    boxSizing: "border-box",
    transition: "border-color 0.3s",
  },
  ethEquivalent: {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginTop: "0.25rem",
  },
  row: {
    display: "flex",
    gap: "1rem",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    marginTop: "2rem",
  },
  cancelBtn: {
    flex: 1,
    padding: "0.75rem",
    border: "2px solid #ddd",
    background: "white",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    color: "#666",
  },
  submitBtn: {
    flex: 1,
    padding: "0.75rem",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default CreateCampaign;
