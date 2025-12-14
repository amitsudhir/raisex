import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ProofUpload = ({ campaignId, onProofUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Using Pinata for IPFS (you'll need to add API keys to .env)
  const uploadToIPFS = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const pinataMetadata = JSON.stringify({
      name: `Campaign-${campaignId}-Proof-${Date.now()}`,
      keyvalues: {
        campaignId: campaignId,
        type: 'fund-utilization-proof'
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IPFS upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.IpfsHash) {
        throw new Error('IPFS upload failed: No hash returned');
      }
      
      return result.IpfsHash;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload only images (JPG, PNG) or PDF files');
        return;
      }

      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    // Check if Pinata API key is configured
    if (!process.env.REACT_APP_PINATA_JWT) {
      toast.error('IPFS upload not configured. Please set PINATA_JWT environment variable.');
      return;
    }

    setUploading(true);
    try {
      toast.info('Uploading to IPFS...');
      const ipfsHash = await uploadToIPFS(selectedFile);
      
      if (!ipfsHash) {
        throw new Error('Failed to get IPFS hash');
      }
      
      toast.success('File uploaded to IPFS successfully!');
      toast.info('Please confirm transaction in MetaMask...');
      
      await onProofUploaded(ipfsHash);
      
      // Reset form
      setSelectedFile(null);
      document.getElementById('proof-file-input').value = '';
      toast.success('Proof added to blockchain successfully! 🎉');
    } catch (error) {
      console.error('Upload failed:', error);
      if (error.message.includes('User rejected')) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('IPFS')) {
        toast.error('IPFS upload failed. Please check your connection.');
      } else {
        toast.error(`Upload failed: ${error.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Proof of Fund Utilization (Prototype)</h3>
        <p style={styles.subtitle}>
          Upload documents showing how funds are being used. 
          (Future versions will link these proofs to milestone-based fund release.)
        </p>
        <div style={styles.requirement}>
          <span style={styles.requirementIcon}>⚠️</span>
          <span style={styles.requirementText}>
            <strong>Required for withdrawal:</strong> At least one proof must be uploaded before funds can be withdrawn.
          </span>
        </div>
      </div>

      <div style={styles.uploadSection}>
        <div style={styles.fileInput}>
          <input
            id="proof-file-input"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            style={styles.hiddenInput}
          />
          <label htmlFor="proof-file-input" style={styles.fileLabel}>
            📎 Choose File (JPG, PNG, PDF)
          </label>
        </div>

        {selectedFile && (
          <div style={styles.selectedFile}>
            <span style={styles.fileName}>📄 {selectedFile.name}</span>
            <span style={styles.fileSize}>
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            ...styles.uploadButton,
            opacity: (!selectedFile || uploading) ? 0.6 : 1,
            cursor: (!selectedFile || uploading) ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? '⏳ Uploading to IPFS...' : '📤 Upload Proof'}
        </button>
      </div>

      <div style={styles.note}>
        <p style={styles.noteText}>
          💡 Files are stored on IPFS (decentralized storage) and linked to this campaign permanently.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '2rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#6b7280',
    lineHeight: '1.4',
    margin: 0,
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1rem',
  },
  fileInput: {
    position: 'relative',
  },
  hiddenInput: {
    display: 'none',
  },
  fileLabel: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    background: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: '#3b82f6',
      backgroundColor: '#f3f4f6'
    }
  },
  selectedFile: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: '#e0f2fe',
    borderRadius: '6px',
  },
  fileName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#0369a1',
  },
  fileSize: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  uploadButton: {
    padding: '1rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
  },
  note: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#fef3c7',
    borderRadius: '6px',
  },
  noteText: {
    fontSize: '0.8rem',
    color: '#92400e',
    margin: 0,
    fontStyle: 'italic',
  },
  requirement: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
  },
  requirementIcon: {
    fontSize: '1rem',
  },
  requirementText: {
    fontSize: '0.85rem',
    color: '#92400e',
    lineHeight: '1.4',
  },
};

export default ProofUpload;