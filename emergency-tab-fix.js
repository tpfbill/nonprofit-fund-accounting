/**
 * EMERGENCY TAB FIX - Complete replacement for tab functionality
 * This is the most aggressive approach possible - completely bypassing the original tab system
 */

// Wait until the page is fully loaded
window.addEventListener('load', function() {
    console.log('EMERGENCY: Window fully loaded, starting emergency tab fix');
    
    // Diagnostic info about the page
    console.log('EMERGENCY DIAGNOSTICS:');
    console.log('- Settings page exists:', !!document.getElementById('settings-page'));
    console.log('- Users panel exists:', !!document.getElementById('settings-users'));
    console.log('- Organization panel exists:', !!document.getElementById('settings-organization'));
    console.log('- Entities panel exists:', !!document.getElementById('settings-entities'));
    
    // Force the Settings page to be visible if needed
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage) {
        console.log('EMERGENCY: Found settings page, ensuring it is visible');
        settingsPage.classList.add('active');
        
        // Add a small delay to ensure the page is visible
        setTimeout(createEmergencyTabControl, 500);
    } else {
        console.log('EMERGENCY: Settings page not found! Adding observer');
        // If settings page isn't available yet, set up an observer to wait for it
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    for (const node of mutation.addedNodes) {
                        if (node.id === 'settings-page') {
                            console.log('EMERGENCY: Settings page added to DOM');
                            node.classList.add('active');
                            createEmergencyTabControl();
                            observer.disconnect();
                            return;
                        }
                    }
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Force navigation to Settings page
    const settingsNavItem = document.querySelector('.nav-item[data-page="settings"]');
    if (settingsNavItem) {
        console.log('EMERGENCY: Found settings nav item, clicking it');
        settingsNavItem.click();
    } else {
        console.log('EMERGENCY: Settings nav item not found');
    }
});

// Creates a complete replacement for the tab system
function createEmergencyTabControl() {
    console.log('EMERGENCY: Creating emergency tab control');
    
    // Find or create container for emergency controls
    let container = document.getElementById('emergency-tab-controls');
    
    if (!container) {
        // Create a styled container for the emergency tab controls
        container = document.createElement('div');
        container.id = 'emergency-tab-controls';
        container.style.margin = '20px 0';
        container.style.padding = '15px';
        container.style.backgroundColor = '#f44336';
        container.style.color = 'white';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        // Add a heading to explain the emergency controls
        const heading = document.createElement('h3');
        heading.textContent = 'EMERGENCY TAB CONTROLS';
        heading.style.marginTop = '0';
        heading.style.marginBottom = '15px';
        container.appendChild(heading);
        
        // Add explanation text
        const explanation = document.createElement('p');
        explanation.textContent = 'The normal tab navigation is not working. Please use these buttons instead:';
        explanation.style.marginBottom = '15px';
        container.appendChild(explanation);
        
        // Add button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        
        // Add buttons for each tab
        const buttons = [
            { text: 'Users', id: 'settings-users', color: '#4caf50' },
            { text: 'Organization', id: 'settings-organization', color: '#2196f3' },
            { text: 'Entities', id: 'settings-entities', color: '#ff9800' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.style.padding = '10px 20px';
            button.style.fontSize = '16px';
            button.style.backgroundColor = btn.color;
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.style.fontWeight = 'bold';
            
            // Add hover effect
            button.addEventListener('mouseover', function() {
                this.style.opacity = '0.9';
            });
            
            button.addEventListener('mouseout', function() {
                this.style.opacity = '1';
            });
            
            // Add click handler
            button.addEventListener('click', function() {
                console.log(`EMERGENCY: Button clicked for ${btn.id}`);
                showTab(btn.id);
            });
            
            buttonContainer.appendChild(button);
        });
        
        container.appendChild(buttonContainer);
        
        // Add debug info
        const debugInfo = document.createElement('details');
        debugInfo.style.marginTop = '15px';
        debugInfo.style.fontSize = '12px';
        debugInfo.style.color = 'rgba(255,255,255,0.8)';
        
        const summary = document.createElement('summary');
        summary.textContent = 'Debug Info';
        debugInfo.appendChild(summary);
        
        const debugContent = document.createElement('div');
        debugContent.id = 'emergency-debug-info';
        debugContent.style.marginTop = '10px';
        debugContent.style.whiteSpace = 'pre-wrap';
        debugContent.style.fontFamily = 'monospace';
        debugContent.style.maxHeight = '200px';
        debugContent.style.overflow = 'auto';
        debugContent.style.backgroundColor = 'rgba(0,0,0,0.3)';
        debugContent.style.padding = '10px';
        debugContent.style.borderRadius = '4px';
        
        const panelInfo = {
            'settings-users': document.getElementById('settings-users'),
            'settings-organization': document.getElementById('settings-organization'),
            'settings-entities': document.getElementById('settings-entities')
        };
        
        debugContent.textContent = `Tab Panels Found:
- Users Panel: ${!!panelInfo['settings-users']}
- Organization Panel: ${!!panelInfo['settings-organization']}
- Entities Panel: ${!!panelInfo['settings-entities']}

Classes:
- Users Panel: ${panelInfo['settings-users'] ? panelInfo['settings-users'].className : 'N/A'}
- Organization Panel: ${panelInfo['settings-organization'] ? panelInfo['settings-organization'].className : 'N/A'}
- Entities Panel: ${panelInfo['settings-entities'] ? panelInfo['settings-entities'].className : 'N/A'}`;
        
        debugInfo.appendChild(debugContent);
        container.appendChild(debugInfo);
        
        // Find where to insert emergency controls
        const settingsPage = document.getElementById('settings-page');
        
        if (!settingsPage) {
            console.error('EMERGENCY: Settings page still not found, cannot add emergency controls');
            return;
        }
        
        // Find the tab container to replace
        const tabContainer = settingsPage.querySelector('.tab-container');
        
        if (tabContainer) {
            console.log('EMERGENCY: Found tab container, replacing with emergency controls');
            // Replace the original tab menu with our emergency controls
            tabContainer.parentNode.insertBefore(container, tabContainer);
        } else {
            console.log('EMERGENCY: Tab container not found, adding emergency controls at top of settings page');
            // Add at the top of settings page
            settingsPage.insertBefore(container, settingsPage.firstChild);
        }
    }

    // Show the first tab initially
    showTab('settings-users');
    console.log('EMERGENCY: Emergency tab control created and first tab shown');
}

