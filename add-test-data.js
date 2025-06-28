/**
 * @file add-test-data.js
 * @description Script to add test data to the Non-Profit Fund Accounting System database.
 */

const { Client } = require('pg');
const crypto = require('crypto');
const { getDbConfig } = require('./src/db/db-config');

// Generate a UUID
function generateId() {
    return crypto.randomUUID();
}

// Helper to log rich errors
function logError(prefix, err) {
    console.error(`${prefix}: ${err.message}`);
    if (err.code)    console.error('  code   :', err.code);
    if (err.detail)  console.error('  detail :', err.detail);
    if (err.stack)   console.error('  stack  :\n', err.stack);
}

// Create a PostgreSQL client with the resolved configuration
const client = new Client(getDbConfig());

// Sample data
const entities = [
    { id: generateId(), code: 'MAIN', name: 'Main Organization', status: 'Active', fiscalYearStart: '01-01', baseCurrency: 'USD', isConsolidated: false }
];

const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const accounts = [
    // Asset accounts
    { entityId: null, code: '1000', name: 'Cash', type: 'Asset', status: 'Active', description: 'Cash in bank', balance: 10000.00 },
    { entityId: null, code: '1100', name: 'Accounts Receivable', type: 'Asset', status: 'Active', description: 'Outstanding receivables', balance: 5000.00 },
    { entityId: null, code: '1200', name: 'Prepaid Expenses', type: 'Asset', status: 'Active', description: 'Prepaid expenses', balance: 2500.00 },
    
    // Liability accounts
    { entityId: null, code: '2000', name: 'Accounts Payable', type: 'Liability', status: 'Active', description: 'Outstanding payables', balance: 3000.00 },
    { entityId: null, code: '2100', name: 'Accrued Expenses', type: 'Liability', status: 'Active', description: 'Accrued expenses', balance: 1000.00 },
    
    // Equity accounts
    { entityId: null, code: '3000', name: 'Net Assets - Unrestricted', type: 'Equity', status: 'Active', description: 'Unrestricted net assets', balance: 8500.00 },
    { entityId: null, code: '3100', name: 'Net Assets - Temporarily Restricted', type: 'Equity', status: 'Active', description: 'Temporarily restricted net assets', balance: 5000.00 },
    
    // Revenue accounts
    { entityId: null, code: '4000', name: 'Contributions - Unrestricted', type: 'Revenue', status: 'Active', description: 'Unrestricted contributions', balance: 0.00 },
    { entityId: null, code: '4100', name: 'Contributions - Restricted', type: 'Revenue', status: 'Active', description: 'Restricted contributions', balance: 0.00 },
    { entityId: null, code: '4200', name: 'Grant Revenue', type: 'Revenue', status: 'Active', description: 'Grant revenue', balance: 0.00 },
    
    // Expense accounts
    { entityId: null, code: '5000', name: 'Salaries and Wages', type: 'Expense', status: 'Active', description: 'Salaries and wages', balance: 0.00 },
    { entityId: null, code: '5100', name: 'Employee Benefits', type: 'Expense', status: 'Active', description: 'Employee benefits', balance: 0.00 },
    { entityId: null, code: '5200', name: 'Office Supplies', type: 'Expense', status: 'Active', description: 'Office supplies', balance: 0.00 },
    { entityId: null, code: '5300', name: 'Professional Services', type: 'Expense', status: 'Active', description: 'Professional services', balance: 0.00 },
    { entityId: null, code: '5400', name: 'Rent', type: 'Expense', status: 'Active', description: 'Rent expense', balance: 0.00 }
];

const funds = [
    { entityId: null, code: 'GEN', name: 'General Fund', type: 'Unrestricted', status: 'Active', description: 'General operating fund', balance: 0.00 },
    { entityId: null, code: 'PROG1', name: 'Program 1 Fund', type: 'Temporarily Restricted', status: 'Active', description: 'Program 1 restricted fund', balance: 0.00 },
    { entityId: null, code: 'PROG2', name: 'Program 2 Fund', type: 'Temporarily Restricted', status: 'Active', description: 'Program 2 restricted fund', balance: 0.00 },
    { entityId: null, code: 'ENDOW', name: 'Endowment Fund', type: 'Permanently Restricted', status: 'Active', description: 'Endowment fund', balance: 0.00 }
];

