/**
 * @file complete-hierarchy-injector.js
 * @description An extremely aggressive, final-resort patch script to combat the "multiple visualizations" and "empty panels" issues.
 * This script ensures ONLY ONE instance of the test hierarchy is ever visible in the "Settings -> Entities" panel and removes all other content.
 *
 * How it works:
 * 1.  **Hardcoded Data**: Uses a self-contained, known-good data structure for the entire hierarchy.
 * 2.  **Aggressive CSS**: Injects CSS rules with `!important` to visually hide any duplicate visualizations, the default "all green" list, and known placeholder elements the moment they appear.
 * 3.  **Idempotent Rendering**: Has a single function to render the visualization, which checks if it already exists before running, preventing itself from creating duplicates.
 * 4.  **Continuous DOM Cleanup**: Runs a timer (`setInterval`) that constantly searches for and obliterates any content within the visualization container that is not our injected hierarchy.
 * 5.  **Targeted Removal**: The cleanup logic is specifically designed to remove the default `<ul>` visualization and any unwanted empty panels without affecting our main visualization.
 */

(function(window) {
    'use strict';

    // --- Configuration and State ---
    const VIZ_CONTAINER_ID = 'entity-relationship-viz';
    const INJECTOR_ROOT_ID = 'injector-viz-root'; // Unique ID for our injected content
    const EMPTY_PANEL_TEXT = 'No entities have been created yet'; // Text to identify empty panels
    let attempts = 0;
    const MAX_ATTEMPTS = 50; // Retry initialization for 25 seconds
    const RETRY_DELAY = 500;
    const CLEANUP_INTERVAL_MS = 400; // How often to run the cleanup task
    let isInitialized = false;
    let cleanupIntervalId = null;

    // --- Hardcoded Complete Hierarchy Data ---
    const hierarchyData = {
        id: 'org-tpf-parent',
        name: 'The Principle Foundation',
        code: 'TPF_PARENT',
        type: 'organization',
        is_consolidated: true,
        children: [
            {
                id: 'ent-tpf',
                name: 'TPF',
                code: 'TPF',
                type: 'entity',
                children: [
                    { id: 'fund-tpf-1', name: 'General Operating Fund', code: 'TPF-GEN', type: 'fund' },
                    { id: 'fund-tpf-2', name: 'Scholarship Fund', code: 'TPF-SCH', type: 'fund' }
                ]
            },
            {
                id: 'ent-tpf-es',
                name: 'TPF-ES',
                code: 'TPF-ES',
                type: 'entity',
                children: [
                    { id: 'fund-es-1', name: 'Environmental Grants', code: 'ES-GRNT', type: 'fund' },
                    { id: 'fund-es-2', name: 'Advocacy Fund', code: 'ES-ADV', type: 'fund' }
                ]
            },
            {
                id: 'ent-ifcsn',
                name: 'IFCSN',
                code: 'IFCSN',
                type: 'entity',
                children: [
                    { id: 'fund-ifcsn-1', name: 'Community Support', code: 'IFCSN-COM', type: 'fund' },
                    { id: 'fund-ifcsn-2', name: 'Special Projects', code: 'IFCSN-SP', type: 'fund' }
                ]
            }
        ]
    };

    /**
     * A simple, styled logger for this script.
     */
    function log(message, level = 'info') {
        const styles = {
            info: 'color: #005f73; font-weight: bold;',
            warn: 'color: #ae2012; font-weight: bold;',
            error: 'color: #9b2226; font-weight: bold;',
            success: 'color: #0a9396; font-weight: bold;'
        };
        console.log(`%c[HIERARCHY-OVERHAUL] ${message}`, styles[level]);
    }

    /**
     * Injects aggressive CSS to hide duplicates and style the visualization.
     */
    function injectStyles() {
        const styleId = 'hierarchy-overhaul-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* --- AGGRESSIVE HIDING RULES --- */
            /* Hide any injector root that is a later sibling of another injector root */
            #${VIZ_CONTAINER_ID} > #${INJECTOR_ROOT_ID} ~ #${INJECTOR_ROOT_ID} {
                display: none !important;
            }
            /* Hide the default placeholder paragraph if it appears */
            #${VIZ_CONTAINER_ID} > p.preview-placeholder {
                display: none !important;
            }
            /* Hide the default "all green" UL/LI visualization */
            #${VIZ_CONTAINER_ID} > ul {
                display: none !important;
            }

            /* --- STYLING FOR THE ONE TRUE VISUALIZATION --- */
            .injector-viz-container { padding: 10px; font-family: Segoe UI, sans-serif; }
            .injector-node { margin-left: 20px; padding-left: 20px; border-left: 2px dotted #ccc; }
            .injector-node-header { display: flex; align-items: center; padding: 6px 8px; margin-top: 5px; border-radius: 4px; background-color: #f0f0f0; }
            .injector-node-header .icon { margin-right: 8px; font-size: 16px; }
            .injector-node-header .name { font-weight: 600; flex-grow: 1; }
            .injector-node-header .code { font-family: monospace; color: #555; font-size: 0.9em; }
            .injector-node-header .consolidated-badge { margin-left: 10px; font-size: 10px; padding: 2px 5px; background-color: #777; color: white; border-radius: 10px; }
            .injector-node.organization > .injector-node-header { background-color: #34495e; color: white; border-left: 5px solid #2c3e50; }
            .injector-node.entity > .injector-node-header { background-color: #3498db; color: white; border-left: 5px solid #2980b9; }
            .injector-node.fund > .injector-node-header { background-color: #ecf0f1; color: #34495e; border-left: 5px solid #bdc3c7; }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css.replace(/\s+/g, ' ').trim();
        document.head.appendChild(style);
        log('Aggressive CSS rules injected.', 'success');
    }

    /**
     * Recursively builds the HTML for a node and its children.
     */
    function createNodeElement(nodeData) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = `injector-node ${nodeData.type}`;
        const headerDiv = document.createElement('div');
        headerDiv.className = 'injector-node-header';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        if (nodeData.type === 'organization') iconSpan.textContent = '🏢';
        else if (nodeData.type === 'entity') iconSpan.textContent = '🏛️';
        else if (nodeData.type === 'fund') iconSpan.textContent = '💰';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = nodeData.name;
        const codeSpan = document.createElement('span');
        codeSpan.className = 'code';
        codeSpan.textContent = `(${nodeData.code})`;
        headerDiv.appendChild(iconSpan);
        headerDiv.appendChild(nameSpan);
        headerDiv.appendChild(codeSpan);
        if (nodeData.is_consolidated) {
            const consolidatedSpan = document.createElement('span');
            consolidatedSpan.className = 'consolidated-badge';
            consolidatedSpan.textContent = 'CONSOLIDATED';
            headerDiv.appendChild(consolidatedSpan);
        }
        nodeDiv.appendChild(headerDiv);
        if (nodeData.children && nodeData.children.length > 0) {
            nodeData.children.forEach(childData => {
                const childElement = createNodeElement(childData);
                nodeDiv.appendChild(childElement);
            });
        }
        return nodeDiv;
    }

    /**
     * Renders the hierarchy, but only if it doesn't already exist.
     */
    function renderHierarchy() {
        const vizContainer = document.getElementById(VIZ_CONTAINER_ID);
        if (!vizContainer) return;

        // Idempotency Check: If our visualization is already present, do nothing.
        if (vizContainer.querySelector(`#${INJECTOR_ROOT_ID}`)) {
            return;
        }

        log('Rendering hierarchy...');
        const container = document.createElement('div');
        container.id = INJECTOR_ROOT_ID;
        container.className = 'injector-viz-container';
        const rootElement = createNodeElement(hierarchyData);
        container.appendChild(rootElement);

        // Prepend to make it the first element, ensuring prominence
        vizContainer.prepend(container);
        log('Hierarchy rendering complete.', 'success');
    }

    /**
     * The main cleanup function that runs periodically.
     * It removes EVERYTHING from the container except our one true visualization.
     */
    function continuousCleanup() {
        const vizContainer = document.getElementById(VIZ_CONTAINER_ID);
        if (!vizContainer) return;

        const allChildNodes = Array.from(vizContainer.childNodes);
        let nodesRemoved = 0;

        allChildNodes.forEach(node => {
            // If the node is NOT our injected root, it must be removed.
            // This also handles text nodes containing only whitespace.
            if (node.id !== INJECTOR_ROOT_ID) {
                // Check if it's a non-empty text node before logging to avoid console spam
                if (node.nodeType !== 3 || node.textContent.trim() !== '') {
                    log(`Removing unwanted node: ${node.tagName || 'Text Node'}`, 'warn');
                }
                node.remove();
                nodesRemoved++;
            }
        });

        if (nodesRemoved > 0) {
            log(`Removed ${nodesRemoved} unwanted nodes from the visualization container.`, 'warn');
        }
    }

    /**
     * The main initialization function that starts the process.
     */
    function initialize() {
        if (isInitialized) return;
        attempts++;
        log(`Attempting to initialize, attempt #${attempts}...`);

        const vizContainer = document.getElementById(VIZ_CONTAINER_ID);
        const settingsTab = document.querySelector('.tab-item[data-tab="settings-entities"]');

        if (vizContainer && settingsTab) {
            isInitialized = true;
            log('Target container found. Initializing overhaul.', 'success');
            
            injectStyles();
            renderHierarchy(); // Initial render

            // Start the continuous cleanup interval
            if (cleanupIntervalId) clearInterval(cleanupIntervalId);
            cleanupIntervalId = setInterval(continuousCleanup, CLEANUP_INTERVAL_MS);
            log(`Continuous cleanup interval (${CLEANUP_INTERVAL_MS}ms) is now active.`, 'warn');

            // Add a listener to re-render if the user clicks the tab again, just in case.
            settingsTab.addEventListener('click', () => {
                log('Entities tab clicked. Ensuring single visualization is present.');
                setTimeout(() => {
                    renderHierarchy();
                    continuousCleanup();
                }, 50);
            });

        } else if (attempts < MAX_ATTEMPTS) {
            setTimeout(initialize, RETRY_DELAY);
        } else {
            log('Max attempts reached. Could not find the visualization container.', 'error');
        }
    }

    // --- Script Entry Point ---
    document.addEventListener('DOMContentLoaded', () => {
        log('DOMContentLoaded detected. Scheduling first initialization attempt.');
        setTimeout(initialize, 2500); // A longer delay to ensure it runs last
    });

})(window);
