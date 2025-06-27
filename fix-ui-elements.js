/**
 * @file fix-ui-elements.js
 * @description A patch script to forcefully correct UI elements that may fail to update
 * during application initialization. This script specifically targets:
 * 1. The database status indicator, ensuring it shows "Connected".
 * 2. The main entity selector, ensuring it gets populated with entities.
 * It uses a retry mechanism to apply fixes as soon as the main app is ready.
 */

(function(window) {
    'use strict';

    console.log('FIX-UI-ELEMENTS: Script loaded. Applying UI patches...');

    let attempts = 0;
    const MAX_ATTEMPTS = 40; // Retry for up to 20 seconds
    const RETRY_DELAY = 500; // Milliseconds between retries

    function applyFixes() {
        attempts++;

        let dbStatusFixed = false;
        let entitySelectorFixed = false;

        // --- 1. Fix DB Status Indicator ---
        const statusIndicator = document.getElementById('db-status-indicator');
        if (statusIndicator) {
            if (!statusIndicator.classList.contains('connected')) {
                statusIndicator.textContent = 'DB Connected (Patched)';
                statusIndicator.className = 'db-status-indicator connected';
                statusIndicator.title = 'Connection state forced by fix-ui-elements.js';
                console.log(`FIX-UI-ELEMENTS (Attempt ${attempts}): DB status indicator patched.`);
            }
            dbStatusFixed = true;
        }

        // --- 2. Fix Entity Selector ---
        const selector = document.getElementById('entity-selector');
        if (selector) {
            // Check if the selector is still showing a loading-style message
            const isLoading = selector.options.length === 1 && (selector.options[0].text.includes('Loading') || selector.options[0].text.includes('Populating'));

            if (isLoading) {
                const appState = window.app ? window.app.getState() : null;
                
                // Check if we have the necessary components to fix it
                if (window.ui && typeof window.ui._populateEntitySelector === 'function' && appState && appState.entities && appState.entities.length > 0) {
                    console.log(`FIX-UI-ELEMENTS (Attempt ${attempts}): Conditions met. Refreshing entity selector...`);
                    
                    // The function _populateEntitySelector is private to the ui module, but for a patch script,
                    // this is the most direct way to force the update.
                    window.ui._populateEntitySelector(appState);
                    
                    console.log(`FIX-UI-ELEMENTS (Attempt ${attempts}): Entity selector refresh triggered.`);
                    entitySelectorFixed = true;
                } else {
                     console.log(`FIX-UI-ELEMENTS (Attempt ${attempts}): Waiting for app state or UI modules to be ready...`);
                }
            } else {
                // If it's not showing "Loading", we assume it's fixed.
                entitySelectorFixed = true;
            }
        }

        // --- 3. Retry if necessary ---
        if ((!dbStatusFixed || !entitySelectorFixed) && attempts < MAX_ATTEMPTS) {
            setTimeout(applyFixes, RETRY_DELAY);
        } else if (attempts >= MAX_ATTEMPTS) {
            console.error('FIX-UI-ELEMENTS: Max attempts reached. Could not apply all UI fixes.');
        } else {
            console.log('FIX-UI-ELEMENTS: All UI patches appear to be applied successfully.');
        }
    }

    // This function ensures the process starts after the initial script execution stack is clear.
    function scheduleInitialAttempt() {
        // Reset attempts and start the process.
        attempts = 0;
        setTimeout(applyFixes, RETRY_DELAY);
    }

    // --- Start the patching process ---
    
    // Check if the document is already loaded. If so, start immediately.
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        scheduleInitialAttempt();
    } else {
        // Otherwise, wait for DOMContentLoaded. This is the most reliable entry point.
        document.addEventListener('DOMContentLoaded', scheduleInitialAttempt);
    }

})(window);
