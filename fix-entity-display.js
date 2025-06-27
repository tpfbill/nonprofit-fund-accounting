/**
 * @file fix-entity-display.js
 * @description An aggressive client-side patch script to ensure entity data is correctly displayed.
 * This script detects if the entity table or visualization is empty after the app
 * has loaded and forcefully triggers a full refresh of all entity-related data and UI components.
 * It includes detailed logging and a retry mechanism.
 */

(function(window) {
    'use strict';

    console.log('FIX-ENTITY-DISPLAY: Script loaded. Monitoring UI state for entity display issues...');

    let attempts = 0;
    const MAX_ATTEMPTS = 30; // Retry for up to 15 seconds
    const RETRY_DELAY = 500; // Milliseconds between checks

    /**
     * The main function that checks for issues and applies fixes.
     */
    function applyFix() {
        attempts++;
        console.log(`FIX-ENTITY-DISPLAY: [Attempt #${attempts}/${MAX_ATTEMPTS}] Checking for entity display issues.`);

        // --- Step 1: Check if core application modules are ready ---
        if (!window.app || !window.ui || !window.db || !window.entityHierarchy) {
            console.warn('FIX-ENTITY-DISPLAY: Core application modules not yet available. Retrying...');
            retryIfNeeded();
            return;
        }

        // --- Step 2: Identify the UI elements to check ---
        const entitiesTableBody = document.querySelector('#entities-table tbody');
        const vizContainer = document.getElementById('entity-relationship-viz');
        const settingsEntitiesTab = document.querySelector('#settings-entities');

        // Only proceed if the "Entities" tab is visible
        if (!settingsEntitiesTab || !settingsEntitiesTab.classList.contains('active')) {
            console.log('FIX-ENTITY-DISPLAY: Entities tab is not active. No check needed at this time.');
            // We don't stop retrying, because the user might navigate to the tab later.
            retryIfNeeded();
            return;
        }

        // --- Step 3: Define the problem signature ---
        // Problem is true if the table has 0 or 1 rows (1 row could be a "loading" or "no data" placeholder).
        const isTableEmpty = !entitiesTableBody || entitiesTableBody.children.length <= 1;
        // Problem is true if the visualization container is empty or only contains a placeholder.
        const isVizEmpty = !vizContainer || vizContainer.children.length === 0 || (vizContainer.children.length === 1 && vizContainer.firstElementChild.classList.contains('preview-placeholder'));

        // --- Step 4: Check if the fix is needed ---
        if (!isTableEmpty && !isVizEmpty) {
            console.log('%cFIX-ENTITY-DISPLAY: Success! Entity display appears correct. Halting checks.', 'color: green; font-weight: bold;');
            return; // Everything looks good, stop the process.
        }

        console.warn('FIX-ENTITY-DISPLAY: DETECTED ISSUE! Entity table or visualization is empty. Forcing a full refresh.');

        // --- Step 5: Apply the aggressive fix ---
        // The most robust way to fix this is to call the app's main data loading function for entities.
        if (typeof window.app.loadEntityData === 'function') {
            console.log('%cFIX-ENTITY-DISPLAY: Executing aggressive fix: calling window.app.loadEntityData()...', 'color: orange; font-weight: bold;');
            
            window.app.loadEntityData()
                .then(success => {
                    if (success) {
                        console.log('%cFIX-ENTITY-DISPLAY: Refresh command executed successfully. The UI should now be correct.', 'color: green;');
                        // The loadEntityData function handles all UI updates internally, so no more action is needed.
                    } else {
                        console.error('FIX-ENTITY-DISPLAY: The app.loadEntityData() function reported failure.');
                    }
                })
                .catch(error => {
                    console.error('FIX-ENTITY-DISPLAY: An error occurred during the forced refresh via app.loadEntityData():', error);
                });
        } else {
            console.error('FIX-ENTITY-DISPLAY: CRITICAL! The function window.app.loadEntityData() was not found. Cannot apply the fix.');
            // Stop retrying if the function doesn't exist, as it will never work.
            return;
        }

        // The fix has been attempted. We will not retry further to avoid potential loops.
        // The success/failure is now in the hands of the `loadEntityData` function.
        console.log('FIX-ENTITY-DISPLAY: Aggressive fix has been triggered. Monitoring is now complete.');
    }

    /**
     * Schedules the next attempt if the max attempts have not been reached.
     */
    function retryIfNeeded() {
        if (attempts < MAX_ATTEMPTS) {
            setTimeout(applyFix, RETRY_DELAY);
        } else {
            console.error(`FIX-ENTITY-DISPLAY: Max attempts (${MAX_ATTEMPTS}) reached. Could not fix the entity display. There might be a deeper issue with the application initialization.`);
        }
    }

    // --- Script Entry Point ---
    // We wait for the 'DOMContentLoaded' event and then add a small delay.
    // This ensures that our script runs after all the main application scripts have had a chance to execute their own DOMContentLoaded handlers.
    document.addEventListener('DOMContentLoaded', () => {
        console.log('FIX-ENTITY-DISPLAY: DOMContentLoaded detected. Scheduling first check in 1 second.');
        // A 1-second delay is a good starting point to let the main app try to load normally.
        setTimeout(applyFix, 1000);
    });

})(window);
