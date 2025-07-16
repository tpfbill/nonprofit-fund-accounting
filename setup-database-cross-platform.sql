-- =============================================================================
-- setup-database.sql
-- Cross-platform database setup for Nonprofit Fund Accounting v8.8
-- =============================================================================

-- For Mac/Windows: Create npfadmin user and database
-- For Ubuntu: Can use either postgres or npfadmin user

\echo 'Setting up database for Nonprofit Fund Accounting v8.8...'

-- Create npfadmin role if it doesn't exist (safe for all platforms)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'npfadmin') THEN
        CREATE ROLE npfadmin LOGIN PASSWORD 'npfa123';
        RAISE NOTICE 'Created role: npfadmin';
    ELSE
        RAISE NOTICE 'Role already exists: npfadmin';
        ALTER ROLE npfadmin WITH PASSWORD 'npfa123';
    END IF;
END
$$;

-- Create database if it doesn't exist (safe for all platforms)
SELECT 'CREATE DATABASE fund_accounting_db OWNER npfadmin'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fund_accounting_db')\gexec

-- Grant privileges
GRANT ALL ON DATABASE fund_accounting_db TO npfadmin;

\echo 'Database setup complete!'
\echo 'Use these credentials in your .env file:'
\echo 'PGUSER=npfadmin'
\echo 'PGPASSWORD=npfa123'
\echo 'PGDATABASE=fund_accounting_db'
