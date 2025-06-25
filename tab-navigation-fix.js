/**
 * @file tab-navigation-fix.js
 * @description Restores the main tab navigation functionality by adding event listeners
 * to the nav-item elements and showing/hiding the appropriate page divs when clicked.
 */

(function() {
    'use strict';

    /**
     * Finds all navigation tabs and attaches click event listeners to handle page switching.
     */
    function initializeTabNavigation() {
        console.log("TAB-FIX: Initializing main navigation tab functionality.");

        // Select all navigation items that are meant to switch pages.
        // We specifically look for the data-page attribute to avoid attaching listeners to the reports link.
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        const pages = document.querySelectorAll('.page');

        if (navItems.length === 0) {
            console.error("TAB-FIX: No navigation items with 'data-page' attribute found. Cannot initialize tab navigation.");
            return;
        }

        if (pages.length === 0) {
            console.error("TAB-FIX: No page elements found. Cannot switch pages.");
            return;
        }

        console.log(`TAB-FIX: Found ${navItems.length} navigation items to handle.`);

        navItems.forEach(tab => {
            tab.addEventListener('click', function(event) {
                // Prevent any default behavior, like following a link if it were an <a> tag.
                event.preventDefault();

                const pageId = this.getAttribute('data-page');
                console.log(`TAB-FIX: Clicked on tab for page: ${pageId}`);

                // 1. Deactivate all navigation tabs
                navItems.forEach(item => {
                    item.classList.remove('active');
                });

                // 2. Activate the clicked tab
                this.classList.add('active');

                // 3. Hide all page divs
                pages.forEach(page => {
                    page.classList.remove('active');
                });

                // 4. Show the target page div
                const targetPage = document.getElementById(`${pageId}-page`);
                if (targetPage) {
                    targetPage.classList.add('active');
                    console.log(`TAB-FIX: Activated page with ID: #${targetPage.id}`);
                } else {
                    console.error(`TAB-FIX: Could not find page with ID: #${pageId}-page`);
                }
            });
        });

        console.log("TAB-FIX: Main navigation event listeners attached successfully.");
    }

    // Ensure the script runs after the HTML document has been fully parsed.
    if (document.readyState === 'loading') {
        // Still loading, wait for the event.
        document.addEventListener('DOMContentLoaded', initializeTabNavigation);
    } else {
        // The DOM is already ready, execute the function immediately.
        initializeTabNavigation();
    }

})();
