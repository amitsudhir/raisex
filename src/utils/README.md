# Withdrawal Tracking Utilities

This module provides utilities for tracking withdrawal transactions in the crowdfunding application.

## Features

- **Automatic Transaction Storage**: When users withdraw funds, transaction hashes are automatically stored in localStorage
- **Historical Event Fetching**: Multiple strategies to fetch withdrawal events from the blockchain
- **Fallback Options**: When transaction details aren't available, users get helpful links to explore BaseScan
- **Persistent Storage**: Withdrawal data persists across browser sessions

## How It Works

1. **During Withdrawal**: When a user withdraws funds from a campaign, the transaction hash is stored locally
2. **Loading Withdrawals**: The app tries multiple strategies to fetch historical events:
   - Recent blocks (last 3 days)
   - Extended range (last 6-30 days)  
   - Full history (from genesis, if needed)
3. **Fallback Display**: If blockchain events can't be fetched, stored data is used, or helpful links are provided

## Files

- `withdrawalTracker.js`: Core utility functions
- `MyWithdrawals.js`: Main withdrawal display component
- `MyCampaigns.js`: Campaign management with withdrawal tracking
- `CampaignDetail.js`: Individual campaign withdrawal tracking

## Usage

```javascript
import { storeWithdrawal, getStoredWithdrawals } from '../utils/withdrawalTracker';

// Store a withdrawal
storeWithdrawal(account, campaignId, txHash, amount, title);

// Get stored withdrawals
const withdrawals = getStoredWithdrawals(account);
```

## Benefits

- **Better UX**: Users always see their withdrawal history, even for old transactions
- **Reliable**: Multiple fallback strategies ensure data is available
- **Helpful**: Clear links to BaseScan for transaction verification
- **Persistent**: Data survives browser refreshes and sessions