/**
 * @file chart-debug.js
 * @description Debugging script for Chart.js integration in the Fund Accounting System.
 * This script helps identify issues with Chart.js loading and initialization.
 *
 *  HOW TO USE
 *  --------------------------------------------------------------------------
 *  • The debug panel starts HIDDEN by default so it will not disturb normal
 *    end-users.  Press **Alt + D** at any time to toggle its visibility.
 *  • A brief toast message is shown on page-load (only for 3 s) to remind
 *    developers that the panel is available via the shortcut.
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        debugPanelId: 'chart-debug-panel',
        chartCanvasId: 'fund-balance-chart',
        chartPeriodSelectId: 'fund-balance-period-select',
        logPrefix: '[CHART-DEBUG]'
    };

    // State tracking
    let chartJsLoaded = false;
    let canvasFound = false;
    let chartInitialized = false;
    let chartInitAttempts = 0;
    let chartErrors = [];

    /**
     * Logs debug messages to console with consistent formatting
     * @param {string} message - Message to log
     * @param {'info'|'success'|'warn'|'error'} type - Log type
     */
    function logDebug(message, type = 'info') {
        const styles = {
            info: 'color: #0066cc',
            success: 'color: #00cc66',
            warn: 'color: #ff9900',
            error: 'color: #cc0000; font-weight: bold'
        };
        
        console.log(`%c${config.logPrefix} ${message}`, styles[type]);
        
        // Also add to debug panel if it exists
        if (window.chartDebugPanel) {
            const entry = document.createElement('div');
            entry.className = `debug-entry debug-${type}`;
            entry.textContent = message;
            window.chartDebugPanel.appendChild(entry);
            window.chartDebugPanel.scrollTop = window.chartDebugPanel.scrollHeight;
        }
    }

    /**
     * Checks if Chart.js is properly loaded
     * @returns {boolean} Whether Chart.js is available
     */
    function checkChartJsLoaded() {
        if (typeof Chart !== 'undefined') {
            chartJsLoaded = true;
            logDebug(`Chart.js is loaded. Version: ${Chart.version}`, 'success');
            return true;
        } else {
            chartJsLoaded = false;
            logDebug('Chart.js is NOT loaded!', 'error');
            return false;
        }
    }

    /**
     * Checks if the chart canvas element exists in the DOM
     * @returns {boolean} Whether the canvas element exists
     */
    function checkCanvasExists() {
        const canvas = document.getElementById(config.chartCanvasId);
        if (canvas) {
            canvasFound = true;
            logDebug(`Canvas element found: #${config.chartCanvasId}`, 'success');
            
            // Check canvas dimensions
            const width = canvas.width || canvas.clientWidth;
            const height = canvas.height || canvas.clientHeight;
            logDebug(`Canvas dimensions: ${width}x${height}px`);
            
            return true;
        } else {
            canvasFound = false;
            logDebug(`Canvas element NOT found: #${config.chartCanvasId}`, 'error');
            return false;
        }
    }

    /**
     * Creates a debug panel in the UI
     */
    function createDebugPanel() {
        // Create the debug panel container
        const panel = document.createElement('div');
        panel.id = config.debugPanelId;
        panel.style.position = 'fixed';
        panel.style.bottom = '10px';
        panel.style.right = '10px';
        panel.style.width = '350px';
        panel.style.maxHeight = '200px';
        panel.style.overflowY = 'auto';
        panel.style.backgroundColor = 'rgba(0,0,0,0.8)';
        panel.style.color = '#fff';
        panel.style.padding = '10px';
        panel.style.borderRadius = '5px';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '12px';
        panel.style.zIndex = '9999';
        panel.style.display = 'none'; // Hidden by default – toggle with Alt+D
        
        // Create header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '10px';
        
        const title = document.createElement('strong');
        title.textContent = 'Chart.js Debug Panel';
        header.appendChild(title);
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'X';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = function() {
            panel.style.display = 'none';
        };
        header.appendChild(closeBtn);
        panel.appendChild(header);
        
        // Create status section
        const status = document.createElement('div');
        status.innerHTML = `
            <div>Chart.js Loaded: <span id="chart-debug-loaded">Checking...</span></div>
            <div>Canvas Found: <span id="chart-debug-canvas">Checking...</span></div>
            <div>Chart Initialized: <span id="chart-debug-init">Not yet</span></div>
        `;
        panel.appendChild(status);
        
        // Create action buttons
        const actions = document.createElement('div');
        actions.style.marginTop = '10px';
        actions.style.marginBottom = '10px';
        
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test Chart Creation';
        testBtn.style.backgroundColor = '#0066cc';
        testBtn.style.color = '#fff';
        testBtn.style.border = 'none';
        testBtn.style.padding = '5px 10px';
        testBtn.style.borderRadius = '3px';
        testBtn.style.cursor = 'pointer';
        testBtn.style.marginRight = '5px';
        testBtn.onclick = attemptManualChartCreation;
        actions.appendChild(testBtn);
        
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Log';
        clearBtn.style.backgroundColor = '#666';
        clearBtn.style.color = '#fff';
        clearBtn.style.border = 'none';
        clearBtn.style.padding = '5px 10px';
        clearBtn.style.borderRadius = '3px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.onclick = function() {
            const logs = panel.querySelectorAll('.debug-entry');
            logs.forEach(log => log.remove());
        };
        actions.appendChild(clearBtn);
        
        panel.appendChild(actions);
        
        // Create log container
        const logContainer = document.createElement('div');
        logContainer.style.borderTop = '1px solid #444';
        logContainer.style.paddingTop = '10px';
        panel.appendChild(logContainer);
        
        // Add to document
        document.body.appendChild(panel);
        
        // Store reference for later use
        window.chartDebugPanel = logContainer;
        window.chartDebugStatus = {
            loaded: document.getElementById('chart-debug-loaded'),
            canvas: document.getElementById('chart-debug-canvas'),
            init: document.getElementById('chart-debug-init')
        };
        
        logDebug('Debug panel created', 'info');
    }

    /**
     * Shows a temporary toast to tell developers about the Alt+D shortcut.
     */
    function showShortcutToast() {
        const toastId = 'chart-debug-toast';
        if (document.getElementById(toastId)) return; // already shown

        const toast = document.createElement('div');
        toast.id = toastId;
        toast.textContent = 'Chart Debug Panel available – press Alt+D';
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#323232',
            color: '#fff',
            padding: '10px 15px',
            borderRadius: '4px',
            fontSize: '12px',
            opacity: '0',
            zIndex: '10000',
            transition: 'opacity 0.4s ease'
        });
        document.body.appendChild(toast);

        // fade in
        requestAnimationFrame(() => (toast.style.opacity = '0.9'));
        // fade out then remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    /**
     * Updates the status indicators in the debug panel
     */
    function updateDebugStatus() {
        if (!window.chartDebugStatus) return;
        
        window.chartDebugStatus.loaded.textContent = chartJsLoaded ? '✅ Yes' : '❌ No';
        window.chartDebugStatus.loaded.style.color = chartJsLoaded ? '#00cc66' : '#cc0000';
        
        window.chartDebugStatus.canvas.textContent = canvasFound ? '✅ Yes' : '❌ No';
        window.chartDebugStatus.canvas.style.color = canvasFound ? '#00cc66' : '#cc0000';
        
        window.chartDebugStatus.init.textContent = chartInitialized ? '✅ Yes' : '❌ No';
        window.chartDebugStatus.init.style.color = chartInitialized ? '#00cc66' : '#cc0000';
    }

    /**
     * Attempts to manually create a chart for testing
     */
    function attemptManualChartCreation() {
        logDebug('Manual chart creation attempt started...', 'info');
        chartInitAttempts++;
        
        // Check prerequisites
        if (!checkChartJsLoaded()) {
            logDebug('Cannot create chart: Chart.js not loaded', 'error');
            return;
        }
        
        if (!checkCanvasExists()) {
            logDebug('Cannot create chart: Canvas not found', 'error');
            return;
        }
        
        try {
            const canvas = document.getElementById(config.chartCanvasId);
            const ctx = canvas.getContext('2d');
            
            // Generate some test data
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            const data = [100000, 105000, 102000, 110000, 115000, 112000];
            
            // Destroy existing chart if any
            if (window._debugChart) {
                logDebug('Destroying existing chart instance', 'info');
                window._debugChart.destroy();
            }
            
            // Create new chart
            window._debugChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Fund Balance (Test)',
                        data: data,
                        fill: false,
                        borderColor: '#1976d2',
                        backgroundColor: '#1976d2',
                        tension: 0.2
                    }]
                },
                options: {
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Test Chart (Debug)'
                        }
                    },
                    scales: {
                        x: { display: true },
                        y: { 
                            display: true,
                            beginAtZero: false
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
            
            chartInitialized = true;
            logDebug('Test chart created successfully!', 'success');
        } catch (error) {
            chartErrors.push(error);
            logDebug(`Chart creation error: ${error.message}`, 'error');
            console.error(error);
        }
        
        updateDebugStatus();
    }

    /**
     * Monitors the app's chart initialization
     */
    function monitorChartInitialization() {
        // Check for the app's chart instance
        const checkInterval = setInterval(() => {
            // Look for signs that a chart has been initialized
            if (window._fundBalanceChart) {
                clearInterval(checkInterval);
                chartInitialized = true;
                logDebug('App chart detected (_fundBalanceChart)', 'success');
                updateDebugStatus();
            }
            
            // Check if the app's initialization function has been called
            if (window.app && typeof window.app._initFundBalanceChart === 'function') {
                logDebug('App chart initialization function detected', 'info');
            }
            
            // Stop checking after 10 seconds
            if (chartInitAttempts > 20) {
                clearInterval(checkInterval);
                logDebug('Stopped monitoring chart initialization (timeout)', 'warn');
            }
            
            chartInitAttempts++;
        }, 500);
    }

    /**
     * Patches the Chart constructor to catch errors
     */
    function patchChartConstructor() {
        if (typeof Chart !== 'undefined') {
            const originalChart = Chart;
            window.Chart = function(ctx, config) {
                logDebug('Chart constructor called', 'info');
                try {
                    return new originalChart(ctx, config);
                } catch (error) {
                    chartErrors.push(error);
                    logDebug(`Chart constructor error: ${error.message}`, 'error');
                    throw error;
                }
            };
            // Copy over static properties and methods
            Object.keys(originalChart).forEach(key => {
                window.Chart[key] = originalChart[key];
            });
            logDebug('Chart constructor patched for error monitoring', 'info');
        }
    }

    /**
     * Initializes the debugging tools
     */
    function init() {
        logDebug('Chart debugging tools initializing...', 'info');
        
        // Create the debug panel
        createDebugPanel();
        
        // Check if Chart.js is loaded
        checkChartJsLoaded();
        
        // Check if canvas exists (may not be in DOM yet)
        setTimeout(checkCanvasExists, 500);
        
        // Patch Chart constructor for error monitoring
        patchChartConstructor();
        
        // Monitor chart initialization
        monitorChartInitialization();
        
        // Update status indicators
        updateDebugStatus();
        
        // Inform developers that Alt+D is available
        showShortcutToast();

        // Add keyboard shortcut to toggle debug panel
        document.addEventListener('keydown', function(event) {
            // Alt+D to toggle debug panel
            if (event.altKey && event.key === 'd') {
                const panel = document.getElementById(config.debugPanelId);
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
        
        logDebug('Chart debugging tools initialized', 'success');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose some utilities to the global scope for console debugging
    window.chartDebug = {
        checkChartJsLoaded,
        checkCanvasExists,
        attemptManualChartCreation,
        getErrors: () => chartErrors,
        getStatus: () => ({
            chartJsLoaded,
            canvasFound,
            chartInitialized,
            chartInitAttempts,
            errorCount: chartErrors.length
        })
    };
})();
