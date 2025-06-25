/**
 * Button Fix Script
 * This script explicitly adds event listeners to the buttons
 * that need them in the fund accounting application.
 */

console.log("Button fix script loaded!");

document.addEventListener('DOMContentLoaded', function() {
    console.log("Button fix: DOM content loaded event fired");
    fixButtons();
});

// Also try immediate execution for when the script loads after DOM is ready
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log("Button fix: Document already loaded, executing immediately");
    setTimeout(fixButtons, 500); // Small delay to ensure other scripts have run
}

function fixButtons() {
    console.log("Attempting to fix buttons...");
    
    // Fix Chart of Accounts button
    const btnAddAccount = document.getElementById('btnAddAccount');
    if (btnAddAccount) {
        console.log("Found btnAddAccount, attaching click handler");
        btnAddAccount.addEventListener('click', function() {
            console.log("Add Account button clicked via fix-buttons.js");
            try {
                if (typeof openAccountModal === 'function') {
                    openAccountModal(null);
                } else {
                    console.error("openAccountModal function not found");
                    alert("The account modal function is not available. Please check the browser console for errors.");
                }
            } catch (err) {
                console.error("Error in account button handler:", err);
                alert("Error opening account modal: " + err.message);
            }
        });
    } else {
        console.warn("btnAddAccount not found in the DOM");
    }
    
    // Fix Funds button
    const btnAddFund = document.getElementById('btnAddFund');
    if (btnAddFund) {
        console.log("Found btnAddFund, attaching click handler");
        btnAddFund.addEventListener('click', function() {
            console.log("Add Fund button clicked via fix-buttons.js");
            try {
                if (typeof openFundModal === 'function') {
                    openFundModal(null);
                } else {
                    console.error("openFundModal function not found");
                    alert("The fund modal function is not available. Please check the browser console for errors.");
                }
            } catch (err) {
                console.error("Error in fund button handler:", err);
                alert("Error opening fund modal: " + err.message);
            }
        });
    } else {
        console.warn("btnAddFund not found in the DOM");
    }
    
    // Fix Journal Entry button
    const btnNewJournalEntry = document.getElementById('btnNewJournalEntry');
    if (btnNewJournalEntry) {
        console.log("Found btnNewJournalEntry, attaching click handler");
        btnNewJournalEntry.addEventListener('click', function() {
            console.log("New Journal Entry button clicked via fix-buttons.js");
            try {
                if (typeof openJournalEntryModal === 'function') {
                    openJournalEntryModal(null);
                } else {
                    console.error("openJournalEntryModal function not found");
                    alert("The journal entry modal function is not available. Please check the browser console for errors.");
                }
            } catch (err) {
                console.error("Error in journal entry button handler:", err);
                alert("Error opening journal entry modal: " + err.message);
            }
        });
    } else {
        console.warn("btnNewJournalEntry not found in the DOM");
    }
    
    // Fix Entity button
    const btnAddEntity = document.getElementById('btn-add-entity');
    if (btnAddEntity) {
        console.log("Found btn-add-entity, attaching click handler");
        btnAddEntity.addEventListener('click', function() {
            console.log("Add Entity button clicked via fix-buttons.js");
            try {
                if (typeof openEntityModal === 'function') {
                    openEntityModal(null);
                } else {
                    console.error("openEntityModal function not found");
                    alert("The entity modal function is not available. Please check the browser console for errors.");
                }
            } catch (err) {
                console.error("Error in entity button handler:", err);
                alert("Error opening entity modal: " + err.message);
            }
        });
    }
    
    console.log("Button fix script completed execution");
}

// For debugging - define these functions as fallbacks if they don't exist
if (typeof openAccountModal !== 'function') {
    console.warn("Defining fallback openAccountModal function");
    window.openAccountModal = function(id) {
        console.log("Fallback openAccountModal called with ID:", id);
        alert("This is a fallback account modal function. The real one failed to load.");
    };
}

if (typeof openFundModal !== 'function') {
    console.warn("Defining fallback openFundModal function");
    window.openFundModal = function(id) {
        console.log("Fallback openFundModal called with ID:", id);
        alert("This is a fallback fund modal function. The real one failed to load.");
    };
}

if (typeof openJournalEntryModal !== 'function') {
    console.warn("Defining fallback openJournalEntryModal function");
    window.openJournalEntryModal = function(id) {
        console.log("Fallback openJournalEntryModal called with ID:", id);
        alert("This is a fallback journal entry modal function. The real one failed to load.");
    };
}

if (typeof openEntityModal !== 'function') {
    console.warn("Defining fallback openEntityModal function");
    window.openEntityModal = function(id) {
        console.log("Fallback openEntityModal called with ID:", id);
        alert("This is a fallback entity modal function. The real one failed to load.");
    };
}

// Define modal management functions if they don't exist
if (typeof openModalWithTitle !== 'function') {
    console.warn("Defining fallback openModalWithTitle function");
    window.openModalWithTitle = function(modalId, title, editId) {
        console.log(`Fallback openModalWithTitle called: ${modalId}, ${title}, ${editId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            const titleEl = modal.querySelector('.modal-title');
            if (titleEl) titleEl.textContent = title;
            
            const idInput = modal.querySelector('input[type="hidden"]');
            if (idInput) idInput.value = editId || '';
            
            modal.style.display = 'flex';
        } else {
            console.error(`Modal not found: ${modalId}`);
            alert(`Modal element not found: ${modalId}`);
        }
    };
}

if (typeof closeModalById !== 'function') {
    console.warn("Defining fallback closeModalById function");
    window.closeModalById = function(modalId) {
        console.log(`Fallback closeModalById called: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        } else {
            console.error(`Modal not found for closing: ${modalId}`);
        }
    };
}

console.log("Button fix script: all fallback functions defined");
