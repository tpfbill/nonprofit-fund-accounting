document.addEventListener('DOMContentLoaded', function() {
    console.log("DB Status Tester initialized");
    
    // Check script loading status
    checkScriptLoading();
    
    // Add event listeners
    document.getElementById('check-connection').addEventListener('click', checkConnection);
    document.getElementById('toggle-server').addEventListener('click', toggleServerInfo);
    document.getElementById('test-entities').addEventListener('click', () => testData('entities'));
    document.getElementById('test-accounts').addEventListener('click', () => testData('accounts'));
    document.getElementById('test-funds').addEventListener('click', () => testData('funds'));
    document.getElementById('test-journal-entries').addEventListener('click', () => testData('journalEntries'));
    
    // Add API endpoint test buttons
    document.querySelectorAll('[data-endpoint]').forEach(button => {
        button.addEventListener('click', () => testApiEndpoint(button.dataset.endpoint));
    });
    
    // Initial connection check
    setTimeout(checkConnection, 500);
});

function checkScriptLoading() {
    const scripts = {
        'db-config': typeof getDbConfig !== 'undefined',
        'db-connection': typeof dbConnection !== 'undefined' || typeof logMsg !== 'undefined',
        'db-js': typeof db !== 'undefined'
    };
    
    let allLoaded = true;
    
    for (const [script, loaded] of Object.entries(scripts)) {
        const statusEl = document.getElementById(`${script}-status`);
        if (statusEl) {
            if (loaded) {
                statusEl.textContent = 'Loaded';
                statusEl.className = 'status success';
            } else {
                statusEl.textContent = 'Not Found';
                statusEl.className = 'status error';
                allLoaded = false;
            }
        }
    }
    
    const scriptStatusEl = document.getElementById('script-status');
    if (scriptStatusEl) {
        scriptStatusEl.className = 'status ' + (allLoaded ? 'success' : 'error');
        scriptStatusEl.textContent = allLoaded ? 'All scripts loaded successfully' : 'Some scripts failed to load';
    }
    
    return allLoaded;
}

async function checkConnection() {
    console.log("Checking database connection...");
    const statusEl = document.getElementById('connection-status');
    
    if (!checkScriptLoading()) {
        statusEl.textContent = 'Cannot check connection - scripts not loaded';
        statusEl.className = 'status error';
        return;
    }
    
    statusEl.textContent = 'Connecting...';
    statusEl.className = 'status info';
    
    try {
        let connected;
        
        if (typeof db !== 'undefined' && db.connect) {
            connected = await db.connect();
        } else if (typeof dbConnection !== 'undefined' && dbConnection.testConnection) {
            connected = await dbConnection.testConnection();
        } else {
            throw new Error('No valid connection method found');
        }
        
        if (connected) {
            statusEl.textContent = 'Connected to database';
            statusEl.className = 'status success';
        } else {
            statusEl.textContent = 'Not connected - using fallback data';
            statusEl.className = 'status warning';
        }
    } catch (err) {
        console.error('Connection error:', err);
        statusEl.textContent = 'Error: ' + err.message;
        statusEl.className = 'status error';
    }
}

async function testData(dataType) {
    console.log(`Testing ${dataType} data...`);
    const displayEl = document.getElementById('data-display');
    
    if (!checkScriptLoading()) {
        displayEl.textContent = 'Cannot load data - scripts not loaded';
        return;
    }
    
    displayEl.textContent = `Loading ${dataType}...`;
    
    try {
        let data;
        
        // Call the appropriate fetch method based on dataType
        if (dataType === 'entities' && db.fetchEntities) {
            data = await db.fetchEntities();
        } else if (dataType === 'accounts' && db.fetchAccounts) {
            data = await db.fetchAccounts();
        } else if (dataType === 'funds' && db.fetchFunds) {
            data = await db.fetchFunds();
        } else if (dataType === 'journalEntries' && db.fetchJournalEntries) {
            data = await db.fetchJournalEntries();
        } else {
            throw new Error(`No fetch method found for ${dataType}`);
        }
        
        displayEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        console.error(`Error fetching ${dataType}:`, err);
        displayEl.textContent = `Error: ${err.message}`;
    }
}

async function testApiEndpoint(endpoint) {
    console.log(`Testing API endpoint: ${endpoint}`);
    const statusEl = document.getElementById('api-status');
    const responseEl = document.getElementById('api-response');
    
    statusEl.textContent = `Testing ${endpoint}...`;
    statusEl.className = 'status info';
    responseEl.textContent = 'Waiting for response...';
    
    try {
        const API_URL = 'http://localhost:3000';
        const res = await fetch(API_URL + endpoint);
        const isJson = res.headers.get('content-type')?.includes('application/json');
        
        let data;
        if (isJson) {
            data = await res.json();
        } else {
            data = await res.text();
        }
        
        if (res.ok) {
            statusEl.textContent = `${endpoint}: Success (${res.status})`;
            statusEl.className = 'status success';
        } else {
            statusEl.textContent = `${endpoint}: Failed (${res.status})`;
            statusEl.className = 'status error';
        }
        
        responseEl.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } catch (err) {
        console.error(`API error for ${endpoint}:`, err);
        statusEl.textContent = `${endpoint}: Error - ${err.message}`;
        statusEl.className = 'status error';
        responseEl.textContent = err.stack || err.message;
    }
}

function toggleServerInfo() {
    const serverInfo = document.getElementById('server-info');
    
    if (serverInfo) {
        serverInfo.remove();
    } else {
        const serverInfoHtml = `
            <div id="server-info" class="card">
                <h2>Server Information</h2>
                <table>
                    <tr>
                        <th>Server URL</th>
                        <td>http://localhost:3000</td>
                    </tr>
                    <tr>
                        <th>API Base Path</th>
                        <td>/api</td>
                    </tr>
                    <tr>
                        <th>Available Endpoints</th>
                        <td>/health, /entities, /accounts, /funds, /journal-entries</td>
                    </tr>
                    <tr>
                        <th>Server Status Command</th>
                        <td><code>node server.js</code></td>
                    </tr>
                </table>
                <p>Make sure the server is running with <code>node server.js</code> in a terminal window.</p>
            </div>
        `;
        
        document.querySelector('.container').insertAdjacentHTML('beforeend', serverInfoHtml);
    }
}
