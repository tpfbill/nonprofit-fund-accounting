/**
 * documentation.js
 * Handles loading and displaying documentation files in the Nonprofit Fund Accounting System
 * Version: 1.0.0 (v8.7)
 */

// Documentation Page Functions
async function loadDocumentationPage() {
    console.log('Loading documentation page...');
    const documentGrid = document.getElementById('document-grid');
    
    if (!documentGrid) {
        console.error('Document grid element not found');
        return;
    }
    
    // Show loading indicator
    documentGrid.innerHTML = '<div class="loading-message">Loading documentation...</div>';
    
    try {
        const response = await fetch('/api/documents');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Documents loaded:', result);
        
        if (result.success && result.documents) {
            renderDocuments(result.documents);
        } else {
            documentGrid.innerHTML = '<div class="no-documents">No documentation found.</div>';
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        documentGrid.innerHTML = '<div class="no-documents">Error loading documentation. Please try again.</div>';
    }
}

/**
 * Render the list of documentation files returned from the API.
 * @param {Array<Object>} documents – array of document metadata objects
 */
function renderDocuments(documents) {
    const documentGrid = document.getElementById('document-grid');
    if (!documentGrid) return;
    
    if (!documents || documents.length === 0) {
        documentGrid.innerHTML = '<div class="no-documents">No documentation found.</div>';
        return;
    }
    
    const totalDocuments = documents.length;
    const totalSizeKB = documents.reduce((sum, doc) => sum + Math.round(doc.size / 1024), 0);
    
    const statsHTML = `
        <div class="document-stats">
            <div class="stat-item">
                <span class="stat-value">${totalDocuments}</span>
                <span class="stat-label">Documents</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${totalSizeKB} KB</span>
                <span class="stat-label">Total Size</span>
            </div>
        </div>
    `;
    
    const documentsHTML = documents.map(doc => {
        const sizeKB = Math.round(doc.size / 1024);
        const lastModified = new Date(doc.lastModified).toLocaleDateString();
        const description = getDocumentDescription(doc.filename);
        
        return `
            <div class="document-card" onclick="openDocument('${doc.url}')">
                <div class="document-card-header">
                    <div class="document-icon">PDF</div>
                    <h3 class="document-title">${doc.displayName}</h3>
                </div>
                <div class="document-info">
                    <div class="document-size">Size: ${sizeKB} KB</div>
                    <div class="document-date">Updated: ${lastModified}</div>
                </div>
                <div class="document-description">
                    ${description}
                </div>
                <div class="document-actions">
                    <button class="document-btn document-btn-primary" onclick="event.stopPropagation(); openDocument('${doc.url}')">
                        View PDF
                    </button>
                    <button class="document-btn document-btn-secondary" onclick="event.stopPropagation(); downloadDocument('${doc.url}', '${doc.filename}')">
                        Download
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    documentGrid.innerHTML = statsHTML + '<div class="document-grid">' + documentsHTML + '</div>';
}

/**
 * Return a human-readable description for a given documentation file.
 * Extend this map as new docs are added.
 * @param {string} filename - The filename of the document
 * @returns {string} Description of the document
 */
function getDocumentDescription(filename) {
    const descriptions = {
        'AccuFund_Migration_Guide_v8.6.pdf': 'Complete guide for migrating from AccuFund to the Nonprofit Fund Accounting System, including data import procedures and validation steps.',
        'AccuFund_Migration_Steps_v8.6.pdf': 'Step-by-step instructions for the AccuFund migration process, with detailed procedures and troubleshooting tips.',
        'AccuFund_Verification_Procedure_v8.6.pdf': 'Verification and validation procedures to ensure data integrity after AccuFund migration.',
        'Administrator_Guide_v8.6.pdf': 'Comprehensive administrator guide covering system setup, user management, entity configuration, and maintenance procedures.',
        'User_Guide_v8.6.pdf': 'End-user guide covering daily operations, journal entries, reporting, and system features.',
        'Windows_HyperV_Deployment_Guide_v8.6.pdf': 'Step-by-step guide for deploying the system on Windows Hyper-V with Ubuntu 22.04 LTS virtual machines.',
        'Zoho_Books_Comparison_v8.6.pdf': 'Detailed comparison between the Nonprofit Fund Accounting System and Zoho Books, highlighting key differences and migration considerations.'
    };
    
    return descriptions[filename] || 'Documentation file for the Nonprofit Fund Accounting System.';
}

/**
 * Open a document in a new browser tab.
 * @param {string} url - URL of the document to open
 */
function openDocument(url) {
    window.open(url, '_blank', 'noopener');
}

/**
 * Force-download a document instead of opening it.
 * @param {string} url - URL of the document to download
 * @param {string} filename - Name to save the file as
 */
function downloadDocument(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Ensure documentation is (re)loaded when the Documentation nav item is clicked

/* ======================================================================
 * Navigation Functions for Documentation
 * ==================================================================== */

/**
 * Show the documentation page, hide others, highlight nav item,
 * and ensure docs are loaded.
 */
function navigateToDocumentation() {
    console.log('Navigating to documentation page…');

    /* Hide all pages */
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
        page.classList.remove('active');
    });

    /* Show documentation page */
    const documentationPage = document.getElementById('documentation-page');
    if (documentationPage) {
        documentationPage.classList.remove('hidden');
        documentationPage.classList.add('active');
    }

    /* Highlight the active nav item */
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page === 'documentation') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    /* Load / refresh documentation list */
    loadDocumentationPage();
}

/**
 * Attach the documentation navigation handler
 * once the DOM is ready.
 */
function setupDocumentationNavigation() {
    console.log('Setting up documentation navigation…');
    const documentationNav = document.querySelector('.nav-item[data-page="documentation"]');
    if (documentationNav) {
        documentationNav.addEventListener('click', navigateToDocumentation);
        console.log('Documentation navigation handler attached.');
    }
}

/* ----------------------------------------------------------------------
 * Initialise documentation navigation on DOMContentLoaded
 * -------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', setupDocumentationNavigation);
