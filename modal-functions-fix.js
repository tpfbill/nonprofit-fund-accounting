/**
 * Modal Functions Fix
 * This script specifically fixes the modal opening functions
 * that are failing to correctly open the modals.
 */

console.log("MODAL FUNCTIONS FIX: Script loaded");

// Define the core modal functions directly
window.openAccountModal = function(accountId) {
    console.log("MODAL FUNCTIONS FIX: Direct openAccountModal called", accountId);
    const modal = document.getElementById('account-modal');
    if (!modal) {
        console.error("MODAL FUNCTIONS FIX: account-modal element not found!");
        return;
    }
    
    const titleElement = document.getElementById('account-modal-title');
    if (titleElement) {
        titleElement.textContent = accountId ? "Edit Account" : "Add New Account";
    }
    
    const idInput = document.getElementById('edit-account-id-input');
    if (idInput) {
        idInput.value = accountId || '';
    }
    
    // Clear the form fields
    document.getElementById('account-code-input').value = '';
    document.getElementById('account-name-input').value = '';
    document.getElementById('account-type-select').value = 'Asset';
    document.getElementById('account-status-select').value = 'Active';
    document.getElementById('account-description-textarea').value = '';
    
    // Display the modal
    modal.style.display = 'flex';
    console.log("MODAL FUNCTIONS FIX: Account modal displayed");
};

window.openFundModal = function(fundId) {
    console.log("MODAL FUNCTIONS FIX: Direct openFundModal called", fundId);
    const modal = document.getElementById('fund-modal');
    if (!modal) {
        console.error("MODAL FUNCTIONS FIX: fund-modal element not found!");
        return;
    }
    
    const titleElement = document.getElementById('fund-modal-title');
    if (titleElement) {
        titleElement.textContent = fundId ? "Edit Fund" : "Add New Fund";
    }
    
    const idInput = document.getElementById('edit-fund-id-input');
    if (idInput) {
        idInput.value = fundId || '';
    }
    
    // Clear the form fields
    document.getElementById('fund-code-input').value = '';
    document.getElementById('fund-name-input').value = '';
    document.getElementById('fund-type-select').value = 'Unrestricted';
    document.getElementById('fund-status-select').value = 'Active';
    document.getElementById('fund-description-textarea').value = '';
    
    // Display the modal
    modal.style.display = 'flex';
    console.log("MODAL FUNCTIONS FIX: Fund modal displayed");
};

window.openJournalEntryModal = function(jeId) {
    console.log("MODAL FUNCTIONS FIX: Direct openJournalEntryModal called", jeId);
    const modal = document.getElementById('journal-entry-modal');
    if (!modal) {
        console.error("MODAL FUNCTIONS FIX: journal-entry-modal element not found!");
        return;
    }
    
    const titleElement = document.getElementById('journal-entry-modal-title');
    if (titleElement) {
        titleElement.textContent = jeId ? "Edit Journal Entry" : "New Journal Entry";
    }
    
    const idInput = document.getElementById('edit-je-id-input');
    if (idInput) {
        idInput.value = jeId || '';
    }
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('journal-entry-date').value = today;
    
    // Generate a reference number
    const refNum = 'JE-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    document.getElementById('journal-entry-reference').value = refNum;
    
    // Clear description
    document.getElementById('journal-entry-description').value = '';
    
    // Reset inter-entity checkbox
    document.getElementById('journal-entry-is-inter-entity').checked = false;
    
    // Hide inter-entity fields
    const interEntityFields = document.getElementById('inter-entity-fields-container');
    if (interEntityFields) {
        interEntityFields.classList.remove('active');
    }
    
    // Clear journal lines
    const journalLines = document.getElementById('journal-lines');
    if (journalLines) {
        journalLines.innerHTML = '';
    }
    
    // Reset totals
    document.getElementById('journal-total-debits').value = '$0.00';
    document.getElementById('journal-total-credits').value = '$0.00';
    document.getElementById('journal-difference').value = '$0.00';
    
    // Display the modal
    modal.style.display = 'flex';
    console.log("MODAL FUNCTIONS FIX: Journal Entry modal displayed");
};

