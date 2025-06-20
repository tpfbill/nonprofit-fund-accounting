// db-config.js
// Client-side configuration for database connection parameters.
// In a real application, this file would typically NOT store sensitive credentials directly.
// Instead, the frontend would make API calls to a backend server, and the backend server
// would use its own secure configuration to connect to the database.
// This file serves as a placeholder for such a configuration or for settings
// that might be passed to a backend.

const DB_CONFIG = {
    host: 'localhost', // Or your PostgreSQL server IP/hostname
    port: 5432,        // Default PostgreSQL port
    user: 'your_db_user', // Replace with your PostgreSQL username
    password: 'your_db_password', // IMPORTANT: Replace with your PostgreSQL password or use environment variables on the backend
    database: 'fund_accounting_db' // The database name we created
};

// Helper function to get the database configuration.
// In a real application, the frontend would not use this to connect directly.
// It would make API calls to a backend, which would then use a secure configuration.
function getDbConfig() {
    // In a production environment, you should never expose sensitive credentials like this.
    // This is for local development/demonstration purposes only.
    // A backend API would handle the actual database connection securely.
    console.warn("DB_CONFIG: getDbConfig() called. Remember that direct DB connection from client-side is insecure and not recommended for production.");
    return DB_CONFIG;
}

// Example of how you might conceptually use this in your main app's JS,
// assuming you have a backend API endpoint like '/api/data':
/*
async function fetchDataFromBackend(entityId) {
    try {
        // The actual DB_CONFIG is used by the backend, not sent from client.
        // The client just needs to know the API endpoint.
        const response = await fetch(`/api/data/accounts?entityId=${entityId}`); // Example API call
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching data from backend:", error);
        // Handle error appropriately in the UI
        return null;
    }
}
*/

// Log that the configuration file has been loaded.
// This is a client-side script, so this log will appear in the browser console.
(function() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DB_CONFIG_JS]: Database configuration loaded. Ready to be used by backend API calls.`);
    // You could add a check here to see if placeholder credentials are still being used
    if (DB_CONFIG.user === 'your_db_user' || DB_CONFIG.password === 'your_db_password') {
        console.warn("[DB_CONFIG_JS]: Default placeholder credentials are still in use. Please update db-config.js with your actual database credentials if this is for a real backend connection (though typically backend handles this securely).");
    }
})();
