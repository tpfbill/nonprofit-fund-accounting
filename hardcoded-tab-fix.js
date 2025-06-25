/**
 * Hardcoded Tab Fix - This script directly targets specific tabs without using event delegation or generic selectors.
 * It creates direct global functions and directly attaches them to the tabs in multiple ways.
 */

// Create global functions for tab switching
window.switchToSettingsUsersTab = function() {
    console.log("DIRECT TAB FIX: Switching to Users tab...");
    
    // Get all tab panels
    document.querySelectorAll('#settings-page .tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Get all tab items
    document.querySelectorAll('#settings-page .tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate the Users tab
    const usersTab = document.querySelector('[data-tab="settings-users"]');
    if (usersTab) usersTab.classList.add('active');
    
    // Activate the Users panel
    const usersPanel = document.getElementById('settings-users');
    if (usersPanel) usersPanel.classList.add('active');
    
    console.log("DIRECT TAB FIX: Users tab activated");
    return false;
};

window.switchToSettingsOrganizationTab = function() {
    console.log("DIRECT TAB FIX: Switching to Organization tab...");
    
    // Get all tab panels
    document.querySelectorAll('#settings-page .tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Get all tab items
    document.querySelectorAll('#settings-page .tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate the Organization tab
    const orgTab = document.querySelector('[data-tab="settings-organization"]');
    if (orgTab) orgTab.classList.add('active');
    
    // Activate the Organization panel
    const orgPanel = document.getElementById('settings-organization');
    if (orgPanel) orgPanel.classList.add('active');
    
    console.log("DIRECT TAB FIX: Organization tab activated");
    return false;
};

window.switchToSettingsEntitiesTab = function() {
    console.log("DIRECT TAB FIX: Switching to Entities tab...");
    
    // Get all tab panels
    document.querySelectorAll('#settings-page .tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Get all tab items
    document.querySelectorAll('#settings-page .tab-item').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activate the Entities tab
    const entitiesTab = document.querySelector('[data-tab="settings-entities"]');
    if (entitiesTab) entitiesTab.classList.add('active');
    
    // Activate the Entities panel
    const entitiesPanel = document.getElementById('settings-entities');
    if (entitiesPanel) entitiesPanel.classList.add('active');
    
    console.log("DIRECT TAB FIX: Entities tab activated");
    return false;
};

// Function to apply the hardcoded tab fix
function applyHardcodedTabFix() {
    console.log("DIRECT TAB FIX: Applying hardcoded tab fix...");
    
    // Get each specific tab
    const usersTab = document.querySelector('[data-tab="settings-users"]');
    const orgTab = document.querySelector('[data-tab="settings-organization"]');
    const entitiesTab = document.querySelector('[data-tab="settings-entities"]');
    
    // Log what we found
    console.log("DIRECT TAB FIX: Found tabs:", {
        usersTab: !!usersTab,
        orgTab: !!orgTab,
        entitiesTab: !!entitiesTab
    });
    
    // Apply direct onclick attribute and event listener for each tab
    if (usersTab) {
        usersTab.setAttribute('onclick', 'return window.switchToSettingsUsersTab();');
        usersTab.addEventListener('click', window.switchToSettingsUsersTab, true);
        console.log("DIRECT TAB FIX: Fixed Users tab");
    }
    
    if (orgTab) {
        orgTab.setAttribute('onclick', 'return window.switchToSettingsOrganizationTab();');
        orgTab.addEventListener('click', window.switchToSettingsOrganizationTab, true);
        console.log("DIRECT TAB FIX: Fixed Organization tab");
    }
    
    if (entitiesTab) {
        entitiesTab.setAttribute('onclick', 'return window.switchToSettingsEntitiesTab();');
        entitiesTab.addEventListener('click', window.switchToSettingsEntitiesTab, true);
        console.log("DIRECT TAB FIX: Fixed Entities tab");
    }
    
    console.log("DIRECT TAB FIX: Hardcoded tab fix applied");
}

// Apply the fix at multiple times to ensure it catches the elements
// Run immediately
applyHardcodedTabFix();

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', applyHardcodedTabFix);

// Run after a delay to ensure everything is loaded
setTimeout(applyHardcodedTabFix, 1000);
setTimeout(applyHardcodedTabFix, 3000);

// Create a floating control panel with buttons as a fallback
setTimeout(function() {
    console.log("DIRECT TAB FIX: Adding control panel...");
    
    // Create container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '10px';
    container.style.bottom = '60px'; // Position above the status indicator
    container.style.padding = '10px';
    container.style.background = 'rgba(0,0,0,0.7)';
    container.style.borderRadius = '4px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '5px';
    
    // Title
    const title = document.createElement('div');
    title.textContent = 'Tab Controls';
    title.style.color = 'white';
    title.style.marginBottom = '5px';
    title.style.fontWeight = 'bold';
    container.appendChild(title);
    
    // Users Tab Button
    const usersBtn = document.createElement('button');
    usersBtn.textContent = 'Users Tab';
    usersBtn.style.padding = '5px';
    usersBtn.style.cursor = 'pointer';
    usersBtn.style.backgroundColor = '#4caf50';
    usersBtn.style.color = 'white';
    usersBtn.style.border = 'none';
    usersBtn.style.borderRadius = '4px';
    usersBtn.onclick = window.switchToSettingsUsersTab;
    container.appendChild(usersBtn);
    
    // Organization Tab Button
    const orgBtn = document.createElement('button');
    orgBtn.textContent = 'Organization Tab';
    orgBtn.style.padding = '5px';
    orgBtn.style.cursor = 'pointer';
    orgBtn.style.backgroundColor = '#2196f3';
    orgBtn.style.color = 'white';
    orgBtn.style.border = 'none';
    orgBtn.style.borderRadius = '4px';
    orgBtn.onclick = window.switchToSettingsOrganizationTab;
    container.appendChild(orgBtn);
    
    // Entities Tab Button
    const entitiesBtn = document.createElement('button');
    entitiesBtn.textContent = 'Entities Tab';
    entitiesBtn.style.padding = '5px';
    entitiesBtn.style.cursor = 'pointer';
    entitiesBtn.style.backgroundColor = '#ff9800';
    entitiesBtn.style.color = 'white';
    entitiesBtn.style.border = 'none';
    entitiesBtn.style.borderRadius = '4px';
    entitiesBtn.onclick = window.switchToSettingsEntitiesTab;
    container.appendChild(entitiesBtn);
    
    // Add floating control to page
    document.body.appendChild(container);
    
    console.log("DIRECT TAB FIX: Control panel added");
}, 2000);
