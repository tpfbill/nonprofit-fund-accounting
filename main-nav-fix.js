/**
 * MAIN NAVIGATION FIX - Direct replacement for main navigation functionality
 * This script fixes the six primary tabs: Dashboard, Chart of Accounts, Funds, Journal Entries, Reports, Settings
 */

// Create global functions for main navigation
window.showDashboardPage = function() {
    switchMainTab('dashboard');
    return false;
};

window.showChartOfAccountsPage = function() {
    switchMainTab('chart-of-accounts');
    return false;
};

window.showFundsPage = function() {
    switchMainTab('funds');
    return false;
};

window.showJournalEntriesPage = function() {
    switchMainTab('journal-entries');
    return false;
};

window.showReportsPage = function() {
    switchMainTab('reports');
    return false;
};

window.showSettingsPage = function() {
    switchMainTab('settings');
    return false;
};

// Main function to switch tabs
function switchMainTab(pageName) {
    console.log(`MAIN NAV: Switching to ${pageName} page`);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    // Show the selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
        console.log(`MAIN NAV: ${pageName}-page is now active and visible`);
    } else {
        console.error(`MAIN NAV: Could not find ${pageName}-page`);
    }
    
    // Update the active state in the navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
        console.log(`MAIN NAV: ${pageName} navigation item is now active`);
    } else {
        console.error(`MAIN NAV: Could not find nav item for ${pageName}`);
    }
    
    // Special handling for settings page
    if (pageName === 'settings') {
        // Make sure the emergency tab controls are visible
        setTimeout(() => {
            const emergencyControls = document.getElementById('emergency-tab-controls');
            if (emergencyControls) {
                console.log('MAIN NAV: Emergency tab controls found in settings page');
            } else {
                console.log('MAIN NAV: Emergency tab controls not found, may need to be initialized');
                // If we have the emergency tab function available, call it
                if (typeof createEmergencyTabControl === 'function') {
                    createEmergencyTabControl();
                }
            }
        }, 100);
    }
}

// Function to fix the main navigation
function fixMainNavigation() {
    console.log('MAIN NAV: Fixing main navigation...');
    
    // Get all nav items
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`MAIN NAV: Found ${navItems.length} navigation items`);
    
    // Direct mapping of navigation functions
    const navFunctions = {
        'dashboard': window.showDashboardPage,
        'chart-of-accounts': window.showChartOfAccountsPage,
        'funds': window.showFundsPage,
        'journal-entries': window.showJournalEntriesPage,
        'reports': window.showReportsPage,
        'settings': window.showSettingsPage
    };
    
    // Apply direct onclick handlers to each nav item
    navItems.forEach(item => {
        const pageName = item.getAttribute('data-page');
        if (pageName && navFunctions[pageName]) {
            // Add direct attribute
            item.setAttribute('onclick', `return window.show${pageName.replace(/-([a-z])/g, g => g[1].toUpperCase())}Page()`);
            
            // Add event listener
            item.addEventListener('click', navFunctions[pageName], true);
            
            console.log(`MAIN NAV: Fixed ${pageName} navigation item`);
        } else {
            console.error(`MAIN NAV: Could not fix navigation item for ${pageName || 'unknown'}`);
        }
    });
    
    // Add floating control panel for main navigation as well
    setTimeout(() => {
        // Create a control panel for main navigation
        const container = document.createElement('div');
        container.id = 'main-nav-controls';
        container.style.position = 'fixed';
        container.style.right = '10px';
        container.style.top = '60px';
        container.style.padding = '10px';
        container.style.backgroundColor = 'rgba(0,0,128,0.8)';
        container.style.borderRadius = '4px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '5px';
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'MAIN NAVIGATION';
        title.style.color = 'white';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '5px';
        container.appendChild(title);
        
        // Add navigation buttons
        const buttons = [
            { text: 'Dashboard', id: 'dashboard', color: '#4caf50' },
            { text: 'Chart of Accounts', id: 'chart-of-accounts', color: '#2196f3' },
            { text: 'Funds', id: 'funds', color: '#ff9800' },
            { text: 'Journal Entries', id: 'journal-entries', color: '#9c27b0' },
            { text: 'Reports', id: 'reports', color: '#f44336' },
            { text: 'Settings', id: 'settings', color: '#607d8b' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.style.padding = '5px';
            button.style.margin = '2px 0';
            button.style.backgroundColor = btn.color;
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '12px';
            
            button.addEventListener('click', () => {
                if (navFunctions[btn.id]) {
                    navFunctions[btn.id]();
                }
            });
            
            container.appendChild(button);
        });
        
        document.body.appendChild(container);
        console.log('MAIN NAV: Added floating control panel for main navigation');
    }, 1000);
    
    console.log('MAIN NAV: Main navigation fixed');
}

// Run the fix on various lifecycle events
document.addEventListener('DOMContentLoaded', fixMainNavigation);
window.addEventListener('load', fixMainNavigation);
setTimeout(fixMainNavigation, 1000); // Backup timeout

// Initialize the page based on URL or default to dashboard
function initializePage() {
    console.log('MAIN NAV: Initializing page...');
    
    // Check URL for page fragment
    let pageName = 'dashboard'; // Default page
    
    // Get the page from URL if available
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
        const requestedPage = hash.substring(1);
        if (document.getElementById(`${requestedPage}-page`)) {
            pageName = requestedPage;
            console.log(`MAIN NAV: Found page in URL: ${pageName}`);
        }
    }
    
    // Switch to the initial page
    switchMainTab(pageName);
}

// Initialize the page once everything is ready
setTimeout(initializePage, 500);

console.log('MAIN NAV FIX: Script loaded');
