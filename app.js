// Dashboard Content - Financial Overview
const financialOverviewHTML = 
    <div class="content-header">
        <h2>Dashboard</h2>
        <button class="action-button">Print Report</button>
    </div>
    
    <!-- Summary Cards -->
    <div class="card-grid">
        <div class="card">
            <div class="card-title">Total Assets</div>
            <div class="card-value">,254,897.00</div>
        </div>
        <div class="card">
            <div class="card-title">Total Liabilities</div>
            <div class="card-value">,250.00</div>
        </div>
        <div class="card">
            <div class="card-title">Net Assets</div>
            <div class="card-value">,647.00</div>
        </div>
        <div class="card">
            <div class="card-title">YTD Revenue</div>
            <div class="card-value">,890.00</div>
        </div>
    </div>

    <!-- Fund Balances -->
    <h3 class="mt-20">Fund Balances</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>Fund Name</th>
                <th>Type</th>
                <th>Balance</th>
                <th>% of Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>General Operating</td>
                <td>Unrestricted</td>
                <td>,781.00</td>
                <td>46.6%</td>
            </tr>
            <tr>
                <td>Building Fund</td>
                <td>Temporarily Restricted</td>
                <td>,450.00</td>
                <td>14.1%</td>
            </tr>
            <tr>
                <td>Endowment</td>
                <td>Permanently Restricted</td>
                <td>,000.00</td>
                <td>27.4%</td>
            </tr>
            <tr>
                <td>Program Services</td>
                <td>Temporarily Restricted</td>
                <td>,416.00</td>
                <td>11.9%</td>
            </tr>
        </tbody>
    </table>
;

// Dashboard Content - Recent Transactions
const recentTransactionsHTML = 
    <div class="content-header">
        <h2>Recent Transactions</h2>
        <button class="action-button">Export</button>
    </div>
    
    <table class="data-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>2025-06-15</td>
                <td>JE-2025-0145</td>
                <td>Grant Payment - Johnson Foundation</td>
                <td>,000.00</td>
                <td><span class="status status-active">Posted</span></td>
            </tr>
            <tr>
                <td>2025-06-14</td>
                <td>JE-2025-0144</td>
                <td>Monthly Rent Payment</td>
                <td>,500.00</td>
                <td><span class="status status-active">Posted</span></td>
            </tr>
            <tr>
                <td>2025-06-12</td>
                <td>JE-2025-0143</td>
                <td>Utility Bills - June</td>
                <td>,250.00</td>
                <td><span class="status status-active">Posted</span></td>
            </tr>
            <tr>
                <td>2025-06-10</td>
                <td>JE-2025-0142</td>
                <td>Staff Payroll - First Half June</td>
                <td>,750.00</td>
                <td><span class="status status-active">Posted</span></td>
            </tr>
            <tr>
                <td>2025-06-08</td>
                <td>JE-2025-0141</td>
                <td>Individual Donation - Smith Family</td>
                <td>,000.00</td>
                <td><span class="status status-active">Posted</span></td>
            </tr>
        </tbody>
    </table>
;

// Dashboard Content - Unposted Entries
const unpostedEntriesHTML = 
    <div class="content-header">
        <h2>Unposted Journal Entries</h2>
        <button class="action-button">New Entry</button>
    </div>
    
    <table class="data-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Created By</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>2025-06-17</td>
                <td>JE-2025-0146</td>
                <td>Community Event Donations</td>
                <td>,450.00</td>
                <td>Mary Johnson</td>
                <td>
                    <button class="action-button">Post</button>
                </td>
            </tr>
            <tr>
                <td>2025-06-17</td>
                <td>JE-2025-0147</td>
                <td>Office Supplies Purchase</td>
                <td>.25</td>
                <td>Robert Smith</td>
                <td>
                    <button class="action-button">Post</button>
                </td>
            </tr>
            <tr>
                <td>2025-06-16</td>
                <td>JE-2025-0148</td>
                <td>Program Expenses - Youth Workshop</td>
                <td>,340.00</td>
                <td>Jane Wilson</td>
                <td>
                    <button class="action-button">Post</button>
                </td>
            </tr>
        </tbody>
    </table>
;

