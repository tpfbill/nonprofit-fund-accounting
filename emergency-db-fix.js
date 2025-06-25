/**
 * Emergency DB Fix
 * This script ensures that global database objects are available
 * and properly initialized.
 */

// Wait until DOMContentLoaded to ensure all scripts have a chance to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Emergency DB Fix: Initializing...');
    
    // Check if db object exists
    if (typeof db === 'undefined') {
        console.warn('Emergency DB Fix: db object not found, creating fallback');
        
        // Fallback data
        const entities_fallback_data = [
            { id: 'emerg_ent_1', code: 'EMERG_MAIN', name: 'Emergency Main Organization', status: 'Active', parentEntityId: null },
            { id: 'emerg_ent_2', code: 'EMERG_SUB', name: 'Emergency Sub Organization', status: 'Active', parentEntityId: 'emerg_ent_1' }
        ];
        const accounts_fallback_data = [
            { id: 'emerg_acc_1', entityId: 'emerg_ent_1', code: '1000', name: 'Emergency Cash', type: 'Asset', balance: 5000, status: 'Active' },
            { id: 'emerg_acc_2', entityId: 'emerg_ent_1', code: '4000', name: 'Emergency Revenue', type: 'Revenue', balance: 10000, status: 'Active' }
        ];
        const funds_fallback_data = [
            { id: 'emerg_fund_1', entityId: 'emerg_ent_1', code: 'GEN', name: 'Emergency General Fund', type: 'Unrestricted', balance: 5000, status: 'Active' }
        ];
        const journalEntries_fallback_data = [
            { id: 'emerg_je_1', entityId: 'emerg_ent_1', date: '2025-06-15', reference: 'JE-EMERG-001', description: 'Emergency Sample Entry', totalAmount: 1000, status: 'Posted', createdBy: 'EmergencySystem', lines: [] }
        ];
        
        // Create emergency db object
        window.db = {
            _dbConnected: false,
            _connectionAttempted: true,
            _SERVER_BASE_URL: 'http://localhost:3000',
            
            _simulateDelay: function(ms = 50) {
                return new Promise(resolve => setTimeout(resolve, ms));
            },
            
            connect: async function() {
                console.log('EMERGENCY DB: Attempting to connect...');
                try {
                    const res = await fetch(this._SERVER_BASE_URL + '/api/health');
                    this._dbConnected = res.ok;
                    return this._dbConnected;
                } catch (err) {
                    console.warn('EMERGENCY DB: Connection failed - ' + err.message);
                    this._dbConnected = false;
                    return false;
                }
            },
            
            fetchEntities: async function() {
                console.log('EMERGENCY DB: Returning emergency entities');
                await this._simulateDelay();
                return [...entities_fallback_data];
            },
            
            fetchAccounts: async function() {
                console.log('EMERGENCY DB: Returning emergency accounts');
                await this._simulateDelay();
                return [...accounts_fallback_data];
            },
            
            fetchFunds: async function() {
                console.log('EMERGENCY DB: Returning emergency funds');
                await this._simulateDelay();
                return [...funds_fallback_data];
            },
            
            fetchJournalEntries: async function() {
                console.log('EMERGENCY DB: Returning emergency journal entries');
                await this._simulateDelay();
                return [...journalEntries_fallback_data];
            }
        };
    }
    
    // Check for getDbConfig function
    if (typeof getDbConfig === 'undefined') {
        console.warn('Emergency DB Fix: getDbConfig function not found, creating fallback');
        window.getDbConfig = function() {
            return {
                host: 'localhost',
                port: 5432,
                user: 'postgres',
                password: 'npfa123',
                database: 'fund_accounting_db'
            };
        };
    }
    
    // Check for logMsg function
    if (typeof logMsg === 'undefined') {
        console.warn('Emergency DB Fix: logMsg function not found, creating fallback');
        window.logMsg = function(message, type = 'info') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [EMERGENCY] [${type.toUpperCase()}]: ${message}`);
            
            // Try to append to UI log if it exists
            const logOutputDiv = document.getElementById('log-output');
            if (logOutputDiv) {
                const p = document.createElement('p');
                p.className = `log-entry log-${type}`;
                p.textContent = `[${timestamp}] [EMERGENCY] [${type.toUpperCase()}]: ${message}`;
                logOutputDiv.appendChild(p);
                logOutputDiv.scrollTop = logOutputDiv.scrollHeight;
            }
        };
    }
    
    // Force db connection check
    if (typeof db !== 'undefined' && typeof db.connect === 'function') {
        try {
            db.connect()
                .then(connected => {
                    console.log('Emergency DB Fix: Connection check completed, status:', connected ? 'Connected' : 'Fallback');
                    
                    // Try to update UI if possible
                    const statusIndicator = document.getElementById('db-status-indicator');
                    if (statusIndicator) {
                        statusIndicator.textContent = connected ? 'DB Connected' : 'Using Fallback Data';
                        statusIndicator.className = connected ? 'connected' : 'offline';
                    }
                    
                    // Refresh data views if the function exists
                    if (typeof refreshAllDataViews === 'function') {
                        refreshAllDataViews()
                            .then(() => console.log('Emergency DB Fix: Data views refreshed'))
                            .catch(err => console.error('Error refreshing views:', err));
                    }
                })
                .catch(err => console.error('Emergency DB Fix: Connection check error:', err));
        } catch (err) {
            console.error('Emergency DB Fix: Error during initialization:', err);
        }
    }
    
    console.log('Emergency DB Fix: Completed');
});

// Late load checking - in case DOMContentLoaded already fired
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('Emergency DB Fix: Document already loaded, performing immediate check');
    
    // Check db object
    if (typeof window.db === 'undefined') {
        console.warn('Emergency DB Fix (immediate): db object not found');
    } else {
        console.log('Emergency DB Fix (immediate): db object found');
    }
    
    // Check getDbConfig
    if (typeof window.getDbConfig === 'undefined') {
        console.warn('Emergency DB Fix (immediate): getDbConfig not found');
    } else {
        console.log('Emergency DB Fix (immediate): getDbConfig found');
    }
    
    // Check if we need to re-attach event handlers to buttons
    setTimeout(() => {
        console.log('Emergency DB Fix: Checking for unattached button handlers');
        const addAccountBtn = document.getElementById('btnAddAccount');
        const addFundBtn = document.getElementById('btnAddFund');
        const newJournalEntryBtn = document.getElementById('btnNewJournalEntry');
        
        // Re-attach event handlers if buttons exist but don't seem to have click handlers
        if (addAccountBtn) {
            console.log('Emergency DB Fix: Re-attaching account button handler');
            addAccountBtn.addEventListener('click', function() {
                console.log('Add Account button clicked (emergency handler)');
                if (typeof openAccountModal === 'function') {
                    openAccountModal(null);
                } else {
                    alert('Account functionality not available. Please reload the page.');
                }
            });
        }
        
        if (addFundBtn) {
            console.log('Emergency DB Fix: Re-attaching fund button handler');
            addFundBtn.addEventListener('click', function() {
                console.log('Add Fund button clicked (emergency handler)');
                if (typeof openFundModal === 'function') {
                    openFundModal(null);
                } else {
                    alert('Fund functionality not available. Please reload the page.');
                }
            });
        }
        
        if (newJournalEntryBtn) {
            console.log('Emergency DB Fix: Re-attaching journal entry button handler');
            newJournalEntryBtn.addEventListener('click', function() {
                console.log('New Journal Entry button clicked (emergency handler)');
                if (typeof openJournalEntryModal === 'function') {
                    openJournalEntryModal(null);
                } else {
                    alert('Journal Entry functionality not available. Please reload the page.');
                }
            });
        }
    }, 2000); // wait 2 seconds to ensure everything else has loaded
}
