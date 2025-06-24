/**
 * Direct Button Fix
 * This script directly attaches button click handlers and ensures they work.
 */

console.log("DIRECT BUTTON FIX: Script loaded");

// Function to apply all button fixes immediately
function fixAllButtons() {
    console.log("DIRECT BUTTON FIX: Fixing all buttons NOW");
    
    // Fix Add Account button
    const btnAddAccount = document.getElementById('btnAddAccount');
    if (btnAddAccount) {
        console.log("DIRECT BUTTON FIX: Found Add Account button");
        btnAddAccount.onclick = function() {
            console.log("DIRECT BUTTON FIX: Add Account button clicked");
            if (typeof openAccountModal === 'function') {
                openAccountModal(null);
            } else {
                alert("Account modal function not available");
            }
        };
    } else {
        console.log("DIRECT BUTTON FIX: Add Account button not found");
    }
    
    // Fix Add Fund button
    const btnAddFund = document.getElementById('btnAddFund');
    if (btnAddFund) {
        console.log("DIRECT BUTTON FIX: Found Add Fund button");
        btnAddFund.onclick = function() {
            console.log("DIRECT BUTTON FIX: Add Fund button clicked");
            if (typeof openFundModal === 'function') {
                openFundModal(null);
            } else {
                alert("Fund modal function not available");
            }
        };
    } else {
        console.log("DIRECT BUTTON FIX: Add Fund button not found");
    }
    
    // Fix New Journal Entry button
    const btnNewJournalEntry = document.getElementById('btnNewJournalEntry');
    if (btnNewJournalEntry) {
        console.log("DIRECT BUTTON FIX: Found New Journal Entry button");
        btnNewJournalEntry.onclick = function() {
            console.log("DIRECT BUTTON FIX: New Journal Entry button clicked");
            if (typeof openJournalEntryModal === 'function') {
                openJournalEntryModal(null);
            } else {
                alert("Journal Entry modal function not available");
            }
        };
    } else {
        console.log("DIRECT BUTTON FIX: New Journal Entry button not found");
    }
    
    // Fix Add Entity button
    const btnAddEntity = document.getElementById('btn-add-entity');
    if (btnAddEntity) {
        console.log("DIRECT BUTTON FIX: Found Add Entity button");
        btnAddEntity.onclick = function() {
            console.log("DIRECT BUTTON FIX: Add Entity button clicked");
            if (typeof openEntityModal === 'function') {
                openEntityModal(null);
            } else {
                alert("Entity modal function not available");
            }
        };
    }
    
    console.log("DIRECT BUTTON FIX: All buttons have been fixed");
}

// Run the fix on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("DIRECT BUTTON FIX: DOMContentLoaded event fired");
    setTimeout(fixAllButtons, 1000);
});

// Also run when the page is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log("DIRECT BUTTON FIX: Document already loaded, running fix immediately");
    setTimeout(fixAllButtons, 500);
}

// Try one more time after a longer delay to ensure everything is loaded
setTimeout(fixAllButtons, 2000);

console.log("DIRECT BUTTON FIX: Script completed loading");