// Chart of Accounts Content
const chartOfAccountsHTML = 
    <div class="content-header">
        <h2>Chart of Accounts</h2>
        <button class="action-button">Add Account</button>
    </div>

    <!-- Tabs -->
    <div class="tab-container">
        <div class="tab-menu">
            <div class="tab-item active" data-tab="accounts-list">List View</div>
            <div class="tab-item" data-tab="accounts-tree">Tree View</div>
        </div>
        <div class="tab-content">
            <div id="accounts-list" class="tab-panel active">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1000</td>
                            <td>Cash and Cash Equivalents</td>
                            <td>Asset</td>
                            <td>,250.00</td>
                            <td><span class="status status-active">Active</span></td>
                            <td>
                                <button class="action-button">Edit</button>
                            </td>
                        </tr>
                        <tr>
                            <td>1010</td>
                            <td>Operating Checking</td>
                            <td>Asset</td>
                            <td>,250.00</td>
                            <td><span class="status status-active">Active</span></td>
                            <td>
                                <button class="action-button">Edit</button>
                            </td>
                        </tr>
                        <tr>
                            <td>1020</td>
                            <td>Savings Account</td>
                            <td>Asset</td>
                            <td>,000.00</td>
                            <td><span class="status status-active">Active</span></td>
                            <td>
                                <button class="action-button">Edit</button>
                            </td>
                        </tr>
                        <tr>
                            <td>1100</td>
                            <td>Accounts Receivable</td>
                            <td>Asset</td>
                            <td>,450.00</td>
                            <td><span class="status status-active">Active</span></td>
                            <td>
                                <button class="action-button">Edit</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div id="accounts-tree" class="tab-panel">
                <p>Tree view of accounts would be displayed here with proper hierarchy.</p>
            </div>
        </div>
    </div>
;

// Funds Management Content
const fundsHTML = 
    <div class="content-header">
        <h2>Funds Management</h2>
        <button class="action-button">Add Fund</button>
    </div>
    
    <table class="data-table">
        <thead>
            <tr>
                <th>Fund Code</th>
                <th>Fund Name</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>GEN</td>
                <td>General Operating Fund</td>
                <td>Unrestricted</td>
                <td>,781.00</td>
                <td><span class="status status-active">Active</span></td>
                <td>
                    <button class="action-button">Edit</button>
                </td>
            </tr>
            <tr>
                <td>BLDG</td>
                <td>Building Fund</td>
                <td>Temporarily Restricted</td>
                <td>,450.00</td>
                <td><span class="status status-active">Active</span></td>
                <td>
                    <button class="action-button">Edit</button>
                </td>
            </tr>
            <tr>
                <td>ENDOW</td>
                <td>Endowment Fund</td>
                <td>Permanently Restricted</td>
                <td>,000.00</td>
                <td><span class="status status-active">Active</span></td>
                <td>
                    <button class="action-button">Edit</button>
                </td>
            </tr>
            <tr>
                <td>PROG</td>
                <td>Program Services Fund</td>
                <td>Temporarily Restricted</td>
                <td>,416.00</td>
                <td><span class="status status-active">Active</span></td>
                <td>
                    <button class="action-button">Edit</button>
                </td>
            </tr>
        </tbody>
    </table>
;

// Journal Entries Content
const journalEntriesHTML = 
    <div class="content-header">
        <h2>Journal Entries</h2>
        <button class="action-button">New Journal Entry</button>
    </div>
    
    <table class="data-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>2025-06-17</td>
                <td>JE-2025-0146</td>
                <td>Community Event Donations</td>
                <td>,450.00</td>
                <td><span class="status status-pending">Unposted</span></td>
                <td>Mary Johnson</td>
                <td>
                    <button class="action-button">View</button>
                </td>
            </tr>
            <tr>
                <td>2025-06-15</td>
                <td>JE-2025-0145</td>
                <td>Grant Payment - Johnson Foundation</td>
                <td>,000.00</td>
                <td><span class="status status-active">Posted</span></td>
                <td>John Doe</td>
                <td>
                    <button class="action-button">View</button>
                </td>
            </tr>
            <tr>
                <td>2025-06-14</td>
                <td>JE-2025-0144</td>
                <td>Monthly Rent Payment</td>
                <td>,500.00</td>
                <td><span class="status status-active">Posted</span></td>
                <td>Jane Wilson</td>
                <td>
                    <button class="action-button">View</button>
                </td>
            </tr>
        </tbody>
    </table>
