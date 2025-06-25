/**
 * DIRECT DATA FIX - Emergency test data loader with direct display updates
 * This script bypasses the normal data flow and directly updates both state and UI
 */

console.log('DIRECT DATA FIX: Script loaded');

// Define test data for the application
const emergencyTestData = {
    entities: [
        { 
            id: 'ent1', 
            name: 'Main Organization', 
            code: 'MAIN', 
            status: 'Active', 
            fiscalYearStart: '01-01',
            baseCurrency: 'USD',
            isConsolidated: false 
        },
        { 
            id: 'ent2', 
            name: 'Youth Program', 
            code: 'YOUTH', 
            status: 'Active', 
            fiscalYearStart: '01-01',
            baseCurrency: 'USD',
            isConsolidated: false,
            parentEntityId: 'ent1'
        }
    ],

    accounts: [
        // Main Organization accounts
        { id: 'acc1', entityId: 'ent1', code: '1000', name: 'Cash', type: 'Asset', balance: 150000, status: 'Active' },
        { id: 'acc2', entityId: 'ent1', code: '1200', name: 'Grants Receivable', type: 'Asset', balance: 50000, status: 'Active' },
        { id: 'acc3', entityId: 'ent1', code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 25000, status: 'Active' },
        { id: 'acc4', entityId: 'ent1', code: '3000', name: 'Net Assets', type: 'Net Assets', balance: 175000, status: 'Active' },
        { id: 'acc5', entityId: 'ent1', code: '4000', name: 'Grant Revenue', type: 'Revenue', balance: 250000, status: 'Active' },
        { id: 'acc6', entityId: 'ent1', code: '5000', name: 'Program Expenses', type: 'Expense', balance: 100000, status: 'Active' },
        
        // Youth Program accounts
        { id: 'acc7', entityId: 'ent2', code: '1000', name: 'Youth Program Cash', type: 'Asset', balance: 25000, status: 'Active' },
        { id: 'acc8', entityId: 'ent2', code: '4100', name: 'Youth Program Revenue', type: 'Revenue', balance: 35000, status: 'Active' },
        { id: 'acc9', entityId: 'ent2', code: '5100', name: 'Youth Program Expenses', type: 'Expense', balance: 10000, status: 'Active' }
    ],

    funds: [
        // Main Organization funds
        { id: 'fund1', entityId: 'ent1', code: 'GF', name: 'General Fund', type: 'Unrestricted', balance: 100000, status: 'Active' },
        { id: 'fund2', entityId: 'ent1', code: 'RF', name: 'Restricted Fund', type: 'Temporarily Restricted', balance: 75000, status: 'Active' },
        
        // Youth Program funds
        { id: 'fund3', entityId: 'ent2', code: 'YF', name: 'Youth Fund', type: 'Unrestricted', balance: 25000, status: 'Active' }
    ],

    journalEntries: [
        {
            id: 'je1',
            entityId: 'ent1',
            date: '2025-06-01',
            reference: 'JE-001',
            description: 'Grant received from Community Foundation',
            totalAmount: 25000,
            status: 'Posted',
            createdBy: 'System',
            lines: [
                { accountId: 'acc1', fundId: 'fund1', debit: 25000, credit: 0, description: 'Cash received' },
                { accountId: 'acc5', fundId: 'fund1', debit: 0, credit: 25000, description: 'Revenue recorded' }
            ]
        },
        {
            id: 'je2',
            entityId: 'ent1',
            date: '2025-06-15',
            reference: 'JE-002',
            description: 'Monthly office expenses',
            totalAmount: 5000,
            status: 'Posted',
            createdBy: 'System',
            lines: [
                { accountId: 'acc6', fundId: 'fund1', debit: 5000, credit: 0, description: 'Office expenses' },
                { accountId: 'acc1', fundId: 'fund1', debit: 0, credit: 5000, description: 'Cash payment' }
            ]
        }
    ],

    users: [
        { id: 'user1', name: 'Admin User', email: 'admin@example.org', role: 'Administrator', status: 'Active' },
        { id: 'user2', name: 'Finance Manager', email: 'finance@example.org', role: 'Finance', status: 'Active' }
    ],

    organizationSettings: {
        name: 'Community Non-Profit Organization',
        taxId: '12-3456789',
        phone: '(555) 123-4567',
        email: 'info@communitynonprofit.org',
        addressStreet: '123 Main Street',
        addressCity: 'Anytown',
        addressState: 'ST',
        addressZip: '12345',
        defaultCurrency: 'USD',
        globalFiscalYearStart: '01-01'
    }
};