window.openEntityModal = function(entityId) {
    console.log("MODAL FUNCTIONS FIX: Direct openEntityModal called", entityId);
    const modal = document.getElementById('entity-modal');
    if (!modal) {
        console.error("MODAL FUNCTIONS FIX: entity-modal element not found!");
        return;
    }
    
    const titleElement = document.getElementById('entity-modal-title-text');
    if (titleElement) {
        titleElement.textContent = entityId ? "Edit Entity" : "Add New Entity";
    }
    
    const idInput = document.getElementById('entity-id-edit');
    if (idInput) {
        idInput.value = entityId || '';
    }
    
    // Clear form fields
    document.getElementById('entity-code-input').value = '';
    document.getElementById('entity-name-input').value = '';
    document.getElementById('entity-parent-select').value = '';
    document.getElementById('entity-status-select').value = 'Active';
    document.getElementById('entity-fiscal-year-start-input').value = '01-01';
    document.getElementById('entity-base-currency-input').value = 'USD';
    document.getElementById('entity-is-consolidated-input').checked = false;
    document.getElementById('entity-description-input').value = '';
    
    // Display the modal
    modal.style.display = 'flex';
    console.log("MODAL FUNCTIONS FIX: Entity modal displayed");
};

// Add direct event listeners to the buttons
setTimeout(function() {
    console.log("MODAL FUNCTIONS FIX: Adding direct button handlers");
    
    // Add Account button
    const btnAddAccount = document.getElementById('btnAddAccount');
    if (btnAddAccount) {
        console.log("MODAL FUNCTIONS FIX: Found Add Account button");
        btnAddAccount.onclick = function() {
            console.log("MODAL FUNCTIONS FIX: Add Account button clicked");
            openAccountModal();
        };
    } else {
        console.log("MODAL FUNCTIONS FIX: Add Account button not found");
    }
    
    // Add Fund button
    const btnAddFund = document.getElementById('btnAddFund');
    if (btnAddFund) {
        console.log("MODAL FUNCTIONS FIX: Found Add Fund button");
        btnAddFund.onclick = function() {
            console.log("MODAL FUNCTIONS FIX: Add Fund button clicked");
            openFundModal();
        };
    } else {
        console.log("MODAL FUNCTIONS FIX: Add Fund button not found");
    }
    
    // New Journal Entry button
    const btnNewJournalEntry = document.getElementById('btnNewJournalEntry');
    if (btnNewJournalEntry) {
        console.log("MODAL FUNCTIONS FIX: Found New Journal Entry button");
        btnNewJournalEntry.onclick = function() {
            console.log("MODAL FUNCTIONS FIX: New Journal Entry button clicked");
            openJournalEntryModal();
        };
    } else {
        console.log("MODAL FUNCTIONS FIX: New Journal Entry button not found");
    }
    
    // Add Entity button
    const btnAddEntity = document.getElementById('btn-add-entity');
    if (btnAddEntity) {
        console.log("MODAL FUNCTIONS FIX: Found Add Entity button");
        btnAddEntity.onclick = function() {
            console.log("MODAL FUNCTIONS FIX: Add Entity button clicked");
            openEntityModal();
        };
    } else {
        console.log("MODAL FUNCTIONS FIX: Add Entity button not found");
    }
    
    console.log("MODAL FUNCTIONS FIX: Direct button handlers added");
}, 1000);

// Setup the modal close buttons too
setTimeout(function() {
    document.querySelectorAll('.modal-close-btn').forEach(function(btn) {
        const modalId = btn.getAttribute('data-modal-id');
        if (modalId) {
            btn.onclick = function() {
                console.log("MODAL FUNCTIONS FIX: Closing modal", modalId);
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                }
            };
        }
    });
    
    // Background click to close modals
    document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
        overlay.addEventListener('click', function(event) {
            if (event.target === overlay) {
                console.log("MODAL FUNCTIONS FIX: Closing modal via overlay click", overlay.id);
                overlay.style.display = 'none';
            }
        });
    });
}, 1200);

// Log completion
console.log("MODAL FUNCTIONS FIX: Initialization complete");