;

// Reports Content
const reportsHTML = 
    <div class="content-header">
        <h2>Financial Reports</h2>
    </div>
    
    <div class="card-grid">
        <div class="card">
            <div class="card-title">Statement of Financial Position</div>
            <p>Balance sheet showing assets, liabilities, and net assets.</p>
            <button class="action-button mt-20">Generate</button>
        </div>
        <div class="card">
            <div class="card-title">Statement of Activities</div>
            <p>Income statement showing revenue, expenses, and changes in net assets.</p>
            <button class="action-button mt-20">Generate</button>
        </div>
        <div class="card">
            <div class="card-title">Statement of Functional Expenses</div>
            <p>Expenses categorized by program, administrative, and fundraising.</p>
            <button class="action-button mt-20">Generate</button>
        </div>
        <div class="card">
            <div class="card-title">Budget vs. Actual</div>
            <p>Comparison of budgeted and actual amounts with variances.</p>
            <button class="action-button mt-20">Generate</button>
        </div>
    </div>
;

// Settings Content
const settingsHTML = 
    <div class="content-header">
        <h2>System Settings</h2>
    </div>
    
    <div class="tab-container">
        <div class="tab-menu">
            <div class="tab-item active" data-tab="users-tab">Users</div>
            <div class="tab-item" data-tab="organization-tab">Organization</div>
            <div class="tab-item" data-tab="fiscal-years-tab">Fiscal Years</div>
        </div>
        <div class="tab-content">
            <div id="users-tab" class="tab-panel active">
                <div class="content-header">
                    <h3>User Management</h3>
                    <button class="action-button">Add User</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>John Doe</td>
                            <td>john.doe@example.org</td>
                            <td>Administrator</td>
                            <td><span class="status status-active">Active</span></td>
                            <td>2025-06-17 09:45</td>
                            <td>
                                <button class="action-button">Edit</button>
                            </td>
                        </tr>
                        <tr>
                            <td>Mary Johnson</td>
                            <td>mary.johnson@example.org</td>
                            <td>Finance Manager</td>
                            <td><span class="status status-active">Active</span></td>
                            <td>2025-06-17 08:30</td>
                            <td>
                                <button class="action-button">Edit</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div id="organization-tab" class="tab-panel">
                <h3>Organization Settings</h3>
                <p>Organization configuration would be displayed here.</p>
            </div>
            <div id="fiscal-years-tab" class="tab-panel">
                <h3>Fiscal Year Management</h3>
                <p>Fiscal year configuration would be displayed here.</p>
            </div>
        </div>
    </div>
;

// Other dashboard panels content
const budgetAnalysisHTML = 
    <div class="content-header">
        <h2>Budget Analysis</h2>
        <button class="action-button">Export</button>
    </div>
    
    <h3>Budget vs. Actual (Current Fiscal Year)</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>% Used</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Program Services</td>
                <td>,000.00</td>
                <td>,789.00</td>
                <td>,211.00</td>
                <td><span class="badge badge-green">60.4%</span></td>
            </tr>
            <tr>
                <td>Administrative</td>
                <td>,000.00</td>
                <td>,450.00</td>
                <td>,550.00</td>
                <td><span class="badge badge-green">64.3%</span></td>
            </tr>
            <tr>
                <td>Fundraising</td>
                <td>,000.00</td>
                <td>,125.00</td>
                <td>,875.00</td>
                <td><span class="badge badge-amber">91.7%</span></td>
            </tr>
            <tr>
                <td>Capital Expenses</td>
                <td>,000.00</td>
                <td>,450.00</td>
                <td>,550.00</td>
                <td><span class="badge badge-blue">24.9%</span></td>
            </tr>
            <tr>
                <td>Total Expenses</td>
                <td><strong>,000.00</strong></td>
                <td><strong>,814.00</strong></td>
                <td><strong>,186.00</strong></td>
                <td><strong>62.9%</strong></td>
            </tr>
        </tbody>
    </table>