// Function to directly populate the entity selector dropdown
function populateEntitySelector(entities) {
    console.log('DIRECT DATA FIX: Populating entity selector');
    const selector = document.getElementById('entity-selector');
    if (!selector) {
        console.error('DIRECT DATA FIX: Entity selector not found');
        return;
    }
    
    selector.innerHTML = '';
    entities.forEach(entity => {
        const option = document.createElement('option');
        option.value = entity.id;
        option.textContent = entity.name;
        selector.appendChild(option);
    });
    
    if (entities.length > 0) {
        selector.value = entities[0].id;
    }
    
    console.log('DIRECT DATA FIX: Entity selector populated with', entities.length, 'entities');
}

// Function to directly populate dashboard summary cards
function populateDashboardSummary(data) {
    console.log('DIRECT DATA FIX: Populating dashboard summary');
    const cardsContainer = document.getElementById('dashboard-summary-cards');
    if (!cardsContainer) {
        console.error('DIRECT DATA FIX: Dashboard summary container not found');
        return;
    }
    
    // Clear placeholder
    cardsContainer.innerHTML = '';
    
    // Calculate totals
    let totalAssets = 0, totalLiabilities = 0, totalRevenue = 0, totalExpenses = 0;
    
    data.accounts.forEach(account => {
        if (account.type === 'Asset') totalAssets += account.balance;
        if (account.type === 'Liability') totalLiabilities += account.balance;
        if (account.type === 'Revenue') totalRevenue += account.balance;
        if (account.type === 'Expense') totalExpenses += account.balance;
    });
    
    const netAssets = totalAssets - totalLiabilities;
    const netIncome = totalRevenue - totalExpenses;
    
    // Create cards
    const cards = [
        { title: 'Total Assets', value: formatCurrency(totalAssets) },
        { title: 'Total Liabilities', value: formatCurrency(totalLiabilities) },
        { title: 'Net Assets', value: formatCurrency(netAssets) },
        { title: 'Total Revenue', value: formatCurrency(totalRevenue) },
        { title: 'Total Expenses', value: formatCurrency(totalExpenses) },
        { title: 'Net Income', value: formatCurrency(netIncome) }
    ];
    
    cards.forEach(card => {
        const cardElem = document.createElement('div');
        cardElem.className = 'card';
        cardElem.innerHTML = `
            <div class="card-title">${card.title}</div>
            <div class="card-value">${card.value}</div>
        `;
        cardsContainer.appendChild(cardElem);
    });
    
    console.log('DIRECT DATA FIX: Dashboard summary populated with 6 cards');
}

