/**
 * EMERGENCY REPORTS FIX - Maximum aggressive approach 
 * This script bypasses all application logic to force report display
 */

console.log("EMERGENCY REPORTS FIX: Loading script");

// Wait for the page to be fully loaded
window.addEventListener('load', function() {
    console.log("EMERGENCY REPORTS FIX: Window loaded, starting emergency fix");
    
    // DIAGNOSTIC: Check what's actually in the DOM for each report
    console.log("EMERGENCY DIAGNOSTIC: Checking report DOM structures");
    
    const reportIds = [
        'financial-position-report',
        'activities-report',
        'functional-expenses-report',
        'budget-vs-actual-report'
    ];
    
    reportIds.forEach(reportId => {
        const report = document.getElementById(reportId);
        if (!report) {
            console.error(`EMERGENCY: Report ${reportId} not found in DOM!`);
            return;
        }
        
        console.log(`EMERGENCY: Report ${reportId} found, checking content`);
        console.log(`- Has .report-container: ${!!report.querySelector('.report-container')}`);
        console.log(`- Has tables: ${report.querySelectorAll('table').length}`);
        console.log(`- Has title: ${!!report.querySelector('.report-header')}`);
    });
    
    // Create self-contained button for each report that does direct DOM manipulation
    function createEmergencyReportButton(reportType, buttonText, position) {
        const btn = document.createElement('button');
        btn.textContent = buttonText;
        btn.style.position = 'fixed';
        btn.style.zIndex = '10000';
        btn.style.padding = '8px 12px';
        btn.style.backgroundColor = '#ff5722';
        btn.style.color = 'white';
        btn.style.fontWeight = 'bold';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        
        // Position the button
        if (position === 'top-right') {
            btn.style.right = '170px';
            btn.style.top = '10px';
        } else if (position === 'top-middle') {
            btn.style.right = '290px';
            btn.style.top = '10px';
        } else if (position === 'top-left-middle') {
            btn.style.right = '410px';
            btn.style.top = '10px';
        } else {
            btn.style.right = '520px';
            btn.style.top = '10px';
        }
        
        // The click handler does everything directly
        btn.addEventListener('click', function() {
            console.log(`EMERGENCY: Direct activation of ${reportType} report`);
            
            // First, hide everything
            document.querySelectorAll('.page').forEach(p => {
                p.style.display = 'none';
            });
            
            // Show the reports page
            const reportsPage = document.getElementById('reports-page');
            if (reportsPage) {
                reportsPage.style.display = 'block';
                console.log('EMERGENCY: Reports page shown');
            }
            
            // Hide all report views and the gallery
            document.querySelectorAll('.report-view, .reports-gallery').forEach(view => {
                view.style.display = 'none';
                view.classList.remove('active');
            });
            
            // Force show the specific report with inline styles
            const targetReport = document.getElementById(`${reportType}-report`);
            if (targetReport) {
                targetReport.style.display = 'block';
                targetReport.classList.add('active');
                console.log(`EMERGENCY: ${reportType}-report shown with direct style`);
                
                // Set title in header
                const titleElement = document.getElementById('reports-page-title');
                if (titleElement) {
                    switch (reportType) {
                        case 'financial-position':
                            titleElement.textContent = 'Statement of Financial Position';
                            break;
                        case 'activities':
                            titleElement.textContent = 'Statement of Activities';
                            break;
                        case 'functional-expenses':
                            titleElement.textContent = 'Statement of Functional Expenses';
                            break;
                        case 'budget-vs-actual':
                            titleElement.textContent = 'Budget vs. Actual Report';
                            break;
                    }
                }
                
                // Force show all elements inside the report
                const reportContainer = targetReport.querySelector('.report-container');
                if (reportContainer) {
                    reportContainer.style.display = 'block';
                    
                    // Force show the report header
                    const header = reportContainer.querySelector('.report-header');
                    if (header) {
                        header.style.display = 'block';
                    }
                    
                    // Force show all tables with proper display modes
                    const tables = reportContainer.querySelectorAll('table');
                    tables.forEach(table => {
                        table.style.display = 'table';
                        
                        // Force show all table rows
                        const rows = table.querySelectorAll('tr');
                        rows.forEach(row => {
                            row.style.display = 'table-row';
                            
                            // Force show all cells
                            const cells = row.querySelectorAll('th, td');
                            cells.forEach(cell => {
                                cell.style.display = 'table-cell';
                            });
                        });
                    });
                    
                    console.log(`EMERGENCY: Report ${reportType} contents shown with direct styles`);
                    console.log(`- Forced display on ${tables.length} tables`);
                } else {
                    console.error(`EMERGENCY: No .report-container found in ${reportType}-report`);
                }
                
                // Force action buttons to show
                const actionButtons = targetReport.querySelector('.report-actions');
                if (actionButtons) {
                    actionButtons.style.display = 'flex';
                    
                    // Set up back button
                    const backButton = actionButtons.querySelector('[data-action="back-to-gallery"]');
                    if (backButton) {
                        backButton.onclick = function() {
                            document.querySelectorAll('.report-view').forEach(view => {
                                view.style.display = 'none';
                            });
                            const gallery = document.getElementById('reports-gallery');
                            if (gallery) {
                                gallery.style.display = 'block';
                            }
                            
                            const titleEl = document.getElementById('reports-page-title');
                            if (titleEl) {
                                titleEl.textContent = 'Financial Reports';
                            }
                        };
                    }
                }
            } else {
                console.error(`EMERGENCY: Report ${reportType}-report not found!`);
            }
        });
        
        document.body.appendChild(btn);
        console.log(`EMERGENCY: Created direct button for ${reportType} report`);
        return btn;
    }
    
    // Create emergency buttons
    createEmergencyReportButton('financial-position', 'POSITION', 'top-right');
    createEmergencyReportButton('activities', 'ACTIVITIES', 'top-middle');
    createEmergencyReportButton('functional-expenses', 'EXPENSES', 'top-left-middle');
    createEmergencyReportButton('budget-vs-actual', 'BUDGET', 'top-far-left');
    
    console.log("EMERGENCY REPORTS FIX: Setup complete");
});
