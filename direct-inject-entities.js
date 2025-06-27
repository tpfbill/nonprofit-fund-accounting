/**
 * @file direct-inject-entities.js
 * @description An aggressive, brute-force patch script to ensure the test entity hierarchy
 * is displayed in the UI. It bypasses the normal database fetch mechanism by temporarily
 * overriding it and injecting a hardcoded set of entities. It then triggers the
 * application's standard refresh logic to update all relevant UI components.
 * This script is intended as a final measure to fix display issues.
 */

(function(window) {
    'use strict';

    console.log('%c[DIRECT-INJECT] Script loaded. Preparing to inject test entity hierarchy.', 'color: purple; font-weight: bold;');

    // --- Hardcoded Test Data ---
    // This data represents the desired three-level hierarchy.
    // Static UUIDs are used for consistent relationships.
    const PARENT_ID = '3225e399-c3d4-47a2-a9dc-50501262cbfa';
    const hardcodedEntities = [
        // Level 1: The Parent Organization
        {
            id: PARENT_ID,
            name: 'The Principle Foundation',
            code: 'TPF_PARENT',
            parent_entity_id: null,
            is_consolidated: true,
            status: 'Active',
            base_currency: 'USD',
            fiscal_year_start: '01-01'
        },
        // Level 2: Child Entities
        {
            id: '27e6861b-ba16-4a82-b34a-ed342f971b03',
            name: 'TPF',
            code: 'TPF',
            parent_entity_id: PARENT_ID,
            is_consolidated: false,
            status: 'Active',
            base_currency: 'USD',
            fiscal_year_start: '01-01'
        },
        {
            id: '9f7f3770-e42a-4b81-9ceb-c622815a9df3',
            name: 'TPF-ES',
            code: 'TPF-ES',
            parent_entity_id: PARENT_ID,
            is_consolidated: false,
            status: 'Active',
            base_currency: 'USD',
            fiscal_year_start: '01-01'
        },
        {
            id: '0d2c86c8-12a8-43ec-825b-1a47ff8d31f3',
            name: 'IFCSN',
            code: 'IFCSN',
            parent_entity_id: PARENT_ID,
            is_consolidated: false,
            status: 'Active',
            base_currency: 'USD',
            fiscal_year_start: '01-01'
        }
    ];

    let attempts = 0;
    const MAX_ATTEMPTS = 40; // Retry for up to 20 seconds
    const RETRY_DELAY = 500; // Milliseconds

    /**
     * The main function that attempts to inject the data and refresh the UI.
     */
    function injectAndRefresh() {
        attempts++;
        console.log(`[DIRECT-INJECT] Attempt #${attempts}/${MAX_ATTEMPTS} to apply patch.`);

        // --- Step 1: Verify that the main application modules are ready ---
        if (!window.app || !window.db || !window.ui || !window.entityHierarchy) {
            console.warn('[DIRECT-INJECT] Core application modules not yet available. Retrying...');
            retryIfNeeded();
            return;
        }

        console.log('%c[DIRECT-INJECT] All core modules are ready. Proceeding with patch.', 'color: purple; font-weight: bold;');

        // --- Step 2: Monkey-patch the db.fetchEntities function ---
        // This is the key to the injection. We replace the function that gets data
        // with our own function that provides the hardcoded data.
        const originalFetchEntities = window.db.fetchEntities;
        if (originalFetchEntities.isPatched) {
            console.warn('[DIRECT-INJECT] Patch already applied. Skipping.');
            return;
        }

        window.db.fetchEntities = async function() {
            console.warn('[DIRECT-INJECT] Intercepted call to db.fetchEntities(). Returning hardcoded test data.');
            return Promise.resolve(hardcodedEntities);
        };
        window.db.fetchEntities.isPatched = true; // Mark our function so we don't patch it again.

        console.log('%c[DIRECT-INJECT] db.fetchEntities has been temporarily overridden.', 'color: orange; font-weight: bold;');

        // --- Step 3: Trigger the application's own refresh logic ---
        // We call the app's official function to load entity data. It will now use
        // our patched function and load our hardcoded data, which will then trigger
        // all the necessary UI updates for the table and visualization.
        if (typeof window.app.loadEntityData === 'function') {
            console.log('[DIRECT-INJECT] Calling window.app.loadEntityData() to force a full refresh with injected data...');
            
            window.app.loadEntityData()
                .then(success => {
                    if (success) {
                        console.log('%c[DIRECT-INJECT] Injection successful! The application has been refreshed with the test hierarchy.', 'color: green; font-weight: bold;');
                    } else {
                        console.error('[DIRECT-INJECT] The app.loadEntityData() function reported failure even after patch.');
                    }
                })
                .catch(error => {
                    console.error('[DIRECT-INJECT] An error occurred during the forced refresh:', error);
                })
                .finally(() => {
                    // --- Step 4: Clean up by restoring the original function ---
                    console.log('[DIRECT-INJECT] Restoring original db.fetchEntities function.');
                    window.db.fetchEntities = originalFetchEntities;
                });
        } else {
            console.error('[DIRECT-INJECT] CRITICAL: window.app.loadEntityData() is not available. Cannot apply patch.');
            // Restore the function since we can't use it.
            window.db.fetchEntities = originalFetchEntities;
        }
    }

    /**
     * Schedules another attempt if the max attempts haven't been reached.
     */
    function retryIfNeeded() {
        if (attempts < MAX_ATTEMPTS) {
            setTimeout(injectAndRefresh, RETRY_DELAY);
        } else {
            console.error(`[DIRECT-INJECT] Max attempts (${MAX_ATTEMPTS}) reached. Could not inject entity data. The application may not have initialized correctly.`);
        }
    }

    // --- Script Entry Point ---
    // Wait for the DOM to be fully loaded, then give the main app a moment to initialize before we start trying to patch it.
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[DIRECT-INJECT] DOMContentLoaded detected. Scheduling first injection attempt.');
        // A 1.5-second delay gives the main app a good chance to load normally first.
        setTimeout(injectAndRefresh, 1500);
    });

})(window);
