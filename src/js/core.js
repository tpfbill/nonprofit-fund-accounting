/**
 * @file core.js
 * @description Core application module for the Non-Profit Fund Accounting System.
 * This module handles the main application lifecycle, state management, and event orchestration.
 */

(function(window) {
    'use strict';

    // --- Private State and Elements ---

    const _state = {
        dbMode: false, // false = fallback, true = live DB
        currentEntityId: null,
        isConsolidatedViewActive: false,
        entities: [],
        accounts: [],
        funds: [],
        journalEntries: [],
        users: [],
        organizationSettings: {},
        customReportDefinitions: []
    };

    const _elements = {}; // To be populated by _cacheElements
    let _fundBalanceChart = null; // Holds the Chart.js instance for trends panel
    let _chartInitAttempts = 0;   // Retry counter for Chart.js init

    // --- Private Helper Functions ---

    /**
     * Centralized logging function for consistent console output.
     * @param {string} message - The message to log.
     * @param {'info'|'success'|'warn'|'error'|'step'} [type='info'] - The log type for styling.
     */
    function _log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const fullMessage = `[${timestamp}] [CORE] [${type.toUpperCase()}]: ${message}`;
        console.log(fullMessage);

        if (_elements.logOutput) {
            const p = document.createElement('p');
            p.className = `log-entry log-${type}`;
            p.textContent = fullMessage;
            _elements.logOutput.appendChild(p);
            _elements.logOutput.scrollTop = _elements.logOutput.scrollHeight;
        }
    }

    /**
     * Updates the application's global status indicator at the bottom of the page.
     * @param {string} message - The status message to display.
     * @param {'initializing'|'success'|'error'} statusType - The type of status for styling.
     */
    function _updateStatus(message, statusType) {
        if (_elements.statusIndicator) {
            _elements.statusIndicator.textContent = `Status: ${message}`;
            _elements.statusIndicator.className = `status-indicator ${statusType}`;
        }
        _log(`Status Update: ${message}`, statusType);
    }

    /**
     * Caches frequently used DOM elements for performance.
     */
    function _cacheElements() {
        _elements.logOutput = document.getElementById('log-output');
        _elements.statusIndicator = document.getElementById('init-status-indicator');
        _elements.mainNavItems = document.querySelectorAll('.nav-item[data-page]');
        _elements.pages = document.querySelectorAll('.page');
        _elements.entitySelector = document.getElementById('entity-selector');
        _elements.consolidatedViewToggle = document.getElementById('consolidated-view-toggle');

        // "Add" buttons
        _elements.btnAddAccount = document.getElementById('btnAddAccount');
        _elements.btnAddFund = document.getElementById('btnAddFund');
        _elements.btnNewJournalEntry = document.getElementById('btnNewJournalEntry');
        _elements.btnAddEntity = document.getElementById('btn-add-entity');
        _elements.btnAddUser = document.getElementById('btnAddUser');
    }

    /**
     * Registers all primary event handlers for the application.
     * This is the single source of truth for core event binding.
     */
    function _registerEventHandlers() {
        // Main Navigation
        _elements.mainNavItems.forEach(item => {
            item.addEventListener('click', () => app.navigate(item.dataset.page));
        });

        // Header Controls
        _elements.entitySelector.addEventListener('change', _handleEntityChange);
        _elements.consolidatedViewToggle.addEventListener('change', _handleConsolidatedViewToggle);

        // "Add" buttons - This directly solves the previous issues.
        // These will call functions exposed by the 'modals' module.
        if (_elements.btnAddAccount) {
            _elements.btnAddAccount.addEventListener('click', () => modals.openAccount());
        }
        if (_elements.btnAddFund) {
            _elements.btnAddFund.addEventListener('click', () => modals.openFund());
        }
        if (_elements.btnNewJournalEntry) {
            _elements.btnNewJournalEntry.addEventListener('click', () => modals.openJournalEntry());
        }
        if (_elements.btnAddEntity) {
            _elements.btnAddEntity.addEventListener('click', () => modals.openEntity());
        }
        if (_elements.btnAddUser) {
            _elements.btnAddUser.addEventListener('click', () => modals.openUser());
        }

        _log("Core event handlers registered.", "success");
    }

    /**
     * Handles the change event for the entity selector dropdown.
     */
    async function _handleEntityChange(event) {
        _state.currentEntityId = event.target.value;
        _log(`Entity changed to: ${_state.currentEntityId}`, 'info');
        // The UI module will be responsible for re-rendering tables and dashboards.
        await ui.refreshAllViews(_state);
    }

    /**
     * Handles the change event for the consolidated view toggle.
     */
    async function _handleConsolidatedViewToggle(event) {
        _state.isConsolidatedViewActive = event.target.checked;
        _log(`Consolidated view toggled to: ${_state.isConsolidatedViewActive}`, 'info');
        // The UI module will handle updating the view.
        await ui.refreshAllViews(_state);
    }

    /**
     * Generates mock fund-balance data for the given period (in days).
     * @param {number} periodDays
     * @returns {{labels:string[], data:number[]}}
     */
    function _generateMockFundBalanceData(periodDays) {
        const labels = [];
        const data = [];
        const today = new Date();
        const totalPoints = periodDays === 'all' ? 24 : periodDays; // arbitrary cap for 'all'

        for (let i = totalPoints - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
            // Random-ish mock balance; in real app calculate from journalEntries
            data.push(100000 + Math.sin(i / 3) * 5000 + Math.random() * 2000);
        }
        return { labels, data };
    }

    /**
     * Initializes the Fund Balance Trends chart and its period selector.
     */
    function _initFundBalanceChart() {
        // Ensure the chartHelpers module is available
        if (typeof chartHelpers === 'undefined' || typeof chartHelpers.initFundBalanceChart !== 'function') {
            _log('chartHelpers module not loaded. Cannot initialise fund balance chart.', 'error');
            return;
        }

        // Initialise via chartHelpers. This utility handles retries, data generation,
        // and Chart.js interaction internally, so we keep this wrapper minimal.
        chartHelpers.initFundBalanceChart('fund-balance-chart', 'fund-balance-period-select');

        _log('Fund balance trends chart initialised via chartHelpers.', 'success');
    }

    /**
     * Initializes all dashboard charts (fund balance, income/expense, distribution).
     * Wraps individual chart-specific helpers to keep `app.init` cleaner.
     */
    function _initDashboardCharts() {
        // Always attempt fund-balance chart first
        _initFundBalanceChart();

        // Guard against missing helpers
        if (typeof chartHelpers === 'undefined') {
            _log('chartHelpers module not loaded. Cannot initialise additional dashboard charts.', 'error');
            return;
        }

        // Income vs. Expense bar chart
        chartHelpers.initIncomeExpenseChart('income-expense-chart');

        // Fund distribution pie chart
        chartHelpers.initFundDistributionChart('fund-distribution-chart');

        _log('Additional dashboard charts initialised.', 'success');
    }

    // --- Public API ---

    const app = {
        /**
         * Initializes the entire application.
         * This is the main entry point.
         */
        async init() {
            _log("Application initialization started.", "step");
            try {
                _cacheElements();
                _updateStatus("Connecting to data source...", "initializing");

                // Step 1: Connect to DB and determine mode
                _state.dbMode = await db.connect();
                ui.updateDbStatusIndicator(_state.dbMode);

                // Step 2: Fetch all initial data
                _updateStatus("Fetching initial data...", "initializing");
                const dataPromises = [
                    db.fetchEntities(),
                    db.fetchAccounts(),
                    db.fetchFunds(),
                    db.fetchJournalEntries(),
                    db.fetchUsers(),
                    db.fetchOrganizationSettings()
                ];
                const [entities, accounts, funds, journalEntries, users, orgSettings] = await Promise.all(dataPromises);
                _state.entities = entities;
                _state.accounts = accounts;
                _state.funds = funds;
                _state.journalEntries = journalEntries;
                _state.users = users;
                _state.organizationSettings = orgSettings;
                _log("All initial data fetched.", "success");

                // Step 3: Initialize UI components
                _updateStatus("Initializing UI...", "initializing");
                ui.init(_state); 

                // Step 4: Register event handlers
                _registerEventHandlers();

                // Step 5: Navigate to the default page and render initial views
                _updateStatus("Rendering initial view...", "initializing");
                await this.navigate('dashboard');

                // Step 6: Initialize dashboard charts (fund balance, income/expense, distribution)
                _initDashboardCharts();

                _updateStatus("Application ready.", "success");
                _log("Application initialization complete.", "success");

            } catch (error) {
                _log(`CRITICAL ERROR during initialization: ${error.message}`, "error");
                _updateStatus(`Initialization FAILED. Check console for details.`, "error");
            }
        },

        /**
         * Navigates to a specific page in the application.
         * @param {string} pageId - The ID of the page to show (e.g., 'dashboard').
         */
        async navigate(pageId) {
            _log(`Navigating to page: ${pageId}`, 'info');

            // Hide all pages
            _elements.pages.forEach(page => page.classList.remove('active'));

            // Show the target page
            const targetPage = document.getElementById(`${pageId}-page`);
            if (targetPage) {
                targetPage.classList.add('active');
            } else {
                _log(`Page with ID "${pageId}-page" not found.`, 'error');
                return;
            }

            // Update active state in navigation
            _elements.mainNavItems.forEach(item => {
                item.classList.toggle('active', item.dataset.page === pageId);
            });

            // After navigation, refresh the views to ensure data is displayed
            await ui.refreshAllViews(_state);
        },

        /**
         * Returns a read-only copy of the current application state.
         * @returns {object} A copy of the internal state object.
         */
        getState() {
            return { ..._state };
        }
    };

    // Expose the public API to the window object
    window.app = app;

    // --- Auto-start the application ---
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof db !== 'undefined' && typeof ui !== 'undefined' && typeof modals !== 'undefined' && typeof reports !== 'undefined') {
            app.init();
        } else {
            console.error("CORE: One or more required modules (db, ui, modals, reports) are not loaded. App cannot start.");
            const statusIndicator = document.getElementById('init-status-indicator');
            if(statusIndicator) {
                statusIndicator.textContent = 'Status: Core modules failed to load. Check script tags in HTML.';
                statusIndicator.className = 'status-indicator error';
            }
        }
    });

})(window);
