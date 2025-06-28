/**
 * @file add-consolidated-test-data.js
 * @description Script to add test data for consolidation to the six funds in the TPF hierarchy
 * Creates journal entries for each fund and includes inter-entity transactions
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

// Main function to add consolidated test data
async function addConsolidatedTestData() {
    const client = new Client(getDbConfig());
    
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected to database');
        
        // Start a transaction
        await client.query('BEGIN');
        
        // Step 1: Get entity IDs
        console.log('Fetching entity IDs...');
        const tpfParentResult = await client.query("SELECT id FROM entities WHERE code = 'TPF_PARENT'");
        const tpfResult = await client.query("SELECT id FROM entities WHERE code = 'TPF'");
        const tpfEsResult = await client.query("SELECT id FROM entities WHERE code = 'TPF-ES'");
        const ifcsnResult = await client.query("SELECT id FROM entities WHERE code = 'IFCSN'");
        
        if (tpfParentResult.rows.length === 0 || tpfResult.rows.length === 0 || 
            tpfEsResult.rows.length === 0 || ifcsnResult.rows.length === 0) {
            throw new Error('One or more required entities not found. Please run add-tpf-hierarchy.js first.');
        }
        
        const tpfParentId = tpfParentResult.rows[0].id;
        const tpfId = tpfResult.rows[0].id;
        const tpfEsId = tpfEsResult.rows[0].id;
        const ifcsnId = ifcsnResult.rows[0].id;
        
        console.log('Entity IDs fetched successfully');
        
        // Step 2: Get fund IDs
        console.log('Fetching fund IDs...');
        const funds = {
            'TPF-GEN': await getFundId(client, tpfId, 'TPF-GEN'),
            'TPF-SCH': await getFundId(client, tpfId, 'TPF-SCH'),
            'ES-GRNT': await getFundId(client, tpfEsId, 'ES-GRNT'),
            'ES-ADV': await getFundId(client, tpfEsId, 'ES-ADV'),
            'IFCSN-COM': await getFundId(client, ifcsnId, 'IFCSN-COM'),
            'IFCSN-SP': await getFundId(client, ifcsnId, 'IFCSN-SP')
        };
        
        // Verify all funds exist
        for (const [code, id] of Object.entries(funds)) {
            if (!id) {
                throw new Error(`Fund ${code} not found. Please run add-tpf-hierarchy.js first.`);
            }
        }
        
        console.log('Fund IDs fetched successfully');
        
        // Step 3: Ensure inter-entity accounts exist
        console.log('Ensuring inter-entity accounts exist...');
        
        // TPF accounts
        const tpfDueFromId = await ensureAccount(client, {
            entity_id: tpfId,
            code: '1900',
            name: 'Due From TPF-ES',
            type: 'Asset',
            status: 'Active',
            description: 'Receivable from TPF Educational Services',
            balance: 0
        });
        
        // TPF-ES accounts
        const tpfEsDueToId = await ensureAccount(client, {
            entity_id: tpfEsId,
            code: '2900',
            name: 'Due To TPF',
            type: 'Liability',
            status: 'Active',
            description: 'Payable to The Principle Foundation',
            balance: 0
        });
        
        // IFCSN accounts (for potential inter-entity transactions)
        const ifcsnDueToId = await ensureAccount(client, {
            entity_id: ifcsnId,
            code: '2900',
            name: 'Due To TPF',
            type: 'Liability',
            status: 'Active',
            description: 'Payable to The Principle Foundation',
            balance: 0
        });
        
        // Step 4: Ensure standard accounts exist for each entity
        console.log('Ensuring standard accounts exist...');
        
        // TPF accounts
        const tpfAccounts = {
            cash: await ensureAccount(client, { entity_id: tpfId, code: '1010', name: 'Cash and Bank', type: 'Asset' }),
            receivable: await ensureAccount(client, { entity_id: tpfId, code: '1100', name: 'Accounts Receivable', type: 'Asset' }),
            payable: await ensureAccount(client, { entity_id: tpfId, code: '2010', name: 'Accounts Payable', type: 'Liability' }),
            donation: await ensureAccount(client, { entity_id: tpfId, code: '4020', name: 'Donation Revenue', type: 'Revenue' }),
            grants: await ensureAccount(client, { entity_id: tpfId, code: '5010', name: 'Programmatic Grants', type: 'Expense' })
        };
        
        // TPF-ES accounts
        const tpfEsAccounts = {
            cash: await ensureAccount(client, { entity_id: tpfEsId, code: '1010', name: 'Cash and Bank', type: 'Asset' }),
            receivable: await ensureAccount(client, { entity_id: tpfEsId, code: '1100', name: 'Accounts Receivable', type: 'Asset' }),
            payable: await ensureAccount(client, { entity_id: tpfEsId, code: '2010', name: 'Accounts Payable', type: 'Liability' }),
            grantRev: await ensureAccount(client, { entity_id: tpfEsId, code: '4010', name: 'Grant Revenue', type: 'Revenue' }),
            lobbying: await ensureAccount(client, { entity_id: tpfEsId, code: '5030', name: 'Lobbying & Advocacy', type: 'Expense' })
        };
        
        // IFCSN accounts
        const ifcsnAccounts = {
            cash: await ensureAccount(client, { entity_id: ifcsnId, code: '1010', name: 'Cash and Bank', type: 'Asset' }),
            receivable: await ensureAccount(client, { entity_id: ifcsnId, code: '1100', name: 'Accounts Receivable', type: 'Asset' }),
            payable: await ensureAccount(client, { entity_id: ifcsnId, code: '2010', name: 'Accounts Payable', type: 'Liability' }),
            donation: await ensureAccount(client, { entity_id: ifcsnId, code: '4020', name: 'Donation Revenue', type: 'Revenue' }),
            capital: await ensureAccount(client, { entity_id: ifcsnId, code: '5040', name: 'Capital Expenditures', type: 'Expense' })
        };
        
        // Step 5: Create journal entries for each fund
        console.log('Creating journal entries...');
        
        // 1. TPF-GEN: General donation received
        const tpfGenJeId = await createJournalEntry(client, {
            entity_id: tpfId,
            reference_number: 'TPF-GEN-001',
            entry_date: '2025-07-01',
            description: 'General unrestricted donation',
            total_amount: 10000,
            status: 'Posted',
            created_by: 'System'
        });
        
        await createJournalEntryLine(client, tpfGenJeId, tpfAccounts.cash, funds['TPF-GEN'], 10000, 0, 'Cash received');
        await createJournalEntryLine(client, tpfGenJeId, tpfAccounts.donation, funds['TPF-GEN'], 0, 10000, 'Donation revenue');
        
        // 2. TPF-SCH: Scholarship payment
        const tpfSchJeId = await createJournalEntry(client, {
            entity_id: tpfId,
            reference_number: 'TPF-SCH-001',
            entry_date: '2025-07-05',
            description: 'Scholarship disbursement',
            total_amount: 5000,
            status: 'Posted',
            created_by: 'System'
        });
        
        await createJournalEntryLine(client, tpfSchJeId, tpfAccounts.grants, funds['TPF-SCH'], 5000, 0, 'Scholarship expense');
        await createJournalEntryLine(client, tpfSchJeId, tpfAccounts.cash, funds['TPF-SCH'], 0, 5000, 'Cash payment');
        
        // 3. ES-GRNT: Grant received
        const esGrntJeId = await createJournalEntry(client, {
            entity_id: tpfEsId,
            reference_number: 'ES-GRNT-001',
            entry_date: '2025-07-10',
            description: 'Restricted grant for educational programs',
            total_amount: 15000,
            status: 'Posted',
            created_by: 'System'
        });
        
        await createJournalEntryLine(client, esGrntJeId, tpfEsAccounts.cash, funds['ES-GRNT'], 15000, 0, 'Cash received');
        await createJournalEntryLine(client, esGrntJeId, tpfEsAccounts.grantRev, funds['ES-GRNT'], 0, 15000, 'Grant revenue');
        
        // 4. ES-ADV: Lobbying expense
        const esAdvJeId = await createJournalEntry(client, {
            entity_id: tpfEsId,
            reference_number: 'ES-ADV-001',
            entry_date: '2025-07-15',
            description: 'Payment for advocacy services',
            total_amount: 2500,
            status: 'Posted',
            created_by: 'System'
        });
        
        await createJournalEntryLine(client, esAdvJeId, tpfEsAccounts.lobbying, funds['ES-ADV'], 2500, 0, 'Advocacy expense');
        await createJournalEntryLine(client, esAdvJeId, tpfEsAccounts.cash, funds['ES-ADV'], 0, 2500, 'Cash payment');
        
        // 5. IFCSN-COM: Community event revenue
        const ifcsnComJeId = await createJournalEntry(client, {
            entity_id: ifcsnId,
            reference_number: 'IFCSN-COM-001',
            entry_date: '2025-07-20',
            description: 'Revenue from community fundraising event',
            total_amount: 7000,
            status: 'Posted',
            created_by: 'System'
        });
        
        await createJournalEntryLine(client, ifcsnComJeId, ifcsnAccounts.cash, funds['IFCSN-COM'], 7000, 0, 'Cash received');
        await createJournalEntryLine(client, ifcsnComJeId, ifcsnAccounts.donation, funds['IFCSN-COM'], 0, 7000, 'Donation revenue');
        
        // 6. IFCSN-SP: Capital expenditure
        const ifcsnSpJeId = await createJournalEntry(client, {
            entity_id: ifcsnId,
            reference_number: 'IFCSN-SP-001',
            entry_date: '2025-07-25',
            description: 'Purchase of new equipment for special project',
            total_amount: 8000,
            status: 'Posted',
            created_by: 'System'
        });
        
        await createJournalEntryLine(client, ifcsnSpJeId, ifcsnAccounts.capital, funds['IFCSN-SP'], 8000, 0, 'Equipment purchase');
        await createJournalEntryLine(client, ifcsnSpJeId, ifcsnAccounts.cash, funds['IFCSN-SP'], 0, 8000, 'Cash payment');
        
        // Step 6: Create inter-entity transactions (TPF to TPF-ES)
        console.log('Creating inter-entity transactions...');
        
        // Generate a matching transaction ID for the pair
        const matchingTransactionId = generateId();
        
        // TPF sends funds to TPF-ES
        const tpfToEsJeId = await createJournalEntry(client, {
            entity_id: tpfId,
            reference_number: 'IE-TPF-ES-001',
            entry_date: '2025-07-28',
            description: 'Transfer to TPF-ES for operational support',
            total_amount: 3000,
            status: 'Posted',
            created_by: 'System',
            is_inter_entity: true,
            target_entity_id: tpfEsId,
            matching_transaction_id: matchingTransactionId
        });
        
        await createJournalEntryLine(client, tpfToEsJeId, tpfDueFromId, funds['TPF-GEN'], 3000, 0, 'Due from TPF-ES');
        await createJournalEntryLine(client, tpfToEsJeId, tpfAccounts.cash, funds['TPF-GEN'], 0, 3000, 'Cash payment');
        
        // TPF-ES receives funds from TPF
        const esToTpfJeId = await createJournalEntry(client, {
            entity_id: tpfEsId,
            reference_number: 'IE-ES-TPF-001',
            entry_date: '2025-07-28',
            description: 'Funds received from TPF for operational support',
            total_amount: 3000,
            status: 'Posted',
            created_by: 'System',
            is_inter_entity: true,
            target_entity_id: tpfId,
            matching_transaction_id: matchingTransactionId
        });
        
        await createJournalEntryLine(client, esToTpfJeId, tpfEsAccounts.cash, funds['ES-GRNT'], 3000, 0, 'Cash received');
        await createJournalEntryLine(client, esToTpfJeId, tpfEsDueToId, funds['ES-GRNT'], 0, 3000, 'Due to TPF');
        
        // Step 7: Create another inter-entity transaction (TPF to IFCSN)
        const matchingTransactionId2 = generateId();
        
        // TPF sends funds to IFCSN
        const tpfToIfcsnJeId = await createJournalEntry(client, {
            entity_id: tpfId,
            reference_number: 'IE-TPF-IFCSN-001',
            entry_date: '2025-07-30',
            description: 'Transfer to IFCSN for community programs',
            total_amount: 2000,
            status: 'Posted',
            created_by: 'System',
            is_inter_entity: true,
            target_entity_id: ifcsnId,
            matching_transaction_id: matchingTransactionId2
        });
        
        // Create a Due From IFCSN account for TPF if it doesn't exist
        const tpfDueFromIfcsnId = await ensureAccount(client, {
            entity_id: tpfId,
            code: '1910',
            name: 'Due From IFCSN',
            type: 'Asset',
            status: 'Active',
            description: 'Receivable from IFCSN',
            balance: 0
        });
        
        await createJournalEntryLine(client, tpfToIfcsnJeId, tpfDueFromIfcsnId, funds['TPF-GEN'], 2000, 0, 'Due from IFCSN');
        await createJournalEntryLine(client, tpfToIfcsnJeId, tpfAccounts.cash, funds['TPF-GEN'], 0, 2000, 'Cash payment');
        
        // IFCSN receives funds from TPF
        const ifcsnToTpfJeId = await createJournalEntry(client, {
            entity_id: ifcsnId,
            reference_number: 'IE-IFCSN-TPF-001',
            entry_date: '2025-07-30',
            description: 'Funds received from TPF for community programs',
            total_amount: 2000,
            status: 'Posted',
            created_by: 'System',
            is_inter_entity: true,
            target_entity_id: tpfId,
            matching_transaction_id: matchingTransactionId2
        });
        
        await createJournalEntryLine(client, ifcsnToTpfJeId, ifcsnAccounts.cash, funds['IFCSN-COM'], 2000, 0, 'Cash received');
        await createJournalEntryLine(client, ifcsnToTpfJeId, ifcsnDueToId, funds['IFCSN-COM'], 0, 2000, 'Due to TPF');
        
        // Commit the transaction
        await client.query('COMMIT');
        console.log('Transaction committed successfully');
        console.log('Consolidated test data added successfully');
        
    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        logError('Error adding consolidated test data', error);
        throw error;
    } finally {
        // Close client
        await client.end();
        console.log('Database connection closed');
    }
}

// Helper function to get a fund ID
async function getFundId(client, entityId, fundCode) {
    const result = await client.query(
        'SELECT id FROM funds WHERE entity_id = $1 AND code = $2',
        [entityId, fundCode]
    );
    
    return result.rows.length > 0 ? result.rows[0].id : null;
}

// Helper function to ensure an account exists
async function ensureAccount(client, accountData) {
    // Set defaults for optional fields
    const data = {
        status: 'Active',
        description: accountData.name,
        balance: 0,
        ...accountData
    };
    
    // Check if account exists
    const existingResult = await client.query(
        'SELECT id FROM accounts WHERE entity_id = $1 AND code = $2',
        [data.entity_id, data.code]
    );
    
    if (existingResult.rows.length > 0) {
        // Account exists, return its ID
        return existingResult.rows[0].id;
    }
    
    // Account doesn't exist, create it
    const id = generateId();
    await client.query(
        `INSERT INTO accounts(id, entity_id, code, name, type, status, description, balance)
         VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, data.entity_id, data.code, data.name, data.type, data.status, data.description, data.balance]
    );
    
    return id;
}

// Helper function to create a journal entry
async function createJournalEntry(client, jeData) {
    const id = generateId();
    
    await client.query(
        `INSERT INTO journal_entries(
            id, entity_id, reference_number, entry_date, description, 
            total_amount, status, created_by, is_inter_entity, 
            target_entity_id, matching_transaction_id
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
            id, 
            jeData.entity_id, 
            jeData.reference_number, 
            jeData.entry_date, 
            jeData.description, 
            jeData.total_amount, 
            jeData.status, 
            jeData.created_by,
            jeData.is_inter_entity || false,
            jeData.target_entity_id || null,
            jeData.matching_transaction_id || null
        ]
    );
    
    return id;
}

// Helper function to create a journal entry line
async function createJournalEntryLine(client, journalEntryId, accountId, fundId, debitAmount, creditAmount, description) {
    const id = generateId();
    
    await client.query(
        `INSERT INTO journal_entry_lines(
            id, journal_entry_id, account_id, fund_id, 
            debit_amount, credit_amount, description
        ) VALUES($1, $2, $3, $4, $5, $6, $7)`,
        [
            id, 
            journalEntryId, 
            accountId, 
            fundId, 
            debitAmount, 
            creditAmount, 
            description
        ]
    );
    
    return id;
}

// Run the script
addConsolidatedTestData().catch(err => {
    console.error('Failed to add consolidated test data:', err);
    process.exit(1);
});
