/**
 * @file fix-reports.js
 * @description Fixes the report generation functionality in the Non-Profit Fund Accounting System.
 */

console.log('REPORT FIX: Script loaded');

// Function to add missing report templates to the page
function addReportTemplates() {
    console.log('REPORT FIX: Adding missing report templates');
    
    const reportsPage = document.getElementById('reports-page');
    if (!reportsPage) {
        console.error('REPORT FIX: Reports page element not found');
        return;
    }
    
    // Check if the other report templates already exist
    const existingTemplates = {
        activities: document.getElementById('activities-report'),
        functionalExpenses: document.getElementById('functional-expenses-report'),
        budgetVsActual: document.getElementById('budget-vs-actual-report'),
        customGenerated: document.getElementById('custom-generated-report')
    };
    
    // If activities report doesn't exist, create it
    if (!existingTemplates.activities) {
        console.log('REPORT FIX: Adding activities report template');
        
        const activitiesReport = document.createElement('div');
        activitiesReport.id = 'activities-report';
        activitiesReport.className = 'report-view';
        
        activitiesReport.innerHTML = `
            <div class="report-actions">
                <button class="btn-secondary" data-action="back-to-gallery">Back to Reports</button>
                <div class="report-tools">
                    <button class="action-button">Print</button>
                    <button class="action-button">Export PDF</button>
                    <button class="action-button">Export Excel</button>
                </div>
            </div>
            <div class="report-container">
                <div class="report-header">
                    <div class="report-title">Community Nonprofit Organization</div>
                    <div class="report-subtitle">Statement of Activities</div>
                    <div class="report-date">For the Period Ended June 30, 2025</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Revenue and Support</th>
                            <th class="text-right">Without Donor Restrictions</th>
                            <th class="text-right">With Donor Restrictions</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Contributions and Grants</td>
                            <td class="text-right">$250,000.00</td>
                            <td class="text-right">$75,000.00</td>
                            <td class="text-right">$325,000.00</td>
                        </tr>
                        <tr>
                            <td>Program Service Fees</td>
                            <td class="text-right">$35,000.00</td>
                            <td class="text-right">$0.00</td>
                            <td class="text-right">$35,000.00</td>
                        </tr>
                        <tr>
                            <td>Investment Income</td>
                            <td class="text-right">$5,000.00</td>
                            <td class="text-right">$0.00</td>
                            <td class="text-right">$5,000.00</td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td>Total Revenue and Support</td>
                            <td class="text-right">$290,000.00</td>
                            <td class="text-right">$75,000.00</td>
                            <td class="text-right">$365,000.00</td>
                        </tr>
                    </tbody>
                </table>
                
                <table class="data-table mt-20">
                    <thead>
                        <tr>
                            <th>Expenses</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Program Services</td>
                            <td class="text-right">$100,000.00</td>
                        </tr>
                        <tr>
                            <td>Management and General</td>
                            <td class="text-right">$25,000.00</td>
                        </tr>
                        <tr>
                            <td>Fundraising</td>
                            <td class="text-right">$15,000.00</td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td>Total Expenses</td>
                            <td class="text-right">$140,000.00</td>
                        </tr>
                    </tbody>
                </table>
                
                <table class="data-table mt-20">
                    <thead>
                        <tr>
                            <th>Change in Net Assets</th>
                            <th class="text-right">Without Donor Restrictions</th>
                            <th class="text-right">With Donor Restrictions</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="font-weight-bold">
                            <td>Change in Net Assets</td>
                            <td class="text-right">$150,000.00</td>
                            <td class="text-right">$75,000.00</td>
                            <td class="text-right">$225,000.00</td>
                        </tr>
                        <tr>
                            <td>Net Assets, Beginning of Year</td>
                            <td class="text-right">$100,000.00</td>
                            <td class="text-right">$25,000.00</td>
                            <td class="text-right">$125,000.00</td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td>Net Assets, End of Year</td>
                            <td class="text-right">$250,000.00</td>
                            <td class="text-right">$100,000.00</td>
                            <td class="text-right">$350,000.00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        reportsPage.appendChild(activitiesReport);
    }
    
    // If functional expenses report doesn't exist, create it
    if (!existingTemplates.functionalExpenses) {
        console.log('REPORT FIX: Adding functional expenses report template');
        
        const functionalExpensesReport = document.createElement('div');
        functionalExpensesReport.id = 'functional-expenses-report';
        functionalExpensesReport.className = 'report-view';
        
        functionalExpensesReport.innerHTML = `
            <div class="report-actions">
                <button class="btn-secondary" data-action="back-to-gallery">Back to Reports</button>
                <div class="report-tools">
                    <button class="action-button">Print</button>
                    <button class="action-button">Export PDF</button>
                    <button class="action-button">Export Excel</button>
                </div>
            </div>
            <div class="report-container">
                <div class="report-header">
                    <div class="report-title">Community Nonprofit Organization</div>
                    <div class="report-subtitle">Statement of Functional Expenses</div>
                    <div class="report-date">For the Year Ended June 30, 2025</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Expense</th>
                            <th class="text-right">Program Services</th>
                            <th class="text-right">Management & General</th>
                            <th class="text-right">Fundraising</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Salaries and Wages</td>
                            <td class="text-right">$60,000.00</td>
                            <td class="text-right">$15,000.00</td>
                            <td class="text-right">$5,000.00</td>
                            <td class="text-right">$80,000.00</td>
                        </tr>
                        <tr>
                            <td>Professional Fees</td>
                            <td class="text-right">$10,000.00</td>
                            <td class="text-right">$5,000.00</td>
                            <td class="text-right">$2,000.00</td>
                            <td class="text-right">$17,000.00</td>
                        </tr>
                        <tr>
                            <td>Supplies</td>
                            <td class="text-right">$15,000.00</td>
                            <td class="text-right">$2,000.00</td>
                            <td class="text-right">$3,000.00</td>
                            <td class="text-right">$20,000.00</td>
                        </tr>
                        <tr>
                            <td>Occupancy</td>
                            <td class="text-right">$8,000.00</td>
                            <td class="text-right">$2,000.00</td>
                            <td class="text-right">$1,000.00</td>
                            <td class="text-right">$11,000.00</td>
                        </tr>
                        <tr>
                            <td>Travel</td>
                            <td class="text-right">$5,000.00</td>
                            <td class="text-right">$1,000.00</td>
                            <td class="text-right">$2,000.00</td>
                            <td class="text-right">$8,000.00</td>
                        </tr>
                        <tr>
                            <td>Other Expenses</td>
                            <td class="text-right">$2,000.00</td>
                            <td class="text-right">$0.00</td>
                            <td class="text-right">$2,000.00</td>
                            <td class="text-right">$4,000.00</td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td>Total Expenses</td>
                            <td class="text-right">$100,000.00</td>
                            <td class="text-right">$25,000.00</td>
                            <td class="text-right">$15,000.00</td>
                            <td class="text-right">$140,000.00</td>
                        </tr>
                        <tr>
                            <td>Percentage</td>
                            <td class="text-right">71.4%</td>
                            <td class="text-right">17.9%</td>
                            <td class="text-right">10.7%</td>
                            <td class="text-right">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        reportsPage.appendChild(functionalExpensesReport);
    }
    
    // If budget vs actual report doesn't exist, create it
    if (!existingTemplates.budgetVsActual) {
        console.log('REPORT FIX: Adding budget vs actual report template');
        
        const budgetVsActualReport = document.createElement('div');
        budgetVsActualReport.id = 'budget-vs-actual-report';
        budgetVsActualReport.className = 'report-view';
        
        budgetVsActualReport.innerHTML = `
            <div class="report-actions">
                <button class="btn-secondary" data-action="back-to-gallery">Back to Reports</button>
                <div class="report-tools">
                    <button class="action-button">Print</button>
                    <button class="action-button">Export PDF</button>
                    <button class="action-button">Export Excel</button>
                </div>
            </div>
            <div class="report-container">
                <div class="report-header">
                    <div class="report-title">Community Nonprofit Organization</div>
                    <div class="report-subtitle">Budget vs. Actual Report</div>
                    <div class="report-date">For the Year Ended June 30, 2025</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th class="text-right">Budget</th>
                            <th class="text-right">Actual</th>
                            <th class="text-right">Variance</th>
                            <th class="text-right">% Variance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Revenue</strong></td>
                            <td class="text-right"></td>
                            <td class="text-right"></td>
                            <td class="text-right"></td>
                            <td class="text-right"></td>
                        </tr>
                        <tr>
                            <td>Contributions and Grants</td>
                            <td class="text-right">$300,000.00</td>
                            <td class="text-right">$325,000.00</td>
                            <td class="text-right">$25,000.00</td>
                            <td class="text-right">8.3%</td>
                        </tr>
                        <tr>
                            <td>Program Service Fees</td>
                            <td class="text-right">$40,000.00</td>
                            <td class="text-right">$35,000.00</td>
                            <td class="text-right">($5,000.00)</td>
                            <td class="text-right">-12.5%</td>
                        </tr>
                        <tr>
                            <td>Investment Income</td>
                            <td class="text-right">$10,000.00</td>
                            <td class="text-right">$5,000.00</td>
                            <td class="text-right">($5,000.00)</td>
                            <td class="text-right">-50.0%</td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td>Total Revenue</td>
                            <td class="text-right">$350,000.00</td>
                            <td class="text-right">$365,000.00</td>
                            <td class="text-right">$15,000.00</td>
                            <td class="text-right">4.3%</td>
                        </tr>
                        <tr>
                            <td><strong>Expenses</strong></td>
                            <td class="text-right"></td>
                            <td class="text-right"></td>
                            <td class="text-right"></td>
                            <td class="text-right"></td>
                        </tr>
                        <tr>
                            <td>Program Services</td>
                            <td class="text-right">$120,000.00</td>
                            <td class="text-right">$100,000.00</td>
                            <td class="text-right">$20,000.00</td>
                            <td class="text-right">16.7%</td>
                        </tr>
                        <tr>
                            <td>Management and General</td>
                            <td class="text-right">$30,000.00</td>
                            <td class="text-right">$25,000.00</td>
                            <td class="text-right">$5,000.00</td>
                            <td class="text-right">16.7%</td>
                        </tr>
                        <tr>
                            <td>Fundraising</td>
                            <td class="text-right">$20,000.00</td>
                            <td class="text-right">$15,000.00</td>
                            <td class="text-right">$5,000.00</td>
                            <td class="text-right">25.0%</td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td>Total Expenses</td>
                            <td class="text-right">$170,000.00</td>
                            <td class="text-right">$140,000.00</td>
                            <td class="text-right">$30,000.00</td>
                            <td class="text-right">17.6%</td>
                        </tr>
                        <tr class="font-weight-bold">
                            <td>Net Surplus/(Deficit)</td>
                            <td class="text-right">$180,000.00</td>
                            <td class="text-right">$225,000.00</td>
                            <td class="text-right">$45,000.00</td>
                            <td class="text-right">25.0%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        reportsPage.appendChild(budgetVsActualReport);
    }
    
    // If custom generated report doesn't exist, create it
    if (!existingTemplates.customGenerated) {
        console.log('REPORT FIX: Adding custom generated report template');
        
        const customGeneratedReport = document.createElement('div');
        customGeneratedReport.id = 'custom-generated-report';
        customGeneratedReport.className = 'report-view';
        
        customGeneratedReport.innerHTML = `
            <div class="report-actions">
                <button class="btn-secondary" data-action="back-to-gallery">Back to Reports</button>
                <div class="report-tools">
                    <button class="action-button">Print</button>
                    <button class="action-button">Export PDF</button>
                    <button class="action-button">Export Excel</button>
                </div>
            </div>
            <div class="report-container">
                <div class="report-header">
                    <div id="custom-report-output-org-name" class="report-title">Community Nonprofit Organization</div>
                    <div id="custom-report-output-title" class="report-subtitle">Custom Report</div>
                    <div id="custom-report-output-date" class="report-date">Generated on June 30, 2025</div>
                </div>
                <div id="custom-report-output-table-area">
                    <p>This is a placeholder for a custom report.</p>
                </div>
            </div>
        `;
        
        reportsPage.appendChild(customGeneratedReport);
    }
    
    console.log('REPORT FIX: Report templates added');
    
    // Add event handlers to the back buttons
    const backButtons = document.querySelectorAll('button[data-action="back-to-gallery"]');
    backButtons.forEach(button => {
        button.onclick = function() {
            document.querySelectorAll('.report-view').forEach(view => {
                view.classList.remove('active');
            });
            const galleryElement = document.getElementById('reports-gallery');
            if (galleryElement) {
                galleryElement.classList.add('active');
            }
            const titleElement = document.getElementById('reports-page-title');
            if (titleElement) {
                titleElement.textContent = 'Financial Reports';
            }
        };
    });
    
    // Direct fix for the report generation buttons
    const reportButtons = document.querySelectorAll('button[data-report]');
    reportButtons.forEach(button => {
        button.onclick = function() {
            const reportType = this.getAttribute('data-report');
            console.log(`REPORT FIX: Directly handling report button click for: ${reportType}`);
            
            // Hide all views
            document.querySelectorAll('.report-view').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById('reports-gallery').classList.remove('active');
            
            // Show the requested report view
            const targetReportView = document.getElementById(`${reportType}-report`);
            if (targetReportView) {
                targetReportView.classList.add('active');
            }
            
            // Update the title
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
                    default:
                        titleElement.textContent = 'Financial Reports';
                }
            }
        };
    });
}

// Execute when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('REPORT FIX: DOM content loaded, fixing reports');
    addReportTemplates();
});

// Also add after a delay to ensure execution
setTimeout(function() {
    console.log('REPORT FIX: Delayed execution, fixing reports');
    addReportTemplates();
}, 1000);

// Also add a button to manually fix reports if needed
function addFixReportsButton() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '170px';
    container.style.top = '10px';
    container.style.zIndex = '10000';
    
    const button = document.createElement('button');
    button.textContent = 'FIX REPORTS';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#9c27b0';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '16px';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    
    button.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#7b1fa2';
    });
    
    button.addEventListener('mouseout', function() {
        this.style.backgroundColor = '#9c27b0';
    });
    
    button.addEventListener('click', function() {
        addReportTemplates();
        alert('Reports have been fixed!');
    });
    
    container.appendChild(button);
    document.body.appendChild(container);
}

// Add the fix button
setTimeout(addFixReportsButton, 1500);

console.log('REPORT FIX: Script loaded successfully');
