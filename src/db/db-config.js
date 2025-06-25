// db-config.js
// Client-side configuration for database connection parameters.

const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'npfa123',
    database: 'fund_accounting_db'
};

// Helper function to get the database configuration.
function getDbConfig() {
    return DB_CONFIG;
}

// For browser environment
if (typeof window !== 'undefined') {
    window.getDbConfig = getDbConfig;
}

// For Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getDbConfig, DB_CONFIG };
}
