/**
 * @file direct-inject-funds.js
 * @description An aggressive, final-resort patch script to ensure the test fund data is displayed
 * in all relevant UI locations, specifically targeting both the "Funds" page and the
 * entity hierarchy visualization under the "Settings" tab. It works by overriding the core
 * data-fetching and data-building functions to inject a hardcoded list of funds.
 */

(function(window) {
    'use strict';

    // --- State and Configuration ---
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // Retry for up to 20 seconds
    const RETRY_DELAY = 500;
    let isPatched = false;

    // --- Hardcoded Test Data ---
    // These entity IDs must match the ones used in `direct-inject-entities.js`
    const TPF_ID = '27e6861b-ba16-4a82-b34a-ed342f971b03';
    const TPF_ES_ID = '9f7f3770-e42a-4b81-9ceb-c622815a9df3';
    const IFCSN_ID = '0d2c86c8-12a8-43ec-825b-1a47ff8d31f3';

    // This array contains all the funds that should be restored.
    // Both `entity_id` and `entityId` are included for compatibility.
    const hardcodedFunds = [
        // Funds for TPF
        { id: 'fund-tpf-1', entity_id: TPF_ID, entityId: TPF_ID, name: 'General Operating Fund', code: 'TPF-GEN', type: 'Unrestricted', balance: 120000, status: 'Active' },
        { id: 'fund-tpf-2', entity_id: TPF_ID, entityId: TPF_ID, name: 'Scholarship Fund', code: 'TPF-SCH', type: 'Temporarily Restricted', balance: 75000, status: 'Active' },
        // Funds for TPF-ES
        { id: 'fund-es-1', entity_id: TPF_ES_ID, entityId: TPF_ES_ID, name: 'Environmental Grants', code: 'ES-GRNT', type: 'Temporarily Restricted', balance: 250000, status: 'Active' },
        { id: 'fund-es-2', entity_id: TPF_ES_ID, entityId: TPF_ES_ID, name: 'Advocacy Fund', code: 'ES-ADV', type: 'Unrestricted', balance: 50000, status: 'Active' },
        // Funds for IFCSN
        { id: 'fund-ifcsn-1', entity_id: IFCSN_ID, entityId: IFCSN_ID, name: 'Community Support', code: 'IFCSN-COM', type: 'Unrestricted', balance: 95000, status: 'Active' },
        { id: 'fund-ifcsn-2', entity_id: IFCSN_ID, entityId: IFCSN_ID, name: 'Special Projects', code: 'IFCSN-SP', type: 'Permanently Restricted', balance: 150000, status: 'Active' }
    ];

    /**
     * A simple, styled logger for this script.
     */
    function log(message, level = 'info') {
        const styles = {
            info: 'color: #0000CD; font-weight: bold;',
            warn: 'color: #FFA500; font-weight: bold;',
            error: 'color: #B22222; font-weight: bold;',
            success: 'color: #2E8B57; font-weight: bold;'
        };
        console.log(`%c[INJECT-FUNDS] ${message}`, styles[level]);
    }

    /**
     * The main function that applies patches and triggers a UI refresh.
     */
    async function injectAndRefresh() {
        if (isPatched) {
            log('Patch has already been applied. Halting.', 'warn');
            return;
        }

        attempts++;
        log(`Attempt #${attempts}/${MAX_ATTEMPTS} to apply fund injection patch.`);

        // --- Step 1: Verify that all necessary application modules are ready ---
        if (!window.app || !window.db || !window.ui || !window.entityHierarchy) {
            log('Core application modules not yet available. Retrying...', 'warn');
            retryIfNeeded();
            return;
        }

        log('All core modules are ready. Proceeding with fund injection.', 'success');

        // --- Step 2: Patch the primary fund data source (`db.fetchFunds`) ---
        // This ensures that any part of the app asking for funds gets our list.
        const originalFetchFunds = window.db.fetchFunds;
        window.db.fetchFunds = async function() {
            log('Intercepted call to db.fetchFunds(). Returning hardcoded test funds.', 'warn');
            return Promise.resolve(hardcodedFunds);
        };

        // --- Step 3: Patch the hierarchy data builder (`entityHierarchy.buildHierarchyData`) ---
        // This is the most critical step for the visualization. We ensure that when the
        // visualization is built, it uses our hardcoded fund list.
        const originalBuildHierarchy = window.entityHierarchy.buildHierarchyData;
        window.entityHierarchy.buildHierarchyData = function(entities, funds) {
            log('Intercepted call to entityHierarchy.buildHierarchyData(). Forcing use of hardcoded funds.', 'warn');
            // We call the original function but replace its `funds` argument with our own list.
            return originalBuildHierarchy.call(this, entities, hardcodedFunds);
        };

        isPatched = true; // Mark as patched to prevent this from running again.
        log('Patched `db.fetchFunds` and `entityHierarchy.buildHierarchyData` successfully.', 'success');

        // --- Step 4: Trigger a global refresh ---
        // Calling `app.loadEntityData()` is the official way to tell the app to reload
        // all entity-related information, which will now use our patched functions.
        if (typeof window.app.loadEntityData === 'function') {
            log('Calling window.app.loadEntityData() to force a full UI refresh with injected data...');
            try {
                await window.app.loadEntityData();
                log('Global refresh triggered successfully. Funds should now appear everywhere.', 'success');
            } catch (error) {
                log(`An error occurred during the forced refresh: ${error.message}`, 'error');
            }
        } else {
            log('The `app.loadEntityData` function is not available. Cannot trigger refresh.', 'error');
        }
    }

    /**
     * Schedules another attempt if the max attempts haven't been reached.
     */
    function retryIfNeeded() {
        if (attempts < MAX_ATTEMPTS) {
            setTimeout(injectAndRefresh, RETRY_DELAY);
        } else {
            log(`Max attempts (${MAX_ATTEMPTS}) reached. Could not inject fund data.`, 'error');
        }
    }

    // --- Script Entry Point ---
    // Wait for the DOM to be fully loaded, then give the main app a moment to initialize.
    document.addEventListener('DOMContentLoaded', () => {
        log('DOMContentLoaded detected. Scheduling first injection attempt.');
        // A 2-second delay gives other injectors and the main app time to run.
        setTimeout(injectAndRefresh, 2000);
    });

})(window);
