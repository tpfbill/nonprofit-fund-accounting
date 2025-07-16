/**
 * @file load-principle-foundation-data.js
 * @description Consolidated script to load The Principle Foundation test data.
 * This script is idempotent and can be run multiple times safely.
 * 
 * It performs the following actions:
 * 1. Creates/updates The Principle Foundation parent entity (TPF_PARENT)
 * 2. Creates/updates the hierarchy (TPF, TPF-ES, IFCSN)
 * 3. Creates standard chart of accounts for each entity
 * 4. Creates standard funds for each entity
 * 5. Sets initial fund balances
 */

const { Client } = require('pg');
const crypto = require('crypto');
const { getDbConfig } = require('./src/db/db-config');

// Configuration
const CONFIG = {
  ENTITIES: {
    TPF_PARENT: {
      name: 'The Principle Foundation',
      code: 'TPF_PARENT',
      is_consolidated: true
    },
    TPF: {
      name: 'The Principle Foundation',
      code: 'TPF',
      is_consolidated: true
    },
    TPF_ES: {
      name: 'TPF Educational Services',
      code: 'TPF-ES',
      is_consolidated: false
    },
    IFCSN: {
      name: 'IFCSN',
      code: 'IFCSN',
      is_consolidated: false
    }
  },
  // Standard chart of accounts for nonprofit organizations
  ACCOUNTS: [
    { code: '1000', name: 'Cash', type: 'Asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
    { code: '1200', name: 'Prepaid Expenses', type: 'Asset' },
    { code: '1300', name: 'Investments', type: 'Asset' },
    { code: '2000', name: 'Accounts Payable', type: 'Liability' },
    { code: '2100', name: 'Accrued Expenses', type: 'Liability' },
    { code: '2200', name: 'Deferred Revenue', type: 'Liability' },
    { code: '3000', name: 'Net Assets - Unrestricted', type: 'Equity' },
    { code: '3100', name: 'Net Assets - Temporarily Restricted', type: 'Equity' },
    { code: '3200', name: 'Net Assets - Permanently Restricted', type: 'Equity' },
    { code: '4000', name: 'Contributions - Unrestricted', type: 'Revenue' },
    { code: '4100', name: 'Contributions - Restricted', type: 'Revenue' },
    { code: '4200', name: 'Grant Revenue', type: 'Revenue' },
    { code: '4300', name: 'Program Service Fees', type: 'Revenue' },
    { code: '4400', name: 'Investment Income', type: 'Revenue' },
    { code: '5000', name: 'Salaries and Wages', type: 'Expense' },
    { code: '5100', name: 'Employee Benefits', type: 'Expense' },
    { code: '5200', name: 'Office Supplies', type: 'Expense' },
    { code: '5300', name: 'Professional Services', type: 'Expense' },
    { code: '5400', name: 'Rent', type: 'Expense' },
    { code: '5500', name: 'Travel', type: 'Expense' },
    { code: '5600', name: 'Program Expenses', type: 'Expense' },
    { code: '5700', name: 'Grants and Assistance', type: 'Expense' },
    { code: '9100', name: 'Inter-Entity Transfers', type: 'Transfer' }
  ],
  // Standard funds
  FUNDS: {
    TPF: [
      { code: 'GEN', name: 'General Fund', type: 'Unrestricted', balance: 10000, description: 'General operating fund' },
      { code: 'REST', name: 'Restricted Fund', type: 'Temporarily Restricted', balance: 0, description: 'Temporarily restricted funds' },
      { code: 'TPF-GEN', name: 'TPF General Fund', type: 'Unrestricted', balance: 5000, description: 'TPF general operating fund' },
      { code: 'TPF-SCH', name: 'TPF Scholarship Fund', type: 'Temporarily Restricted', balance: 2500, description: 'Scholarship program fund' }
    ],
    TPF_ES: [
      { code: 'GEN', name: 'General Fund', type: 'Unrestricted', balance: 10000, description: 'General operating fund' },
      { code: 'REST', name: 'Restricted Fund', type: 'Temporarily Restricted', balance: 0, description: 'Temporarily restricted funds' },
      { code: 'ES-ADV', name: 'ES Advocacy Fund', type: 'Temporarily Restricted', balance: 1500, description: 'Educational advocacy fund' },
      { code: 'ES-GRNT', name: 'ES Grant Fund', type: 'Temporarily Restricted', balance: 3000, description: 'Educational grants fund' }
    ],
    IFCSN: [
      { code: 'GEN', name: 'General Fund', type: 'Unrestricted', balance: 10000, description: 'General operating fund' },
      { code: 'REST', name: 'Restricted Fund', type: 'Temporarily Restricted', balance: 0, description: 'Temporarily restricted funds' },
      { code: 'IFCSN-COM', name: 'IFCSN Community Fund', type: 'Temporarily Restricted', balance: 2000, description: 'Community support fund' },
      { code: 'IFCSN-SP', name: 'IFCSN Special Projects', type: 'Temporarily Restricted', balance: 1000, description: 'Special projects fund' }
    ]
  }
};

// Helper Functions
function generateId() {
  return crypto.randomUUID();
}

function logInfo(message) {
  console.log(message);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(prefix, err) {
  console.error(`❌ ${prefix}: ${err.message}`);
  if (err.code) console.error('  code   :', err.code);
  if (err.detail) console.error('  detail :', err.detail);
  if (err.stack) console.error('  stack  :\n', err.stack);
}

// Main function to load Principle Foundation data
async function loadPrincipleFoundationData() {
  const client = new Client(getDbConfig());
  
  try {
    logInfo('Connecting to database...');
    await client.connect();
    logSuccess('Connected to database');

    // Start transaction
    await client.query('BEGIN');

    // Step 1: Create/update the top-level parent entity
    const parentEntityId = await createTopLevelEntity(client);
    logSuccess(`Top-level parent entity created/updated with ID: ${parentEntityId}`);

    // Step 2: Create/update the TPF hierarchy
    const entityIds = await createEntityHierarchy(client, parentEntityId);
    logSuccess('Entity hierarchy created/updated successfully');

    // Step 3: Create standard chart of accounts for each entity
    await createChartOfAccounts(client, entityIds);
    logSuccess('Standard chart of accounts created for all entities');

    // Step 4: Create standard funds for each entity
    await createFunds(client, entityIds);
    logSuccess('Standard funds created for all entities');

    // Commit the transaction
    await client.query('COMMIT');
    logSuccess('Transaction committed successfully');

    // Display the entity hierarchy
    await displayEntityHierarchy(client);

    return { success: true, message: 'The Principle Foundation data loaded successfully' };
  } catch (err) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logError('Error loading Principle Foundation data', err);
    return { success: false, error: err.message };
  } finally {
    // Close the database connection
    await client.end();
    logInfo('Database connection closed');
  }
}

// Create or update the top-level parent entity
async function createTopLevelEntity(client) {
  const { name, code, is_consolidated } = CONFIG.ENTITIES.TPF_PARENT;
  
  logInfo(`Creating/updating top-level entity: ${name} (${code})...`);
  
  // Check if the entity already exists
  const checkResult = await client.query(
    'SELECT id FROM entities WHERE code = $1',
    [code]
  );
  
  let entityId;
  
  if (checkResult.rows.length > 0) {
    // Update existing entity
    entityId = checkResult.rows[0].id;
    await client.query(
      'UPDATE entities SET name = $1, is_consolidated = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, is_consolidated, entityId]
    );
    logInfo(`Updated existing top-level entity with ID: ${entityId}`);
  } else {
    // Create new entity
    entityId = generateId();
    await client.query(
      'INSERT INTO entities (id, name, code, parent_entity_id, is_consolidated) VALUES ($1, $2, $3, NULL, $4)',
      [entityId, name, code, is_consolidated]
    );
    logInfo(`Created new top-level entity with ID: ${entityId}`);
  }
  
  return entityId;
}

// Create or update the entity hierarchy
async function createEntityHierarchy(client, parentEntityId) {
  logInfo('Creating/updating entity hierarchy...');
  
  const entityIds = {
    TPF_PARENT: parentEntityId
  };
  
  // Create/update TPF, TPF-ES, and IFCSN entities
  for (const entityKey of ['TPF', 'TPF_ES', 'IFCSN']) {
    const entityCode = CONFIG.ENTITIES[entityKey].code;
    const entityName = CONFIG.ENTITIES[entityKey].name;
    const isConsolidated = CONFIG.ENTITIES[entityKey].is_consolidated;
    
    // Check if entity already exists
    const checkResult = await client.query(
      'SELECT id FROM entities WHERE code = $1',
      [entityCode]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing entity
      entityIds[entityKey] = checkResult.rows[0].id;
      await client.query(
        'UPDATE entities SET name = $1, parent_entity_id = $2, is_consolidated = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [entityName, parentEntityId, isConsolidated, entityIds[entityKey]]
      );
      logInfo(`Updated existing entity: ${entityName} (${entityCode}) with ID: ${entityIds[entityKey]}`);
    } else {
      // Create new entity
      entityIds[entityKey] = generateId();
      await client.query(
        'INSERT INTO entities (id, name, code, parent_entity_id, is_consolidated) VALUES ($1, $2, $3, $4, $5)',
        [entityIds[entityKey], entityName, entityCode, parentEntityId, isConsolidated]
      );
      logInfo(`Created new entity: ${entityName} (${entityCode}) with ID: ${entityIds[entityKey]}`);
    }
  }
  
  return entityIds;
}

// Create standard chart of accounts for each entity
async function createChartOfAccounts(client, entityIds) {
  logInfo('Creating standard chart of accounts for each entity...');
  
  for (const entityKey of ['TPF', 'TPF_ES', 'IFCSN']) {
    const entityId = entityIds[entityKey];
    
    for (const account of CONFIG.ACCOUNTS) {
      // Check if account already exists for this entity
      const checkResult = await client.query(
        'SELECT id FROM accounts WHERE entity_id = $1 AND code = $2',
        [entityId, account.code]
      );
      
      if (checkResult.rows.length === 0) {
        // Create new account
        const accountId = generateId();
        await client.query(
          'INSERT INTO accounts (id, entity_id, code, name, type) VALUES ($1, $2, $3, $4, $5)',
          [accountId, entityId, account.code, account.name, account.type]
        );
        logInfo(`Created account ${account.code} - ${account.name} for ${CONFIG.ENTITIES[entityKey].name}`);
      }
    }
    
    logSuccess(`Completed chart of accounts for ${CONFIG.ENTITIES[entityKey].name}`);
  }
}

// Create standard funds for each entity
async function createFunds(client, entityIds) {
  logInfo('Creating standard funds for each entity...');
  
  for (const entityKey of ['TPF', 'TPF_ES', 'IFCSN']) {
    const entityId = entityIds[entityKey];
    const funds = CONFIG.FUNDS[entityKey];
    
    for (const fund of funds) {
      // Check if fund already exists for this entity
      const checkResult = await client.query(
        'SELECT id FROM funds WHERE entity_id = $1 AND code = $2',
        [entityId, fund.code]
      );
      
      if (checkResult.rows.length === 0) {
        // Create new fund
        const fundId = generateId();
        await client.query(
          'INSERT INTO funds (id, entity_id, code, name, type, balance, description) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [fundId, entityId, fund.code, fund.name, fund.type, fund.balance, fund.description]
        );
        logInfo(`Created fund ${fund.code} - ${fund.name} for ${CONFIG.ENTITIES[entityKey].name} with balance ${fund.balance}`);
      } else {
        // Update existing fund's balance
        await client.query(
          'UPDATE funds SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE entity_id = $2 AND code = $3',
          [fund.balance, entityId, fund.code]
        );
        logInfo(`Updated fund ${fund.code} - ${fund.name} for ${CONFIG.ENTITIES[entityKey].name} with balance ${fund.balance}`);
      }
    }
    
    logSuccess(`Completed funds for ${CONFIG.ENTITIES[entityKey].name}`);
  }
}

// Display the entity hierarchy
async function displayEntityHierarchy(client) {
  logInfo('\nEntity Hierarchy:');
  
  const result = await client.query(`
    SELECT 
      e.code, 
      e.name, 
      p.code as parent_code, 
      p.name as parent_name,
      e.is_consolidated
    FROM 
      entities e
    LEFT JOIN 
      entities p ON e.parent_entity_id = p.id
    ORDER BY 
      e.code
  `);
  
  console.table(result.rows);
}

// Execute the script if run directly
if (require.main === module) {
  loadPrincipleFoundationData()
    .then(result => {
      if (result.success) {
        logSuccess('Script completed successfully');
        process.exit(0);
      } else {
        logError('Script failed', new Error(result.error));
        process.exit(1);
      }
    })
    .catch(err => {
      logError('Unhandled error', err);
      process.exit(1);
    });
} else {
  // Export for use as a module
  module.exports = {
    loadPrincipleFoundationData
  };
}
