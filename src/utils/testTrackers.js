/**
 * Test utilities for withdrawal and donation tracking
 * Run in browser console to test functionality
 */

import { storeWithdrawal, getStoredWithdrawals, clearStoredWithdrawals } from './withdrawalTracker';
import { storeDonation, getStoredDonations, clearStoredDonations } from './donationTracker';

// Test withdrawal tracking
export const testWithdrawalTracking = () => {
  const testAccount = "0x1234567890123456789012345678901234567890";
  
  console.log("Testing withdrawal tracking...");
  
  // Store test withdrawal
  storeWithdrawal(testAccount, "1", "0x123abc", "1.5", "Test Campaign");
  
  // Retrieve and verify
  const withdrawals = getStoredWithdrawals(testAccount);
  console.log("Stored withdrawals:", withdrawals);
  
  // Clean up
  clearStoredWithdrawals(testAccount);
  console.log("Withdrawal tracking test completed!");
};

// Test donation tracking
export const testDonationTracking = () => {
  const testAccount = "0x1234567890123456789012345678901234567890";
  
  console.log("Testing donation tracking...");
  
  // Store test donations
  storeDonation(testAccount, "1", "0x456def", "0.5", "Test Campaign 1");
  storeDonation(testAccount, "1", "0x789ghi", "0.3", "Test Campaign 1"); // Second donation to same campaign
  storeDonation(testAccount, "2", "0xabcjkl", "1.0", "Test Campaign 2");
  
  // Retrieve and verify
  const donations = getStoredDonations(testAccount);
  console.log("Stored donations:", donations);
  
  // Clean up
  clearStoredDonations(testAccount);
  console.log("Donation tracking test completed!");
};

// Run all tests
export const runAllTests = () => {
  testWithdrawalTracking();
  testDonationTracking();
  console.log("All tracking tests completed!");
};