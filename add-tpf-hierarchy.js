/**
 * @file add-tpf-hierarchy.js
 * @description Script to add The Principle Foundation entity hierarchy to the fund accounting database.
 * This script creates three entities under the top-level "The Principle Foundation" parent:
 * - The Principle Foundation (TPF)
 * - TPF Educational Services (TPF-ES)
 * - IFCSN (IFCSN)
 * Each entity gets a standard chart of accounts and funds.
 */

const { Client } = require('pg');
const { getDbConfig } = require('./src/db/db-config');
const crypto = require('crypto');

// Generate a UUID
function generateId() {
    return crypto.randomUUID();
}

// Create a PostgreSQL client with the resolved configuration
const client = new Client(getDbConfig());

// Helper to log rich errors
function logError(prefix, err) {
    console.error(`${prefix}: ${err.message}`);
    if (err.code)    console.error('  code   :', err.code);
    if (err.detail)  console.error('  detail :', err.detail);
    if (err.stack)   console.error('  stack  :\n', err.stack);
}

// Standard chart of accounts to be added to each entity
const standardAccounts = [
    { code: '1010', name: 'Cash and Bank', type: 'Asset', status: 'Active', description: 'Cash in bank accounts', balance: 10000.00 },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset', status: 'Active', description: 'Outstanding receivables', balance: 0.00 },
    { code: '1200', name: 'Grants Receivable', type: 'Asset', status: 'Active', description: 'Expected grant payments', balance: 0.00 },
    { code: '2010', name: 'Accounts Payable', type: 'Liability', status: 'Active', description: 'Outstanding payables', balance: 0.00 },
    { code: '3000', name: 'Net Assets - Unrestricted', type: 'Net Assets', status: 'Active', description: 'Unrestricted net assets', balance: 10000.00 },
    { code: '4010', name: 'Grant Revenue', type: 'Revenue', status: 'Active', description: 'Revenue from grants', balance: 0.00 },
    { code: '4020', name: 'Donation Revenue', type: 'Revenue', status: 'Active', description: 'Revenue from donations', balance: 0.00 },
    { code: '5010', name: 'Programmatic Grants', type: 'Expense', status: 'Active', description: 'Grants to programs', balance: 0.00 },
    { code: '5020', name: 'Salaries and Wages', type: 'Expense', status: 'Active', description: 'Staff compensation', balance: 0.00 },
    { code: '5030', name: 'Lobbying & Advocacy', type: 'Expense', status: 'Active', description: 'Advocacy expenses', balance: 0.00 },
    { code: '5040', name: 'Capital Expenditures', type: 'Expense', status: 'Active', description: 'Capital expenses', balance: 0.00 }
];

// Standard funds to be added to each entity
const standardFunds = [
    { code: 'GEN', name: 'General Fund', type: 'Unrestricted', status: 'Active', description: 'General operating fund', balance: 10000.00 },
    { code: 'REST', name: 'Restricted Fund', type: 'Temporarily Restricted', status: 'Active', description: 'Temporarily restricted funds', balance: 0.00 }
];

// Entity-specific funds
const entitySpecificFunds = {
    'TPF': [
        { code: 'TPF-GEN', name: 'TPF General Fund', type: 'Unrestricted', status: 'Active', description: 'TPF general operating fund', balance: 5000.00 },
        { code: 'TPF-SCH', name: 'TPF Scholarship Fund', type: 'Temporarily Restricted', status: 'Active', description: 'Scholarship program fund', balance: 2500.00 }
    ],
    'TPF-ES': [
        { code: 'ES-GRNT', name: 'ES Grant Fund', type: 'Temporarily Restricted', status: 'Active', description: 'Educational grants fund', balance: 3000.00 },
        { code: 'ES-ADV', name: 'ES Advocacy Fund', type: 'Temporarily Restricted', status: 'Active', description: 'Educational advocacy fund', balance: 1500.00 }
    ],
    'IFCSN': [
        { code: 'IFCSN-COM', name: 'IFCSN Community Fund', type: 'Temporarily Restricted', status: 'Active', description: 'Community support fund', balance: 2000.00 },
        { code: 'IFCSN-SP', name: 'IFCSN Special Projects', type: 'Temporarily Restricted', status: 'Active', description: 'Special projects fund', balance: 1000.00 }
    ]
};