// Function to show a specific tab
function showTab(tabId) {
    console.log(`EMERGENCY: Showing tab ${tabId}`);
    
    // Find all tab panels
    const panels = [
        document.getElementById('settings-users'), 
        document.getElementById('settings-organization'), 
        document.getElementById('settings-entities')
    ];
    
    // Hide all panels
    panels.forEach(panel => {
        if (panel) {
            console.log(`EMERGENCY: Hiding panel ${panel.id}`);
            panel.classList.remove('active');
            panel.style.display = 'none';
        } else {
            console.log('EMERGENCY: A panel was not found!');
        }
    });
    
    // Show the selected panel
    const selectedPanel = document.getElementById(tabId);
    if (selectedPanel) {
        console.log(`EMERGENCY: Showing panel ${tabId}`);
        selectedPanel.classList.add('active');
        selectedPanel.style.display = 'block';
        
        // Update debug info
        const debugInfo = document.getElementById('emergency-debug-info');
        if (debugInfo) {
            const panelInfo = {
                'settings-users': document.getElementById('settings-users'),
                'settings-organization': document.getElementById('settings-organization'),
                'settings-entities': document.getElementById('settings-entities')
            };
            
            debugInfo.textContent = `Current Active Tab: ${tabId}

Tab Panels Status:
- Users Panel: ${panelInfo['settings-users'] ? 'Found' : 'Missing'} (Display: ${panelInfo['settings-users'] ? window.getComputedStyle(panelInfo['settings-users']).display : 'N/A'})
- Organization Panel: ${panelInfo['settings-organization'] ? 'Found' : 'Missing'} (Display: ${panelInfo['settings-organization'] ? window.getComputedStyle(panelInfo['settings-organization']).display : 'N/A'})
- Entities Panel: ${panelInfo['settings-entities'] ? 'Found' : 'Missing'} (Display: ${panelInfo['settings-entities'] ? window.getComputedStyle(panelInfo['settings-entities']).display : 'N/A'})

Classes:
- Users Panel: ${panelInfo['settings-users'] ? panelInfo['settings-users'].className : 'N/A'}
- Organization Panel: ${panelInfo['settings-organization'] ? panelInfo['settings-organization'].className : 'N/A'}
- Entities Panel: ${panelInfo['settings-entities'] ? panelInfo['settings-entities'].className : 'N/A'}`;
        }
    } else {
        console.error(`EMERGENCY: Tab panel ${tabId} not found!`);
    }
}

console.log('EMERGENCY TAB FIX: Script loaded');
