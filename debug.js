/**
 * @file debug.js
 * @description A simple, on-page error display for debugging JavaScript issues.
 * This script captures unhandled errors and promise rejections and displays them
 * in a fixed panel at the bottom of the screen.
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

})(window);
