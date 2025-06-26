/**
 * @file debug.js
 * @description A simple, on-page error display for debugging JavaScript issues.
 * This script captures unhandled errors and promise rejections and displays them
 * in a fixed panel at the bottom of the screen.
 *
 *  QUICK DEV SHORTCUTS
 *  ------------------------------------------------------------------
 *  • Alt + L – Toggle the visibility of the in-app Dev Log panel
 *              (element id="log-output-container").
 *  • The Dev Log panel is hidden by default so it does not distract
 *    end-users. A brief toast reminds developers of the shortcut.
 */

(function(window) {
    'use strict';

    let errorContainer = null;
    let errorCount = 0;

    /**
     * Creates the error container element if it doesn't already exist.
     * @returns {HTMLElement} The error container element.
     */
    function createErrorContainer() {
        // Check if the container already exists
        const existingContainer = document.getElementById('js-error-container');
        if (existingContainer) {
            return existingContainer;
        }

        // Create the main container div
        const container = document.createElement('div');
        container.id = 'js-error-container';
        
        // Apply styles for visibility and positioning
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'rgba(255, 235, 238, 0.95)',
            borderTop: '2px solid #e53935',
            padding: '10px',
            zIndex: '99999',
            fontFamily: 'monospace, Consolas, Courier New',
            fontSize: '13px',
            color: '#c62828',
            boxSizing: 'border-box',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
        });

        // Create a header for the error panel
        const header = document.createElement('div');
        header.style.fontWeight = 'bold';
        header.style.marginBottom = '10px';
        header.style.paddingBottom = '5px';
        header.style.borderBottom = '1px solid #ffcdd2';
        header.innerHTML = 'JavaScript Error Log (<span id="js-error-count">0</span>)';
        
        container.appendChild(header);
        
        // Add a close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '5px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            color: '#c62828',
            cursor: 'pointer'
        });
        closeBtn.onclick = () => container.style.display = 'none';
        container.appendChild(closeBtn);

        // Append the container to the body
        document.body.appendChild(container);
        return container;
    }

    /**
     * Displays a formatted error message in the error container.
     * @param {string} message - The error message to display.
     */
    function displayError(message) {
        // Ensure the container is created and visible
        if (!errorContainer) {
            errorContainer = createErrorContainer();
        }
        errorContainer.style.display = 'block';

        // Create a new element for this error
        const errorElement = document.createElement('div');
        errorElement.style.borderBottom = '1px dotted #ffcdd2';
        errorElement.style.padding = '5px 0';
        errorElement.style.whiteSpace = 'pre-wrap';
        errorElement.style.wordBreak = 'break-all';
        
        // Add timestamp and message
        errorElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        // Append the error to the container (after the header)
        const header = errorContainer.querySelector('h4, div');
        if (header) {
            header.insertAdjacentElement('afterend', errorElement);
        } else {
            errorContainer.appendChild(errorElement);
        }

        // Update the error count
        errorCount++;
        const countEl = document.getElementById('js-error-count');
        if (countEl) {
            countEl.textContent = errorCount;
        }

        // Scroll to the top to see the latest error
        errorContainer.scrollTop = 0;
    }

    // --- Event Listeners for Error Capturing ---

    /**
     * Captures standard JavaScript runtime errors.
     */
    window.onerror = function(message, source, lineno, colno, error) {
        let formattedMessage = `Error: ${message}`;
        if (source) {
            const sourceFile = source.split('/').pop();
            formattedMessage += `\n  in ${sourceFile} (Line: ${lineno}, Col: ${colno})`;
        }
        if (error && error.stack) {
            formattedMessage += `\nStack: ${error.stack.split('\\n').slice(0, 2).join('\\n')}`;
        }
        displayError(formattedMessage);
        
        // Return true to prevent the default browser error handling (e.g., console log)
        return true;
    };

    /**
     * Captures unhandled promise rejections.
     */
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        let formattedMessage;

        if (reason instanceof Error) {
            formattedMessage = `Unhandled Promise Rejection: ${reason.message}\nStack: ${reason.stack ? reason.stack.split('\\n').slice(0, 2).join('\\n') : 'N/A'}`;
        } else {
            // Handle non-Error rejections (e.g., strings, objects)
            try {
                formattedMessage = `Unhandled Promise Rejection: ${JSON.stringify(reason)}`;
            } catch {
                formattedMessage = `Unhandled Promise Rejection: ${String(reason)}`;
            }
        }
        
        displayError(formattedMessage);
    });

    console.log('DEBUG.JS: On-page error capturing script has been initialized.');

    // ---------------------------------------------------------------------
    // Developer Log panel toggle (Alt+L)  —  hide by default
    // ---------------------------------------------------------------------

    /**
     * Shows a temporary toast advising about the Alt+L shortcut
     */
    function showLogShortcutToast() {
        const toastId = 'dev-log-toast';
        if (document.getElementById(toastId)) return;

        const toast = document.createElement('div');
        toast.id = toastId;
        toast.textContent = 'Dev Log hidden – press Alt+L to toggle';
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
        requestAnimationFrame(() => (toast.style.opacity = '0.9'));
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    /**
     * Hides the Dev Log container and registers Alt+L toggle
     */
    function initDevLogToggle() {
        const devLogContainer = document.getElementById('log-output-container');
        if (!devLogContainer) return;

        // Hide by default
        devLogContainer.style.display = 'none';

        // Show toast so devs know how to reveal it
        showLogShortcutToast();

        // Toggle with Alt+L
        document.addEventListener('keydown', function (e) {
            if (e.altKey && (e.key === 'l' || e.key === 'L')) {
                devLogContainer.style.display =
                    devLogContainer.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    // ---------------------------------------------------------------------
    // Optional: Monitor Chart.js availability to help diagnose late-loading
    // ---------------------------------------------------------------------
    (function monitorChartJs(maxWaitMs = 5000, intervalMs = 100) {
        const start = Date.now();
        const timerId = setInterval(() => {
            if (typeof window.Chart !== 'undefined') {
                console.log('[DEBUG.JS] Chart.js detected. Version:', window.Chart.version || 'unknown');
                clearInterval(timerId);
            } else if (Date.now() - start >= maxWaitMs) {
                clearInterval(timerId);
                // Use the existing displayError for visibility, but mark as info.
                displayError('Info: Chart.js did NOT load within expected time window.');
                console.warn('[DEBUG.JS] Chart.js not detected after waiting', maxWaitMs, 'ms');
            }
        }, intervalMs);
    })();

    // Initialise Dev-Log toggle after DOM content
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDevLogToggle);
    } else {
        initDevLogToggle();
    }

})(window);
