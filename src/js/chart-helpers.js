/**
 * @file chart-helpers.js
 * @description Helper module for Chart.js integration in the Non-Profit Fund Accounting System.
 * Provides utilities for chart creation, data generation, and chart management.
 */

(function(window) {
    'use strict';

    // --- Private Variables ---
    
    // Store chart instances for management
    const _charts = {
        fundBalance: null,
        incomeExpense: null,
        fundDistribution: null
    };

    // Default chart colors
    const _colors = {
        primary: '#1976d2',
        secondary: '#03a9f4',
        success: '#4caf50',
        warning: '#ff9800',
        danger: '#f44336',
        info: '#00bcd4',
        light: '#e0e0e0',
        dark: '#616161'
    };

    // Default chart options by type
    const _defaultOptions = {
        line: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    display: true,
                    title: { display: false }
                },
                y: {
                    display: true,
                    title: { display: false },
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                notation: 'compact'
                            }).format(value);
                        }
                    }
                }
            }
        },
        pie: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const formattedValue = new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
                            }).format(value);
                            return `${label}: ${formattedValue}`;
                        }
                    }
                }
            }
        },
        bar: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { display: true },
                y: {
                    display: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                notation: 'compact'
                            }).format(value);
                        }
                    }
                }
            }
        }
    };

    // --- Private Helper Functions ---

    /**
     * Logs messages with consistent formatting.
     * @param {string} message - Message to log
     * @param {'info'|'success'|'warn'|'error'} type - Log type
     */
    function _log(message, type = 'info') {
        console.log(`[CHART] [${type.toUpperCase()}]: ${message}`);
    }

    /**
     * Checks if Chart.js is available in the global scope.
     * @returns {boolean} Whether Chart.js is loaded
     */
    function _isChartJsLoaded() {
        return typeof Chart !== 'undefined';
    }

    /**
     * Waits for Chart.js to be loaded and available on the page.
     * Polls every 100 ms (default) and times-out after 5 seconds.
     * @param {number} [timeoutMs=5000]  Maximum time to wait
     * @param {number} [intervalMs=100]  Poll interval
     * @returns {Promise<void>} Resolves once Chart is available (or on timeout)
     */
    function _waitForChartJs(timeoutMs = 5000, intervalMs = 100) {
        if (_isChartJsLoaded()) return Promise.resolve();

        return new Promise(resolve => {
            const start = Date.now();
            const timer = setInterval(() => {
                if (_isChartJsLoaded() || Date.now() - start >= timeoutMs) {
                    clearInterval(timer);
                    if (_isChartJsLoaded()) {
                        _log('Chart.js detected after waiting.', 'success');
                    } else {
                        _log('Chart.js did not load within timeout.', 'warn');
                    }
                    resolve();
                }
            }, intervalMs);
        });
    }

    /**
     * Checks if a canvas element exists and is ready for drawing.
     * @param {string|HTMLCanvasElement} canvas - Canvas element or ID
     * @returns {HTMLCanvasElement|null} The canvas element or null if not ready
     */
    function _getCanvasContext(canvas) {
        const canvasElement = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
        
        if (!canvasElement) {
            _log(`Canvas element not found: ${typeof canvas === 'string' ? canvas : 'provided element'}`, 'error');
            return null;
        }
        
        if (!canvasElement.getContext) {
            _log('Canvas context not available', 'error');
            return null;
        }
        
        return canvasElement;
    }

    /**
     * Destroys an existing chart instance if it exists.
     * @param {Chart|null} chart - Chart instance to destroy
     */
    function _destroyChart(chart) {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    }

    /**
     * Generates mock fund balance data for the given period.
     * @param {number|string} periodDays - Number of days or 'all'
     * @returns {{labels: string[], data: number[]}} Labels and data arrays
     */
    function _generateMockFundBalanceData(periodDays) {
        const labels = [];
        const data = [];
        const today = new Date();
        const totalPoints = periodDays === 'all' ? 24 : parseInt(periodDays, 10);

        for (let i = totalPoints - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
            
            // Generate realistic-looking mock data with an upward trend and some fluctuations
            const baseValue = 100000;
            const trend = i * 500; // Gradual increase over time
            const seasonal = Math.sin(i / 3) * 5000; // Periodic fluctuation
            const random = Math.random() * 2000; // Random noise
            
            data.push(baseValue + trend + seasonal + random);
        }
        
        return { labels, data };
    }

    /**
     * Generates mock income vs expense data for a given period.
     * @param {number|string} periodMonths - Number of months or 'all'
     * @returns {{labels: string[], datasets: Array}} Chart.js compatible datasets
     */
    function _generateMockIncomeExpenseData(periodMonths) {
        const labels = [];
        const incomeData = [];
        const expenseData = [];
        const today = new Date();
        const totalPoints = periodMonths === 'all' ? 12 : parseInt(periodMonths, 10);
        
        // Start from months ago and move forward to current month
        for (let i = totalPoints - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setMonth(d.getMonth() - i);
            
            // Format as MMM YYYY (e.g., "Jan 2025")
            const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            labels.push(monthYear);
            
            // Generate income data (higher in certain months)
            const baseIncome = 25000;
            const seasonalIncome = Math.sin((d.getMonth() + 1) / 12 * Math.PI * 2) * 10000; // Seasonal pattern
            const randomIncome = Math.random() * 5000;
            incomeData.push(baseIncome + seasonalIncome + randomIncome);
            
            // Generate expense data (more consistent but still varies)
            const baseExpense = 20000;
            const seasonalExpense = Math.sin((d.getMonth() + 7) / 12 * Math.PI * 2) * 5000; // Offset seasonal pattern
            const randomExpense = Math.random() * 3000;
            expenseData.push(baseExpense + seasonalExpense + randomExpense);
        }
        
        return {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: _colors.success,
                    borderColor: _colors.success,
                    borderWidth: 2
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: _colors.danger,
                    borderColor: _colors.danger,
                    borderWidth: 2
                }
            ]
        };
    }

    /**
     * Generates mock fund distribution data.
     * @returns {{labels: string[], data: number[], backgroundColor: string[]}} Chart.js compatible data
     */
    function _generateMockFundDistributionData() {
        const fundNames = [
            'General Operating',
            'Building Fund',
            'Endowment',
            'Program Services',
            'Emergency Reserve'
        ];
        
        const data = [
            125000,  // General Operating
            45000,   // Building Fund
            85000,   // Endowment
            37000,   // Program Services
            18000    // Emergency Reserve
        ];
        
        const backgroundColor = [
            _colors.primary,
            _colors.secondary,
            _colors.success,
            _colors.warning,
            _colors.info
        ];
        
        return {
            labels: fundNames,
            data,
            backgroundColor
        };
    }

    // --- Public API ---

    const chartHelpers = {
        /**
         * Initializes a fund balance trend chart.
         * @param {string|HTMLCanvasElement} canvasId - Canvas element or ID
         * @param {string|HTMLSelectElement} periodSelectId - Period select element or ID
         * @param {object} [options] - Additional chart options to merge with defaults
         * @returns {Chart|null} The created Chart instance or null if failed
         */
        initFundBalanceChart(canvasId, periodSelectId, options = {}) {
            if (!_isChartJsLoaded()) {
                _log('Chart.js not yet loaded. Waiting before initialising fund balance chart…', 'info');
                _waitForChartJs().then(() =>
                    chartHelpers.initFundBalanceChart(canvasId, periodSelectId, options)
                );
                return null;
            }
            
            const canvas = _getCanvasContext(canvasId);
            if (!canvas) return null;
            
            const periodSelect = typeof periodSelectId === 'string' 
                ? document.getElementById(periodSelectId) 
                : periodSelectId;
                
            if (!periodSelect) {
                _log(`Period select element not found: ${periodSelectId}`, 'error');
                return null;
            }
            
            // Destroy existing chart if any
            _destroyChart(_charts.fundBalance);
            
            /**
             * Inner helper to (re)draw chart for selected period.
             */
            const drawChart = () => {
                const period = periodSelect.value;
                const { labels, data } = _generateMockFundBalanceData(period);
                
                // If chart already exists, update it
                if (_charts.fundBalance) {
                    _charts.fundBalance.data.labels = labels;
                    _charts.fundBalance.data.datasets[0].data = data;
                    _charts.fundBalance.update();
                    return;
                }
                
                // Create new chart
                _charts.fundBalance = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Fund Balance',
                            data,
                            fill: false,
                            borderColor: _colors.primary,
                            backgroundColor: _colors.primary,
                            tension: 0.2
                        }]
                    },
                    options: {
                        ..._defaultOptions.line,
                        ...options
                    }
                });
            };
            
            // Initial draw
            requestAnimationFrame(drawChart);
            
            // Update on period change
            periodSelect.addEventListener('change', drawChart);
            
            _log('Fund balance chart initialized', 'success');
            return _charts.fundBalance;
        },
        
        /**
         * Initializes an income vs expense chart.
         * @param {string|HTMLCanvasElement} canvasId - Canvas element or ID
         * @param {string|HTMLSelectElement} [periodSelectId] - Optional period select element or ID
         * @param {object} [options] - Additional chart options to merge with defaults
         * @returns {Chart|null} The created Chart instance or null if failed
         */
        initIncomeExpenseChart(canvasId, periodSelectId = null, options = {}) {
            if (!_isChartJsLoaded()) {
                _log('Chart.js not yet loaded. Waiting before initialising income/expense chart…', 'info');
                _waitForChartJs().then(() =>
                    chartHelpers.initIncomeExpenseChart(canvasId, periodSelectId, options)
                );
                return null;
            }
            
            const canvas = _getCanvasContext(canvasId);
            if (!canvas) return null;
            
            // Destroy existing chart if any
            _destroyChart(_charts.incomeExpense);
            
            const drawChart = (period = 12) => {
                const chartData = _generateMockIncomeExpenseData(period);
                
                // If chart already exists, update it
                if (_charts.incomeExpense) {
                    _charts.incomeExpense.data.labels = chartData.labels;
                    _charts.incomeExpense.data.datasets = chartData.datasets;
                    _charts.incomeExpense.update();
                    return;
                }
                
                // Create new chart
                _charts.incomeExpense = new Chart(canvas, {
                    type: 'bar',
                    data: chartData,
                    options: {
                        ..._defaultOptions.bar,
                        ...options
                    }
                });
            };
            
            // Initial draw
            requestAnimationFrame(() => drawChart());
            
            // Set up period selector if provided
            if (periodSelectId) {
                const periodSelect = typeof periodSelectId === 'string' 
                    ? document.getElementById(periodSelectId) 
                    : periodSelectId;
                    
                if (periodSelect) {
                    periodSelect.addEventListener('change', () => drawChart(periodSelect.value));
                }
            }
            
            _log('Income vs expense chart initialized', 'success');
            return _charts.incomeExpense;
        },
        
        /**
         * Initializes a fund distribution pie chart.
         * @param {string|HTMLCanvasElement} canvasId - Canvas element or ID
         * @param {object} [options] - Additional chart options to merge with defaults
         * @returns {Chart|null} The created Chart instance or null if failed
         */
        initFundDistributionChart(canvasId, options = {}) {
            if (!_isChartJsLoaded()) {
                _log('Chart.js not yet loaded. Waiting before initialising fund distribution chart…', 'info');
                _waitForChartJs().then(() =>
                    chartHelpers.initFundDistributionChart(canvasId, options)
                );
                return null;
            }
            
            const canvas = _getCanvasContext(canvasId);
            if (!canvas) return null;
            
            // Destroy existing chart if any
            _destroyChart(_charts.fundDistribution);
            
            // Get mock data
            const { labels, data, backgroundColor } = _generateMockFundDistributionData();
            
            // Create new chart
            _charts.fundDistribution = new Chart(canvas, {
                type: 'pie',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor,
                        borderWidth: 1,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    ..._defaultOptions.pie,
                    ...options
                }
            });
            
            _log('Fund distribution chart initialized', 'success');
            return _charts.fundDistribution;
        },
        
        /**
         * Creates a custom chart with the specified configuration.
         * @param {string|HTMLCanvasElement} canvasId - Canvas element or ID
         * @param {string} type - Chart type ('line', 'bar', 'pie', etc.)
         * @param {object} data - Chart data configuration
         * @param {object} [options] - Chart options
         * @returns {Chart|null} The created Chart instance or null if failed
         */
        createChart(canvasId, type, data, options = {}) {
            if (!_isChartJsLoaded()) {
                _log('Chart.js not yet loaded. Waiting before creating custom chart…', 'info');
                _waitForChartJs().then(() =>
                    chartHelpers.createChart(canvasId, type, data, options)
                );
                return null;
            }
            
            const canvas = _getCanvasContext(canvasId);
            if (!canvas) return null;
            
            // Get default options for this chart type if available
            const defaultOpts = _defaultOptions[type] || {};
            
            try {
                const chart = new Chart(canvas, {
                    type,
                    data,
                    options: {
                        ...defaultOpts,
                        ...options
                    }
                });
                
                _log(`Custom ${type} chart created`, 'success');
                return chart;
            } catch (error) {
                _log(`Failed to create chart: ${error.message}`, 'error');
                return null;
            }
        },
        
        /**
         * Destroys all managed charts.
         */
        destroyAllCharts() {
            Object.keys(_charts).forEach(key => {
                _destroyChart(_charts[key]);
                _charts[key] = null;
            });
            _log('All charts destroyed', 'info');
        },
        
        /**
         * Generates fund balance data for a given period.
         * @param {number|string} periodDays - Number of days or 'all'
         * @returns {{labels: string[], data: number[]}} The generated data
         */
        generateFundBalanceData(periodDays) {
            return _generateMockFundBalanceData(periodDays);
        },
        
        /**
         * Generates income vs expense data for a given period.
         * @param {number|string} periodMonths - Number of months or 'all'
         * @returns {{labels: string[], datasets: Array}} The generated data
         */
        generateIncomeExpenseData(periodMonths) {
            return _generateMockIncomeExpenseData(periodMonths);
        },
        
        /**
         * Generates fund distribution data.
         * @returns {{labels: string[], data: number[], backgroundColor: string[]}} The generated data
         */
        generateFundDistributionData() {
            return _generateMockFundDistributionData();
        },
        
        /**
         * Gets the color palette used for charts.
         * @returns {object} The color palette
         */
        getColors() {
            return { ..._colors };
        }
    };

    // Expose the public API to the window
    window.chartHelpers = chartHelpers;

})(window);