;

const fundBalancesHTML = 
    <div class="content-header">
        <h2>Fund Balances</h2>
        <button class="action-button">Export</button>
    </div>
    
    <h3>Fund Balances - Detailed</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>Fund ID</th>
                <th>Fund Name</th>
                <th>Type</th>
                <th>Beginning Balance</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Current Balance</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>F001</td>
                <td>General Operating</td>
                <td>Unrestricted</td>
                <td>,250.00</td>
                <td>,531.00</td>
                <td>,000.00</td>
                <td>,781.00</td>
            </tr>
            <tr>
                <td>F002</td>
                <td>Building Fund</td>
                <td>Temporarily Restricted</td>
                <td>,000.00</td>
                <td>,000.00</td>
                <td>,550.00</td>
                <td>,450.00</td>
            </tr>
            <tr>
                <td>F003</td>
                <td>Endowment</td>
                <td>Permanently Restricted</td>
                <td>,000.00</td>
                <td>.00</td>
                <td>.00</td>
                <td>,000.00</td>
            </tr>
            <tr>
                <td>F004</td>
                <td>Program Services</td>
                <td>Temporarily Restricted</td>
                <td>,000.00</td>
                <td>,000.00</td>
                <td>,584.00</td>
                <td>,416.00</td>
            </tr>
            <tr>
                <td colspan="3" class="text-right"><strong>Totals:</strong></td>
                <td><strong>,250.00</strong></td>
                <td><strong>,531.00</strong></td>
                <td><strong>,134.00</strong></td>
                <td><strong>,647.00</strong></td>
            </tr>
        </tbody>
    </table>
;

// Main content container
const mainContent = document.getElementById('main-content');

// Function to load content based on page
function loadPage(pageId) {
    switch (pageId) {
        case 'dashboard':
            // Load the default dashboard panel (financial overview)
            loadDashboardPanel('financial-overview');
            break;
        case 'chart-of-accounts':
            mainContent.innerHTML = chartOfAccountsHTML;
            initTabs();
            break;
        case 'funds':
            mainContent.innerHTML = fundsHTML;
            break;
        case 'journal-entries':
            mainContent.innerHTML = journalEntriesHTML;
            break;
        case 'reports':
            mainContent.innerHTML = reportsHTML;
            break;
        case 'settings':
            mainContent.innerHTML = settingsHTML;
            initTabs();
            break;
        default:
            loadDashboardPanel('financial-overview');
    }
}

// Function to load dashboard panels
function loadDashboardPanel(panelId) {
    switch (panelId) {
        case 'financial-overview':
            mainContent.innerHTML = financialOverviewHTML;
            break;
        case 'recent-transactions':
            mainContent.innerHTML = recentTransactionsHTML;
            break;
        case 'unposted-entries':
            mainContent.innerHTML = unpostedEntriesHTML;
            break;
        case 'budget-analysis':
            mainContent.innerHTML = budgetAnalysisHTML;
            break;
        case 'fund-balances':
            mainContent.innerHTML = fundBalancesHTML;
            break;
        default:
            mainContent.innerHTML = financialOverviewHTML;
    }
}

// Function to initialize tab functionality
function initTabs() {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabContainer = this.closest('.tab-container');
            
            // Deactivate all tabs in this container
            tabContainer.querySelectorAll('.tab-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Activate clicked tab
            this.classList.add('active');
            
            // Hide all panels
            tabContainer.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Show selected panel
            const panelId = this.getAttribute('data-tab');
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('active');
            }
        });
    });
}

// Set up main navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        // Deactivate all nav items
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });
        
        // Activate clicked item
        this.classList.add('active');
        
        // Load the selected page
        const pageId = this.getAttribute('data-page');
        loadPage(pageId);
    });
});

// Set up sidebar navigation
document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Deactivate all sidebar items
        document.querySelectorAll('.sidebar-item').forEach(sideItem => {
            sideItem.classList.remove('active');
        });
        
        // Activate clicked item
        this.classList.add('active');
        
        // Load the selected dashboard panel
        const panelId = this.getAttribute('data-panel');
        loadDashboardPanel(panelId);
    });
});

// Initial page load
loadPage('dashboard');
