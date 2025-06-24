/**
 * Database Fix Script - Run this in browser console if buttons not working
 */

// First, verify if db.js was loaded
console.log("DB Object Check:", typeof db !== 'undefined' ? "Found" : "Not Found");

// If not loaded, try to set up fallback data retrieval
if (typeof db === 'undefined') {
  console.warn("Database module not found. Setting up emergency fallback...");
  
  // Create emergency fallback db object
  window.db = {
    _dbConnected: false,
    
    // Fallback data when DB is unavailable
    _fallbackData: {
      entities: [
        { id: 'ent_local_1', code: 'MAIN_ORG', name: 'Community Wellness Foundation', status: 'Active', parentEntityId: null, fiscalYearStart: '01-01', baseCurrency: 'USD', isConsolidated: false },
        { id: 'ent_local_2', code: 'YOUTH_CTR', name: 'Youth Center Program', status: 'Active', parentEntityId: 'ent_local_1', fiscalYearStart: '07-01', baseCurrency: 'USD', isConsolidated: false }
      ],
      accounts: [
        { id: 'acc_local_1', entityId: 'ent_local_1', code: '1010', name: 'Operating Bank Account', type: 'Asset', balance: 150000, status: 'Active' },
        { id: 'acc_local_2', entityId: 'ent_local_1', code: '4010', name: 'Grant Revenue - Gov', type: 'Revenue', balance: 300000, status: 'Active' },
        { id: 'acc_local_3', entityId: 'ent_local_2', code: '1010', name: 'Youth Center Cash', type: 'Asset', balance: 15000, status: 'Active' },
        { id: 'acc_local_4', entityId: 'ent_local_2', code: '5010', name: 'Program Supplies', type: 'Expense', balance: 5000, status: 'Active' }
      ],
      funds: [
        { id: 'fund_local_1', entityId: 'ent_local_1', code: 'GEN', name: 'General Unrestricted Fund', type: 'Unrestricted', balance: 100000, status: 'Active' },
        { id: 'fund_local_2', entityId: 'ent_local_1', code: 'BLD', name: 'Building Fund', type: 'Temporarily Restricted', balance: 50000, status: 'Active' },
        { id: 'fund_local_3', entityId: 'ent_local_2', code: 'YTH', name: 'Youth Program Fund', type: 'Permanently Restricted', balance: 20000, status: 'Active' }
      ]
    },
    
    connect: async function() {
      console.log("DB: Emergency fallback connection simulation");
      return false;
    },
    
    fetchEntities: async function() {
      console.log("DB: Using emergency fallback entities");
      return [...this._fallbackData.entities];
    },
    
    fetchAccounts: async function() {
      console.log("DB: Using emergency fallback accounts");
      return [...this._fallbackData.accounts];
    },
    
    fetchFunds: async function() {
      console.log("DB: Using emergency fallback funds");
      return [...this._fallbackData.funds];
    }
  };
}

// Force refresh the data views
console.log("Attempting to refresh data views...");
if (typeof refreshAllDataViews === 'function') {
  refreshAllDataViews()
    .then(() => console.log("Data views refreshed successfully"))
    .catch(err => console.error("Error refreshing views:", err));
} else {
  console.error("refreshAllDataViews function not found");
}

// Re-attach button event handlers
console.log("Re-attaching button event handlers...");

document.getElementById('btnAddAccount')?.addEventListener('click', () => {
  console.log("Add Account button clicked");
  if (typeof openAccountModal === 'function') {
    openAccountModal(null);
  } else {
    console.error("openAccountModal function not found");
  }
});

document.getElementById('btnAddFund')?.addEventListener('click', () => {
  console.log("Add Fund button clicked");
  if (typeof openFundModal === 'function') {
    openFundModal(null);
  } else {
    console.error("openFundModal function not found");
  }
});

document.getElementById('btnNewJournalEntry')?.addEventListener('click', () => {
  console.log("New Journal Entry button clicked");
  if (typeof openJournalEntryModal === 'function') {
    openJournalEntryModal(null);
  } else {
    console.error("openJournalEntryModal function not found");
  }
});

console.log("Fix database script completed");
