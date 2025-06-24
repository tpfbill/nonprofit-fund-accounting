/**
 * @file tab-fix.js
 * @description Fixes tab navigation functionality in the Non-Profit Fund Accounting System.
 * This module ensures that tab functionality works correctly within pages.
 */

(function(window) {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Get all tab menus
        const tabMenus = document.querySelectorAll('.tab-menu');

        // For each tab menu, set up the click handlers
        tabMenus.forEach(function(tabMenu) {
            // Get all tab items within this menu
            const tabItems = tabMenu.querySelectorAll('.tab-item');
            
            // For each tab item, set up the click handler
            tabItems.forEach(function(tabItem) {
                tabItem.addEventListener('click', function() {
                    console.log('Tab clicked:', tabItem.dataset.tab);
                    
                    // Get the tab container that contains this menu
                    const tabContainer = tabMenu.closest('.tab-container');
                    if (!tabContainer) {
                        console.error('Tab container not found for tab menu');
                        return;
                    }
                    
                    // Get all tab panels within this container
                    const tabPanels = tabContainer.querySelectorAll('.tab-panel');
                    
                    // Hide all tab panels
                    tabPanels.forEach(function(panel) {
                        panel.classList.remove('active');
                    });
                    
                    // Deactivate all tab items
                    tabItems.forEach(function(item) {
                        item.classList.remove('active');
                    });
                    
                    // Activate clicked tab item
                    tabItem.classList.add('active');
                    
                    // Activate corresponding tab panel
                    const targetTabId = tabItem.dataset.tab;
                    const targetPanel = tabContainer.querySelector(`#${targetTabId}`);
                    if (targetPanel) {
                        targetPanel.classList.add('active');
                    } else {
                        console.error(`Tab panel with ID "${targetTabId}" not found`);
                    }
                });
            });
        });

        console.log('Tab navigation functionality initialized');
    });

})(window);