// Function to create entities, accounts, and funds
async function createTPFHierarchy() {
    try {
        // Connect to database
        await client.connect();
        console.log('Connected to database');

        // Begin transaction
        await client.query('BEGIN');

        // Step 1: Find the TPF_PARENT entity
        console.log('Looking for TPF_PARENT entity...');
        const parentResult = await client.query(
            'SELECT id FROM entities WHERE code = $1',
            ['TPF_PARENT']
        );

        if (parentResult.rows.length === 0) {
            throw new Error('TPF_PARENT entity not found. Please run add_top_level_organization.sql first.');
        }

        const parentId = parentResult.rows[0].id;
        console.log(`Found TPF_PARENT entity with ID: ${parentId}`);

        // Step 2: Create the three child entities
        const entities = [
            { id: generateId(), code: 'TPF', name: 'The Principle Foundation', status: 'Active', fiscalYearStart: '01-01', baseCurrency: 'USD', isConsolidated: true, parentId: parentId },
            { id: generateId(), code: 'TPF-ES', name: 'TPF Educational Services', status: 'Active', fiscalYearStart: '01-01', baseCurrency: 'USD', isConsolidated: false, parentId: parentId },
            { id: generateId(), code: 'IFCSN', name: 'IFCSN', status: 'Active', fiscalYearStart: '01-01', baseCurrency: 'USD', isConsolidated: false, parentId: parentId }
        ];

        const entityIds = {};

        for (const entity of entities) {
            const result = await client.query(
                `INSERT INTO entities(
                    id, code, name, status, fiscal_year_start, base_currency, is_consolidated, parent_entity_id
                ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
                ON CONFLICT (code) DO UPDATE 
                SET name = $3, status = $4, fiscal_year_start = $5, 
                    base_currency = $6, is_consolidated = $7, parent_entity_id = $8
                RETURNING id`,
                [
                    entity.id, 
                    entity.code, 
                    entity.name, 
                    entity.status, 
                    entity.fiscalYearStart, 
                    entity.baseCurrency, 
                    entity.isConsolidated, 
                    entity.parentId
                ]
            );
            
            entityIds[entity.code] = result.rows[0].id;
            console.log(`Entity ${entity.name} (${entity.code}) created or updated with ID: ${result.rows[0].id}`);
        }

        // Step 3: Add standard chart of accounts for each entity
        console.log('\nAdding standard chart of accounts to each entity...');
        for (const entityCode of Object.keys(entityIds)) {
            const entityId = entityIds[entityCode];
            
            for (const account of standardAccounts) {
                await client.query(
                    `INSERT INTO accounts(
                        id, entity_id, code, name, type, status, description, balance
                    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (entity_id, code) DO UPDATE 
                    SET name = $4, type = $5, status = $6, description = $7, balance = $8`,
                    [
                        generateId(), 
                        entityId, 
                        account.code, 
                        account.name, 
                        account.type, 
                        account.status, 
                        account.description, 
                        account.balance
                    ]
                );
            }
            console.log(`Added standard chart of accounts to ${entityCode}`);
        }

        // Step 4: Add standard funds to each entity
        console.log('\nAdding standard funds to each entity...');
        for (const entityCode of Object.keys(entityIds)) {
            const entityId = entityIds[entityCode];
            
            // Add standard funds
            for (const fund of standardFunds) {
                await client.query(
                    `INSERT INTO funds(
                        id, entity_id, code, name, type, status, description, balance
                    ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (entity_id, code) DO UPDATE 
                    SET name = $4, type = $5, status = $6, description = $7, balance = $8`,
                    [
                        generateId(), 
                        entityId, 
                        fund.code, 
                        fund.name, 
                        fund.type, 
                        fund.status, 
                        fund.description, 
                        fund.balance
                    ]
                );
            }
            
            // Add entity-specific funds
            if (entitySpecificFunds[entityCode]) {
                for (const fund of entitySpecificFunds[entityCode]) {
                    await client.query(
                        `INSERT INTO funds(
                            id, entity_id, code, name, type, status, description, balance
                        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (entity_id, code) DO UPDATE 
                        SET name = $4, type = $5, status = $6, description = $7, balance = $8`,
                        [
                            generateId(), 
                            entityId, 
                            fund.code, 
                            fund.name, 
                            fund.type, 
                            fund.status, 
                            fund.description, 
                            fund.balance
                        ]
                    );
                }
            }
            
            console.log(`Added funds to ${entityCode}`);
        }

        // Commit transaction
        await client.query('COMMIT');
        console.log('\nTransaction committed successfully');
        console.log('The Principle Foundation hierarchy has been successfully created!');
        
        // Query and display the hierarchy
        const hierarchyResult = await client.query(`
            SELECT 
                e1.code, 
                e1.name, 
                e2.code as parent_code, 
                e2.name as parent_name,
                e1.is_consolidated
            FROM 
                entities e1
            LEFT JOIN 
                entities e2 ON e1.parent_entity_id = e2.id
            ORDER BY 
                CASE WHEN e1.parent_entity_id IS NULL THEN 0 ELSE 1 END,
                e1.name
        `);
        
        console.log('\nEntity Hierarchy:');
        console.table(hierarchyResult.rows);

    } catch (error) {
        // Attempt rollback; if that fails we still want to surface original error
        try {
            await client.query('ROLLBACK');
            console.log('Transaction rolled back due to error');
        } catch (rbErr) {
            logError('Rollback failed', rbErr);
        }
        logError('Error creating TPF hierarchy', error);
    } finally {
        // Always close the client, even if connection failed part-way
        try {
            await client.end();
            console.log('Database connection closed');
        } catch (endErr) {
            logError('Error closing database connection', endErr);
        }
    }
}

// Run the hierarchy creation
createTPFHierarchy().catch(err => {
    console.error('Failed to create TPF hierarchy:', err);
    process.exit(1);
});
