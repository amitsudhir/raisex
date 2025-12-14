import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Upload image to IPFS
  const uploadImageToIPFS = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `Campaign-Image-${Date.now()}`,
      keyvalues: {
        type: 'campaign-banner'
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_PINATA_JWT}`,
        },
        body: formData,
      });

      const result = await response.json();
      return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload only images (JPG, PNG)');
        return;
      }

      if (file.size > maxSize) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setUploadingImage(true);
    try {
      toast.info('Uploading image to IPFS...');
      const ipfsUrl = await uploadImageToIPFS(selectedImage);
      
      setFormData({
        ...formData,
        imageURI: ipfsUrl
      });
      
      toast.success('Image uploaded successfully!');
      setSelectedImage(null);
      document.getElementById('campaign-image-input').value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
    }
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

      toast.info("Please confirm campaign creation in MetaMask...");
      const tx = await contract.createCampaign(
        formData.title,
        formData.description,
        goalInWei,
        durationInSeconds,
        formData.imageURI,
        formData.category,
        formData.creatorInfo
      );

      toast.info("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      toast.success("Campaign created successfully! 🎉");
      onSuccess();
    } catch (error) {
      console.error(error);
      if (error.message.includes('User rejected')) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error("Failed to create campaign: " + error.message);
      }
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
                step="100"
                min="0"
                style={styles.input}
                placeholder="10000"
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
            <label style={styles.label}>Campaign Banner Image</label>
            
            {/* Image Upload Section */}
            <div style={styles.imageUploadSection}>
              <div style={styles.uploadOptions}>
                <div style={styles.uploadOption}>
                  <input
                    id="campaign-image-input"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageSelect}
                    style={styles.hiddenInput}
                  />
                  <label htmlFor="campaign-image-input" style={styles.uploadLabel}>
                    📷 Choose Image (JPG, PNG)
                  </label>
                  
                  {selectedImage && (
                    <div style={styles.selectedImageInfo}>
                      <span style={styles.imageName}>📄 {selectedImage.name}</span>
                      <button
                        type="button"
                        onClick={handleImageUpload}
                        disabled={uploadingImage}
                        style={styles.uploadBtn}
                      >
                        {uploadingImage ? '⏳ Uploading...' : '📤 Upload to IPFS'}
                      </button>
                    </div>
                  )}
                </div>
                
                <div style={styles.orDivider}>OR</div>
                
                <div style={styles.urlOption}>
                  <input
                    type="url"
                    name="imageURI"
                    value={formData.imageURI}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Paste image URL here"
                  />
                </div>
              </div>
              
              {/* Image Preview */}
              {formData.imageURI && (
                <div style={styles.imagePreview}>
                  <img 
                    src={formData.imageURI} 
                    alt="Campaign preview" 
                    style={styles.previewImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
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
  imageUploadSection: {
    border: "2px dashed #e0e0e0",
    borderRadius: "10px",
    padding: "1rem",
    background: "#fafafa",
  },
  uploadOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  uploadOption: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  hiddenInput: {
    display: "none",
  },
  uploadLabel: {
    display: "inline-block",
    padding: "0.75rem 1.5rem",
    background: "#ffffff",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    transition: "all 0.2s ease",
  },
  selectedImageInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "0.5rem",
    background: "#e0f2fe",
    borderRadius: "6px",
  },
  imageName: {
    fontSize: "0.9rem",
    color: "#0369a1",
    flex: 1,
  },
  uploadBtn: {
    padding: "0.5rem 1rem",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  orDivider: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: "0.9rem",
    fontWeight: "600",
    position: "relative",
  },
  urlOption: {
    display: "flex",
    flexDirection: "column",
  },
  imagePreview: {
    marginTop: "1rem",
    textAlign: "center",
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "200px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
};

export default CreateCampaign;