// Function to directly populate fund balances table
function populateFundBalances(data) {
    console.log('DIRECT DATA FIX: Populating fund balances table');
    const table = document.getElementById('dashboard-fund-balances-table');
    if (!table) {
        console.error('DIRECT DATA FIX: Fund balances table not found');
        return;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('DIRECT DATA FIX: Fund balances table body not found');
        return;
    }
    
    // Clear placeholder
    tbody.innerHTML = '';
    
    // Total funds balance for percentage calculation
    const totalFunds = data.funds.reduce((sum, fund) => sum + fund.balance, 0);
    
    // Add fund rows
    data.funds.forEach(fund => {
        const tr = document.createElement('tr');
        const percent = totalFunds > 0 ? (fund.balance / totalFunds * 100).toFixed(1) : 0;
        
        tr.innerHTML = `
            <td>${fund.name}</td>
            <td>${fund.type}</td>
            <td>${formatCurrency(fund.balance)}</td>
            <td>${percent}%</td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('DIRECT DATA FIX: Fund balances table populated with', data.funds.length, 'funds');
}

// Function to directly populate Chart of Accounts table
function populateChartOfAccounts(data) {
    console.log('DIRECT DATA FIX: Populating Chart of Accounts table');
    const table = document.getElementById('chart-of-accounts-table');
    if (!table) {
        console.error('DIRECT DATA FIX: Chart of Accounts table not found');
        return;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('DIRECT DATA FIX: Chart of Accounts table body not found');
        return;
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Add account rows
    data.accounts.forEach(account => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${account.code}</td>
            <td>${account.name}</td>
            <td>${account.type}</td>
            <td>${formatCurrency(account.balance)}</td>
            <td><span class="status status-${account.status.toLowerCase()}">${account.status}</span></td>
            <td><button class="action-button btn-edit-account" data-id="${account.id}">Edit</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('DIRECT DATA FIX: Chart of Accounts table populated with', data.accounts.length, 'accounts');
}

// Function to directly populate Funds table
function populateFundsTable(data) {
    console.log('DIRECT DATA FIX: Populating Funds table');
    const table = document.getElementById('funds-table');
    if (!table) {
        console.error('DIRECT DATA FIX: Funds table not found');
        return;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('DIRECT DATA FIX: Funds table body not found');
        return;
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Add fund rows
    data.funds.forEach(fund => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${fund.code}</td>
            <td>${fund.name}</td>
            <td>${fund.type}</td>
            <td>${formatCurrency(fund.balance)}</td>
            <td><span class="status status-${fund.status.toLowerCase()}">${fund.status}</span></td>
            <td><button class="action-button btn-edit-fund" data-id="${fund.id}">Edit</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('DIRECT DATA FIX: Funds table populated with', data.funds.length, 'funds');
}

// Function to directly populate Journal Entries table
function populateJournalEntries(data) {
    console.log('DIRECT DATA FIX: Populating Journal Entries table');
    const table = document.getElementById('journal-entries-table');
    if (!table) {
        console.error('DIRECT DATA FIX: Journal Entries table not found');
        return;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('DIRECT DATA FIX: Journal Entries table body not found');
        return;
    }
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Add journal entry rows
    data.journalEntries.forEach(je => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${je.date || '2025-06-01'}</td>
            <td>${je.reference}</td>
            <td>${je.description}</td>
            <td>${formatCurrency(je.totalAmount)}</td>
            <td><span class="status status-${je.status.toLowerCase()}">${je.status}</span></td>
            <td>${je.createdBy || 'System'}</td>
            <td><button class="action-button btn-edit-je" data-id="${je.id}">Edit</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('DIRECT DATA FIX: Journal Entries table populated with', data.journalEntries.length, 'entries');
}

// Helper function to format currency
function formatCurrency(amount) {
    return `$${(amount || 0).toFixed(2)} USD`;
}

// Function to update app state with test data
function directlyLoadTestData() {
    console.log('DIRECT DATA FIX: Loading test data directly');
    
    try {
        // First try to update the app state if possible
        if (window.app && typeof window.app.getState === 'function') {
            console.log('DIRECT DATA FIX: Updating app state with test data');
            const appState = window.app.getState();
            
            // Copy test data to state
            appState.entities = emergencyTestData.entities;
            appState.accounts = emergencyTestData.accounts;
            appState.funds = emergencyTestData.funds;
            appState.journalEntries = emergencyTestData.journalEntries;
            appState.users = emergencyTestData.users;
            appState.organizationSettings = emergencyTestData.organizationSettings;
            
            // Set current entity
            if (emergencyTestData.entities.length > 0) {
                appState.currentEntityId = emergencyTestData.entities[0].id;
            }
            
            console.log('DIRECT DATA FIX: App state updated with test data');
            
            // Try to refresh the UI via normal methods
            if (window.ui && typeof window.ui.refreshAllViews === 'function') {
                console.log('DIRECT DATA FIX: Calling ui.refreshAllViews()');
                try {
                    window.ui.refreshAllViews(appState);
                    console.log('DIRECT DATA FIX: UI refresh called successfully');
                } catch (err) {
                    console.error('DIRECT DATA FIX: Error in UI refresh:', err);
                }
            } else {
                console.warn('DIRECT DATA FIX: UI refresh function not available');
            }
        } else {
            console.warn('DIRECT DATA FIX: App state not available, continuing with direct UI updates');
        }
        
        // Now directly update the UI elements regardless of app state update success
        console.log('DIRECT DATA FIX: Starting direct UI updates');
        
        // First populate entity selector
        populateEntitySelector(emergencyTestData.entities);
        
        // Then update specific tables based on which page is active
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            const pageId = activePage.id;
            console.log('DIRECT DATA FIX: Active page is', pageId);
            
            if (pageId === 'dashboard-page') {
                populateDashboardSummary(emergencyTestData);
                populateFundBalances(emergencyTestData);
            } 
            else if (pageId === 'chart-of-accounts-page') {
                populateChartOfAccounts(emergencyTestData);
            }
            else if (pageId === 'funds-page') {
                populateFundsTable(emergencyTestData);
            }
            else if (pageId === 'journal-entries-page') {
                populateJournalEntries(emergencyTestData);
            }
        } else {
            console.error('DIRECT DATA FIX: No active page found');
        }
        
        // Finally, set up a global function to update tables when switching pages
        window.updateTablesAfterNavigation = function(pageId) {
            console.log('DIRECT DATA FIX: Page changed to', pageId);
            setTimeout(() => {
                if (pageId === 'dashboard-page') {
                    populateDashboardSummary(emergencyTestData);
                    populateFundBalances(emergencyTestData);
                } 
                else if (pageId === 'chart-of-accounts-page') {
                    populateChartOfAccounts(emergencyTestData);
                } 
                else if (pageId === 'funds-page') {
                    populateFundsTable(emergencyTestData);
                }
                else if (pageId === 'journal-entries-page') {
                    populateJournalEntries(emergencyTestData);
                }
            }, 100);
        };
        
        // Add an improved tab navigation function
        window.switchToPageWithUpdatedData = function(pageName) {
            // First switch the tab using our existing function
            if (typeof switchMainTab === 'function') {
                switchMainTab(pageName);
            }
            
            // Then update the tables
            window.updateTablesAfterNavigation(pageName + '-page');
        };
        
        // Modify the existing tab navigation component if possible
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const pageName = item.getAttribute('data-page');
            if (pageName) {
                item.onclick = function() {
                    window.switchToPageWithUpdatedData(pageName);
                    return false;
                };
            }
        });
        
        console.log('DIRECT DATA FIX: Test data loaded and UI updated directly!');
        alert('Test data has been loaded successfully!');
        
    } catch (error) {
        console.error('DIRECT DATA FIX: Error loading test data:', error);
        alert('Error loading test data. Check console for details.');
    }
}

// Add a button to load test data directly
function addDirectDataButton() {
    // Create a container for the button
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '10px';
    container.style.top = '10px';
    container.style.zIndex = '10000';

    // Create the button
    const button = document.createElement('button');
    button.textContent = 'LOAD DATA NOW';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#ff5722';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '16px';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

    // Add hover effect
    button.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#e64a19';
    });

    button.addEventListener('mouseout', function() {
        this.style.backgroundColor = '#ff5722';
    });

    // Add click handler
    button.addEventListener('click', function() {
        directlyLoadTestData();
    });

    container.appendChild(button);
    document.body.appendChild(container);
    
    console.log('DIRECT DATA FIX: Added direct data loading button');
}

// Initialize when the page loads or after a delay
document.addEventListener('DOMContentLoaded', addDirectDataButton);
setTimeout(addDirectDataButton, 1000);

console.log('DIRECT DATA FIX: Script initialization complete');