const journalEntries = [
    {
        entityId: null,
        entryDate: '2025-06-01',
        referenceNumber: 'JE001',
        description: 'Initial contribution receipt',
        status: 'Posted',
        isInterEntity: false,
        totalAmount: 5000.00,
        createdBy: 'System',
        lines: [
            // Will be populated with IDs after accounts and funds are created
        ]
    },
    {
        entityId: null,
        entryDate: '2025-06-05',
        referenceNumber: 'JE002',
        description: 'Monthly rent payment',
        status: 'Posted',
        isInterEntity: false,
        totalAmount: 1000.00,
        createdBy: 'System',
        lines: [
            // Will be populated with IDs after accounts and funds are created
        ]
    }
];

// Insert data functions
async function insertTestData() {
    try {
        // Connect to database
        await client.connect();
        console.log('Connected to database');

        // Begin transaction
        await client.query('BEGIN');

        // Insert entities
        for (const entity of entities) {
            const result = await client.query(
                'INSERT INTO entities(id, code, name, status, fiscal_year_start, base_currency, is_consolidated) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                [entity.id, entity.code, entity.name, entity.status, entity.fiscalYearStart, entity.baseCurrency, entity.isConsolidated]
            );
            console.log(`Inserted entity: ${entity.name} with ID: ${result.rows[0].id}`);
            
            // Update entityId for all accounts and funds
            accounts.forEach(account => account.entityId = entity.id);
            funds.forEach(fund => fund.entityId = entity.id);
            journalEntries.forEach(je => je.entityId = entity.id);
        }

        // Insert accounts
        const accountIds = {};
        for (const account of accounts) {
            const id = generateId();
            accountIds[account.code] = id;
            
            await client.query(
                'INSERT INTO accounts(id, entity_id, code, name, type, status, description, balance) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, account.entityId, account.code, account.name, account.type, account.status, account.description, account.balance]
            );
            console.log(`Inserted account: ${account.code} - ${account.name}`);
        }

        // Insert funds
        const fundIds = {};
        for (const fund of funds) {
            const id = generateId();
            fundIds[fund.code] = id;
            
            await client.query(
                'INSERT INTO funds(id, entity_id, code, name, type, status, description, balance) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, fund.entityId, fund.code, fund.name, fund.type, fund.status, fund.description, fund.balance]
            );
            console.log(`Inserted fund: ${fund.code} - ${fund.name}`);
        }

        // Add lines to journal entries
        journalEntries[0].lines = [
            { accountId: accountIds['1000'], fundId: fundIds['GEN'], debitAmount: 5000.00, creditAmount: 0.00, description: 'Cash received' },
            { accountId: accountIds['4000'], fundId: fundIds['GEN'], debitAmount: 0.00, creditAmount: 5000.00, description: 'Contribution revenue' }
        ];

        journalEntries[1].lines = [
            { accountId: accountIds['5400'], fundId: fundIds['GEN'], debitAmount: 1000.00, creditAmount: 0.00, description: 'Rent expense' },
            { accountId: accountIds['1000'], fundId: fundIds['GEN'], debitAmount: 0.00, creditAmount: 1000.00, description: 'Cash payment' }
        ];

        // Insert journal entries
        for (const je of journalEntries) {
            const jeId = generateId();
            
            await client.query(
                'INSERT INTO journal_entries(id, entity_id, entry_date, reference_number, description, status, is_inter_entity, total_amount, created_by) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [jeId, je.entityId, je.entryDate, je.referenceNumber, je.description, je.status, je.isInterEntity, je.totalAmount, je.createdBy]
            );
            console.log(`Inserted journal entry: ${je.referenceNumber} - ${je.description}`);
            
            // Insert journal entry lines
            for (const line of je.lines) {
                await client.query(
                    'INSERT INTO journal_entry_lines(id, journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description) VALUES($1, $2, $3, $4, $5, $6, $7)',
                    [generateId(), jeId, line.accountId, line.fundId, line.debitAmount, line.creditAmount, line.description]
                );
            }
            console.log(`Added ${je.lines.length} lines to journal entry: ${je.referenceNumber}`);
        }

        // Commit transaction
        await client.query('COMMIT');
        console.log('Transaction committed successfully');

    } catch (error) {
        // Attempt rollback; if that fails we still want to surface original error
        try {
            await client.query('ROLLBACK');
        } catch (rbErr) {
            logError('Rollback failed', rbErr);
        }
        logError('Error inserting test data', error);
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

// Run the data insertion
insertTestData().catch(err => console.error('Failed to insert test data:', err));
