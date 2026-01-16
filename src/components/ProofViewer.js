import React, { useState, useEffect } from 'react';

const ProofViewer = ({ campaignId, contract }) => {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId && contract) {
      loadProofs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, contract]);

  const loadProofs = async () => {
    try {
      setLoading(true);
      const proofHashes = await contract.getUsageProofs(campaignId);
      
      const proofsWithMetadata = proofHashes.map((hash, index) => ({
        id: index,
        ipfsHash: hash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${hash}`,
        uploadedAt: 'Recently', // In real app, you'd store timestamps
      }));

      setProofs(proofsWithMetadata);
    } catch (error) {
      console.error('Failed to load proofs:', error);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  };

  const openProof = (ipfsUrl) => {
    window.open(ipfsUrl, '_blank');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading proofs...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Uploaded Proofs ({proofs.length})</h3>
        <p style={styles.subtitle}>
          Documents showing how campaign funds are being utilized.
        </p>
      </div>

      {proofs.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No proofs uploaded yet</p>
          <p style={styles.emptySubtext}>
            Campaign owner can upload fund utilization proofs above.
          </p>
        </div>
      ) : (
        <div style={styles.proofsList}>
          {proofs.map((proof) => (
            <div key={proof.id} style={styles.proofCard}>
              <div style={styles.proofInfo}>
                <div style={styles.proofDetails}>
                  <div style={styles.proofTitle}>
                    Fund Utilization Proof #{proof.id + 1}
                  </div>
                  <div style={styles.proofMeta}>
                    Uploaded {proof.uploadedAt} • IPFS Storage
                  </div>
                  <div style={styles.ipfsHash}>
                    Hash: {proof.ipfsHash.slice(0, 20)}...{proof.ipfsHash.slice(-10)}
                  </div>
                </div>
              </div>
              
              <div style={styles.proofActions}>
                <button
                  onClick={() => openProof(proof.ipfsUrl)}
                  style={styles.viewButton}
                >
                  View Proof
                </button>
                <a
                  href={proof.ipfsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.ipfsLink}
                >
                  IPFS Link
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.footer}>
        <p style={styles.footerText}>
          All proofs are stored on IPFS (decentralized storage) and cannot be deleted or modified.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '1rem',
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
    margin: 0,
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
  },
  spinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  empty: {
    textAlign: 'center',
    padding: '2rem',
    color: '#6b7280',
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  emptySubtext: {
    fontSize: '0.9rem',
    margin: 0,
  },
  proofsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  proofCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  proofInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  },
  proofDetails: {
    flex: 1,
  },
  proofTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.25rem',
  },
  proofMeta: {
    fontSize: '0.8rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
  },
  ipfsHash: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  proofActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  ipfsLink: {
    padding: '0.5rem 1rem',
    background: '#f3f4f6',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  footer: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: '#f0fdf4',
    borderRadius: '6px',
  },
  footerText: {
    fontSize: '0.8rem',
    color: '#166534',
    margin: 0,
    fontStyle: 'italic',
  },
};

export default ProofViewer;