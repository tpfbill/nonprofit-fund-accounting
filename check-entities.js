/**
 * @file check-entities.js
 * @description A diagnostic and repair script for the entity hierarchy.
 * This script will:
 * 1. Connect to the database.
 * 2. Query and display the current entity hierarchy.
 * 3. Check for common issues, specifically incorrect `parent_entity_id` links.
 * 4. Automatically fix any detected inconsistencies.
 * 5. Display the corrected hierarchy.
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// --- Database Configuration ---
let dbConfig;
try {
    const configPath = path.join(__dirname, 'src', 'db', 'db-config.js');
    if (fs.existsSync(configPath)) {
        const { getDbConfig } = require(configPath);
        dbConfig = getDbConfig();
        console.log('Loaded database configuration from src/db/db-config.js');
    } else {
        throw new Error('db-config.js not found');
    }
} catch (err) {
    console.warn(`Warning: Could not load db-config.js. Using default configuration. Error: ${err.message}`);
    dbConfig = {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'npfa123',
        database: 'fund_accounting_db'
    };
}

const pool = new Pool(dbConfig);

// --- ANSI Color Codes for Logging ---
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

/**
 * Fetches and displays the current entity hierarchy from the database.
 * @param {object} client - The database client connection.
 * @param {string} title - The title to display before showing the hierarchy.
 */
async function displayHierarchy(client, title) {
    console.log(`\n${colors.bright}${colors.blue}--- ${title} ---${colors.reset}`);
    const { rows } = await client.query(`
        SELECT 
            e.id, 
            e.name, 
            e.code, 
            e.parent_entity_id,
            p.name as parent_name
        FROM 
            entities e
        LEFT JOIN 
            entities p ON e.parent_entity_id = p.id
        ORDER BY 
            CASE WHEN e.parent_entity_id IS NULL THEN 0 ELSE 1 END, 
            e.name;
    `);

    if (rows.length === 0) {
        console.log(`${colors.yellow}No entities found in the database.${colors.reset}`);
        return [];
    }

    console.log(
        `${colors.bright}ID                                    | Name                       | Code       | Parent Name${colors.reset}`
    );
    console.log('-'.repeat(100));

    rows.forEach(row => {
        const parentInfo = row.parent_name ? `(${row.parent_name})` : `${colors.yellow}(NULL)${colors.reset}`;
        console.log(
            `${row.id} | ${row.name.padEnd(26)} | ${row.code.padEnd(10)} | ${parentInfo}`
        );
    });
    
    return rows;
}

/**
 * Main function to execute the check and repair process.
 */
async function main() {
    console.log(`${colors.bright}${colors.cyan}--- Starting Entity Hierarchy Check & Repair Script ---${colors.reset}`);
    const client = await pool.connect();
    console.log('Database connection established.');

    try {
        // First, display the current state
        const initialEntities = await displayHierarchy(client, 'Current Entity State');

        if (initialEntities.length === 0) {
            console.log(`${colors.yellow}No entities to check. Exiting.${colors.reset}`);
            return;
        }

        // --- Verification and Repair Logic ---
        console.log(`\n${colors.bright}${colors.blue}--- Verifying Hierarchy Integrity ---${colors.reset}`);
        
        const parentEntity = initialEntities.find(e => e.code === 'TPF_PARENT');
        const childEntities = initialEntities.filter(e => ['TPF', 'TPF-ES', 'IFCSN'].includes(e.code));
        
        let fixesNeeded = 0;
        const queriesToRun = [];

        if (!parentEntity) {
            console.error(`${colors.red}CRITICAL: Parent entity 'The Principle Foundation' (TPF_PARENT) not found. Cannot proceed with repairs.${colors.reset}`);
            return;
        }

        console.log(`Found Parent Entity: '${parentEntity.name}' (ID: ${parentEntity.id})`);

        // Check 1: Ensure parent has no parent_entity_id
        if (parentEntity.parent_entity_id !== null) {
            fixesNeeded++;
            console.log(`${colors.yellow}Issue Found: Parent entity has a non-NULL parent_entity_id. It will be corrected.${colors.reset}`);
            queriesToRun.push({
                text: 'UPDATE entities SET parent_entity_id = NULL WHERE id = $1',
                values: [parentEntity.id]
            });
        } else {
            console.log(`${colors.green}OK: Parent entity has correct NULL parent.${colors.reset}`);
        }

        // Check 2: Ensure all child entities point to the correct parent
        childEntities.forEach(child => {
            if (child.parent_entity_id !== parentEntity.id) {
                fixesNeeded++;
                console.log(`${colors.yellow}Issue Found: Child entity '${child.name}' has incorrect parent. It will be corrected.${colors.reset}`);
                queriesToRun.push({
                    text: 'UPDATE entities SET parent_entity_id = $1 WHERE id = $2',
                    values: [parentEntity.id, child.id]
                });
            } else {
                console.log(`${colors.green}OK: Child entity '${child.name}' points to the correct parent.${colors.reset}`);
            }
        });

        // --- Apply Fixes if Needed ---
        if (fixesNeeded > 0) {
            console.log(`\n${colors.bright}${colors.yellow}Found ${fixesNeeded} issue(s). Applying fixes...${colors.reset}`);
            await client.query('BEGIN');
            console.log('Transaction started.');

            for (const query of queriesToRun) {
                await client.query(query.text, query.values);
                console.log(`  -> Executed: ${query.text.replace('$1', `'${query.values[0]}'`).replace('$2', `'${query.values[1] || ''}'`)}`);
            }

            await client.query('COMMIT');
            console.log(`${colors.green}Transaction committed successfully.${colors.reset}`);

            // Display the state again after fixing
            await displayHierarchy(client, 'Corrected Entity State');
        } else {
            console.log(`\n${colors.bright}${colors.green}No hierarchy issues found. Everything looks correct!${colors.reset}`);
        }

    } catch (error) {
        console.error(`${colors.bright}${colors.red}\n--- SCRIPT ERROR! ---${colors.reset}`);
        console.error('An error occurred during the script execution.');
        console.error(error);
        // Attempt to rollback if a transaction was started
        try {
            await client.query('ROLLBACK');
            console.log('Transaction was rolled back.');
        } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
        }
        process.exit(1);
    } finally {
        client.release();
        console.log('\nDatabase connection released.');
        pool.end();
    }
}

// Execute the script
main().catch(err => {
    console.error('Unhandled error in main execution:', err);
    process.exit(1);
});
