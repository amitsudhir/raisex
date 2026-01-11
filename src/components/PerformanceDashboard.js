import React, { useState, useEffect } from 'react';
import { perfMonitor } from '../utils/performance';

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(perfMonitor.getMetrics());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button 
        style={styles.toggleButton}
        onClick={() => setIsVisible(true)}
        title="Show Performance Dashboard"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </button>
    );
  }

  return (
    <div style={styles.dashboard}>
      <div style={styles.header}>
        <h3 style={styles.title}>Performance Dashboard</h3>
        <div style={styles.controls}>
          <button 
            style={styles.clearButton}
            onClick={() => {
              perfMonitor.clear();
              setMetrics({});
            }}
          >
            Clear
          </button>
          <button 
            style={styles.closeButton}
            onClick={() => setIsVisible(false)}
          >
            ×
          </button>
        </div>
      </div>
      
      <div style={styles.content}>
        {Object.keys(metrics).length === 0 ? (
          <div style={styles.empty}>No performance data yet</div>
        ) : (
          Object.entries(metrics).map(([label, stats]) => (
            <div key={label} style={styles.metric}>
              <div style={styles.metricLabel}>{label}</div>
              <div style={styles.metricStats}>
                <span style={styles.stat}>
                  Calls: <strong>{stats.count}</strong>
                </span>
                <span style={styles.stat}>
                  Avg: <strong>{stats.average.toFixed(0)}ms</strong>
                </span>
                <span style={styles.stat}>
                  Min: <strong>{stats.min.toFixed(0)}ms</strong>
                </span>
                <span style={styles.stat}>
                  Max: <strong>{stats.max.toFixed(0)}ms</strong>
                </span>
              </div>
              <div style={styles.performanceBar}>
                <div 
                  style={{
                    ...styles.performanceBarFill,
                    width: `${Math.min((stats.average / 5000) * 100, 100)}%`,
                    backgroundColor: stats.average > 3000 ? '#ef4444' : 
                                   stats.average > 1000 ? '#f59e0b' : '#10b981'
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  toggleButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#667eea',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    transition: 'all 0.2s ease',
  },
  dashboard: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '400px',
    maxHeight: '500px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    border: '1px solid #e5e7eb',
    zIndex: 1000,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
  },
  controls: {
    display: 'flex',
    gap: '0.5rem',
  },
  clearButton: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.8rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  closeButton: {
    width: '24px',
    height: '24px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '1rem',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  metric: {
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  metricLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  metricStats: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  stat: {
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  performanceBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  performanceBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
};

export default PerformanceDashboard;