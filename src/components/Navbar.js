import React from "react";
import { Link, useLocation } from "react-router-dom";
import { NETWORK_CONFIG } from "../config/config";
import "./Navbar.css";

const Navbar = ({ account, onConnect }) => {
  const location = useLocation();

  const shortenAddress = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/my-campaigns", label: "My Campaigns" },
    { path: "/my-donations", label: "My Donations" },
    { path: "/my-withdrawals", label: "My Withdrawals" },
    { path: "/my-refunds", label: "My Refunds" },
    { path: "/analytics", label: "Analytics" },
    { path: "/faq", label: "FAQ" },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.container} className="nav-container">
        <div style={styles.brand}>
          <Link to="/" style={styles.brandLink}>
            <h1 style={styles.logo}>RaiseX</h1>
          </Link>
        </div>
        
        <div style={styles.navLinks} className="nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                ...styles.navLink,
                ...(isActive(link.path) ? styles.navLinkActive : {}),
              }}
              className="nav-link"
            >
              <span style={styles.navLabel} className="nav-label">{link.label}</span>
            </Link>
          ))}
        </div>

        <div style={styles.actions}>
          {account ? (
            <div style={styles.accountInfo} className="account-info">
              <span style={styles.network} className="network">{NETWORK_CONFIG.chainName}</span>
              <span style={styles.address} className="address">{shortenAddress(account)}</span>
            </div>
          ) : (
            <button style={styles.connectBtn} onClick={onConnect}>
              Connect Wallet
            </button>
          )}
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
    maxWidth: "1400px", // Increased max width
    margin: "0 auto",
    padding: "0 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem", // Reduced gap
  },
  brand: {
    display: "flex",
    alignItems: "center",
    minWidth: "120px", // Ensure brand has minimum space
  },
  brandLink: {
    textDecoration: "none",
  },
  logo: {
    color: "white",
    fontSize: "1.5rem",
    fontWeight: "bold",
    margin: 0,
  },
  navLinks: {
    display: "flex",
    gap: "0.3rem", // Reduced gap between nav items
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    flexWrap: "wrap", // Allow wrapping if needed
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.4rem 0.8rem", // Reduced padding
    borderRadius: "20px",
    textDecoration: "none",
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: "0.85rem", // Slightly smaller font
    fontWeight: "500",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },
  navLinkActive: {
    background: "rgba(255, 255, 255, 0.2)",
    color: "white",
    fontWeight: "600",
  },
  navIcon: {
    fontSize: "1rem",
  },
  navLabel: {
    display: "none",
  },
  actions: {
    display: "flex",
    gap: "0.5rem", // Reduced gap
    alignItems: "center",
    minWidth: "200px", // Ensure actions have minimum space
    justifyContent: "flex-end",
  },
  accountInfo: {
    display: "flex",
    gap: "0.3rem", // Reduced gap
    alignItems: "center",
    flexWrap: "wrap", // Allow wrapping if needed
  },
  network: {
    background: "rgba(255,255,255,0.2)",
    color: "white",
    padding: "0.4rem 0.8rem", // Reduced padding
    borderRadius: "15px", // Smaller border radius
    fontSize: "0.8rem", // Smaller font
    fontWeight: "500",
  },
  address: {
    background: "white",
    color: "#667eea",
    padding: "0.4rem 0.8rem", // Reduced padding
    borderRadius: "15px", // Smaller border radius
    fontWeight: "600",
    fontSize: "0.85rem", // Slightly smaller font
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
};

// Add responsive styles using CSS-in-JS media queries
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(min-width: 768px)');
  if (mediaQuery.matches) {
    styles.navLabel.display = 'block';
    styles.navLinks.gap = '1rem';
  }
}

export default Navbar;
