// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { getDbConfig } = require('./src/db/db-config');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const crypto = require('crypto');
// Inter-entity transfer helper
const registerInterEntityTransferRoutes = require('./inter-entity-transfer-api');
// NACHA file generator
const NachaGenerator = require('./nacha-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large data uploads

/*
 * NOTE: Request-logging middleware removed.
 * The extra logger was registered **before** all routes and static middleware,
 * and under certain conditions could cause early consumption of the response
 * stream or mask route-registration problems in some hosting setups.
 * If request logging is desired, use a well-tested logger such as `morgan`
 * and register it **after** critical middleware or behind a feature flag.
 */

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// ---------------------------------------------------------------------------
// STATIC FILES
// ---------------------------------------------------------------------------
// Serve all frontend assets (HTML, CSS, JS, images) directly from the
// repository root so routes like `/vendor-payments.html` resolve correctly.
// This must be registered BEFORE any API routes so that existing files
// short-circuit to the static handler instead of falling through to the 404.
app.use(express.static('.'));

// Initialize database connection pool
const pool = new Pool(getDbConfig());

// Function to initialize database schema if needed
const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        // Check for users table and create if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                role VARCHAR(50) DEFAULT 'User',
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Table "users" is present or created.');

        // Add import_id to journal_entries for rollback capability
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='journal_entries' AND column_name='import_id') THEN
                    ALTER TABLE journal_entries ADD COLUMN import_id UUID;
                    CREATE INDEX IF NOT EXISTS idx_journal_entries_import_id ON journal_entries(import_id);
                    RAISE NOTICE 'Column "import_id" added to "journal_entries".';
                END IF;
            END $$;
        `);
        console.log('Column "import_id" on "journal_entries" is present or created.');
        
        // Check for custom_report_definitions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS custom_report_definitions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                definition_json JSONB NOT NULL,
                created_by VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Table "custom_report_definitions" is present or created.');

        // Check for bank_accounts table
        await client.query(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bank_name        VARCHAR(255) NOT NULL,
                account_name     VARCHAR(255) NOT NULL,
                account_number   VARCHAR(100),
                routing_number   VARCHAR(20),
                type             VARCHAR(50)  DEFAULT 'Checking',
                status           VARCHAR(20)  DEFAULT 'Active',
                balance          DECIMAL(15,2) DEFAULT 0.00,
                connection_method VARCHAR(50) DEFAULT 'Manual',
                description      TEXT,
                last_sync        TIMESTAMPTZ,
                created_at       TIMESTAMPTZ DEFAULT NOW(),
                updated_at       TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Table "bank_accounts" is present or created.');

    } catch (err) {
        console.error('Error during database initialization:', err);
    } finally {
        client.release();
    }
};


// Test the connection and initialize DB
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
    // Initialize database after successful connection
    initializeDatabase();
  }
});

// ---------------------------------------------------------------------------
// INTER-ENTITY TRANSFER ROUTES (automatic dual-entry handling)
// ---------------------------------------------------------------------------
registerInterEntityTransferRoutes(app, pool);

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.path}`);
  next();
});

// Helper for async handlers
const asyncHandler = fn => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(next);

// Health Check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server running', connected: true });
});

// ---------------------------------------------------------------------------
// NATURAL LANGUAGE QUERY (NLQ) ENDPOINTS - WORKING VERSION
// ---------------------------------------------------------------------------

// NLQ suggestions endpoint - simple but functional
app.get('/api/nlq/suggestions', asyncHandler(async (req, res) => {
    console.log('NLQ suggestions endpoint hit');
    try {
        const { rows: funds } = await pool.query('SELECT name, code FROM funds LIMIT 5');
        
        const suggestions = [
            "What are the fund balances?",
            "Show me transactions in Q1",
            "What are the expenses over $1000?",
            "Show me revenue this year"
        ];
        
        // Add fund-specific suggestions
        funds.forEach(fund => {
            suggestions.push(`What is the balance for ${fund.name}?`);
        });
        
        res.json({ suggestions: suggestions.slice(0, 8) });
    } catch (error) {
        console.error('NLQ suggestions error:', error);
        res.status(500).json({ error: 'Failed to load suggestions' });
    }
}));

// Simple NLQ query processor
app.post('/api/nlq/query', asyncHandler(async (req, res) => {
    console.log('NLQ query endpoint hit');
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Query text is required' });
    }
    
    try {
        // Simple pattern matching for now
        let reportDefinition;
        let explanation = `I interpreted your query as: "${query}"\n\n`;
        
        if (/balance/i.test(query)) {
            reportDefinition = {
                dataSource: 'funds',
                fields: ['name', 'code', 'type', 'balance', 'entity_name'],
                filters: [],
                sortBy: [{ field: 'name', direction: 'ASC' }]
            };
            explanation += 'Searching in: funds\nShowing: fund balances';
        } else if (/expense|spend/i.test(query)) {
            reportDefinition = {
                dataSource: 'journal_entry_lines',
                fields: ['entry_date', 'account_name', 'fund_name', 'debit_amount', 'description'],
                filters: [{ field: 'account_type', operator: '=', value: 'Expense' }],
                sortBy: [{ field: 'entry_date', direction: 'DESC' }]
            };
            explanation += 'Searching in: journal entry lines\nShowing: expense transactions';
        } else {
            reportDefinition = {
                dataSource: 'journal_entry_lines',
                fields: ['entry_date', 'reference_number', 'description', 'debit_amount', 'credit_amount'],
                filters: [],
                sortBy: [{ field: 'entry_date', direction: 'DESC' }]
            };
            explanation += 'Searching in: journal entry lines\nShowing: all transactions';
        }
        
        // Execute the query using the existing buildDynamicQuery function
        const { sql, params } = buildDynamicQuery(reportDefinition);
        console.log('NLQ Generated SQL:', sql, params);
        const { rows } = await pool.query(sql, params);
        
        res.json({
            originalQuery: query,
            explanation,
            matchedPattern: 'basic',
            reportDefinition,
            results: rows,
            resultCount: rows.length
        });
        
    } catch (error) {
        console.error('NLQ Processing Error:', error);
        res.status(400).json({ 
            error: error.message,
            suggestions: [
                "Try asking about 'fund balances'",
                "Ask 'show me expenses'",
                "Query 'show me transactions'"
            ]
        });
    }
}));

// --- ENTITIES API ---
app.get('/api/entities', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM entities ORDER BY name');
  res.json(rows);
}));

app.post('/api/entities', asyncHandler(async (req, res) => {
    const { name, code, parent_entity_id, is_consolidated, fiscal_year_start, base_currency, status } = req.body;
    const { rows } = await pool.query(
        'INSERT INTO entities (name, code, parent_entity_id, is_consolidated, fiscal_year_start, base_currency, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, code, parent_entity_id || null, is_consolidated, fiscal_year_start, base_currency, status]
    );
    res.status(201).json(rows[0]);
}));

app.put('/api/entities/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, code, parent_entity_id, is_consolidated, fiscal_year_start, base_currency, status } = req.body;
    const { rows } = await pool.query(
        'UPDATE entities SET name = $1, code = $2, parent_entity_id = $3, is_consolidated = $4, fiscal_year_start = $5, base_currency = $6, status = $7, updated_at = NOW() WHERE id = $8 RETURNING *',
        [name, code, parent_entity_id || null, is_consolidated, fiscal_year_start, base_currency, status, id]
    );
    res.json(rows[0]);
}));

app.delete('/api/entities/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM entities WHERE id = $1', [id]);
    res.status(204).send(); // No Content
}));


// --- ACCOUNTS API ---
app.get('/api/accounts', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM accounts ${entityId ? 'WHERE entity_id = $1' : ''} ORDER BY code`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

app.post('/api/accounts', asyncHandler(async (req, res) => {
    const { entity_id, code, name, type, status, description } = req.body;
    const { rows } = await pool.query(
        'INSERT INTO accounts (entity_id, code, name, type, status, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [entity_id, code, name, type, status, description]
    );
    res.status(201).json(rows[0]);
}));

app.put('/api/accounts/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, type, status, description } = req.body;
    const { rows } = await pool.query(
        'UPDATE accounts SET code = $1, name = $2, type = $3, status = $4, description = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
        [code, name, type, status, description, id]
    );
    res.json(rows[0]);
}));

app.delete('/api/accounts/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
    res.status(204).send();
}));


// --- FUNDS API ---
app.get('/api/funds', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM funds ${entityId ? 'WHERE entity_id = $1' : ''} ORDER BY code`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

app.post('/api/funds', asyncHandler(async (req, res) => {
    const { entity_id, code, name, type, status, description } = req.body;
    const { rows } = await pool.query(
        'INSERT INTO funds (entity_id, code, name, type, status, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [entity_id, code, name, type, status, description]
    );
    res.status(201).json(rows[0]);
}));

app.put('/api/funds/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, type, status, description } = req.body;
    const { rows } = await pool.query(
        'UPDATE funds SET code = $1, name = $2, type = $3, status = $4, description = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
        [code, name, type, status, description, id]
    );
    res.json(rows[0]);
}));

app.delete('/api/funds/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM funds WHERE id = $1', [id]);
    res.status(204).send();
}));


// --- JOURNAL ENTRIES API ---
app.get('/api/journal-entries', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM journal_entries ${entityId ? 'WHERE entity_id = $1' : ''} ORDER BY entry_date DESC`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

app.post('/api/journal-entries', asyncHandler(async (req, res) => {
    const { entity_id, entry_date, reference_number, description, total_amount, status, created_by, is_inter_entity, target_entity_id } = req.body;
    const { rows } = await pool.query(
        'INSERT INTO journal_entries (entity_id, entry_date, reference_number, description, total_amount, status, created_by, is_inter_entity, target_entity_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [entity_id, entry_date, reference_number, description, total_amount, status, created_by, is_inter_entity, target_entity_id]
    );
    res.status(201).json(rows[0]);
}));

app.put('/api/journal-entries/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { entry_date, reference_number, description, total_amount, status, is_inter_entity, target_entity_id } = req.body;
    const { rows } = await pool.query(
        'UPDATE journal_entries SET entry_date = $1, reference_number = $2, description = $3, total_amount = $4, status = $5, is_inter_entity = $6, target_entity_id = $7, updated_at = NOW() WHERE id = $8 RETURNING *',
        [entry_date, reference_number, description, total_amount, status, is_inter_entity, target_entity_id, id]
    );
    res.json(rows[0]);
}));

app.delete('/api/journal-entries/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM journal_entries WHERE id = $1', [id]);
    res.status(204).send();
}));

// Get journal entry lines
app.get('/api/journal-entries/:id/lines', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1`,
    [id]
  );
  res.json(rows);
}));

// ---------------------------------------------------------------------------
// FUND-LEVEL REPORTING ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * GET /api/reports/fund-balance/:fundId
 * Returns total debits, credits and net balance for a single fund
 */
app.get('/api/reports/fund-balance/:fundId', asyncHandler(async (req, res) => {
  const { fundId } = req.params;
  const { rows } = await pool.query(
    `SELECT
        f.id                AS fund_id,
        f.code              AS fund_code,
        f.name              AS fund_name,
        COALESCE(SUM(jel.debit_amount),0)  AS total_debits,
        COALESCE(SUM(jel.credit_amount),0) AS total_credits,
        COALESCE(SUM(jel.debit_amount - jel.credit_amount),0) AS balance
     FROM funds f
     LEFT JOIN journal_entry_lines jel ON jel.fund_id = f.id
     WHERE f.id = $1
     GROUP BY f.id, f.code, f.name`,
    [fundId]
  );
  res.json(rows[0] || {});
}));

/**
 * GET /api/reports/fund-activity/:fundId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns detailed transaction lines for a fund within an optional date range
 */
app.get('/api/reports/fund-activity/:fundId', asyncHandler(async (req, res) => {
  const { fundId } = req.params;
  const { startDate, endDate } = req.query;

  // Build dynamic query
  const params = [fundId];
  let where = 'jel.fund_id = $1';
  if (startDate) {
    params.push(startDate);
    where += ` AND je.entry_date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    where += ` AND je.entry_date <= $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
        je.entry_date,
        je.id             AS journal_entry_id,
        jel.debit_amount,
        jel.credit_amount,
        jel.description,
        a.code            AS account_code,
        a.name            AS account_name
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     JOIN accounts a        ON a.id  = jel.account_id
     WHERE ${where}
     ORDER BY je.entry_date`,
    params
  );
  res.json(rows);
}));

/**
 * GET /api/reports/fund-statement/:fundId
 * Returns an income-statement style breakdown (by account type) for a fund
 */
app.get('/api/reports/fund-statement/:fundId', asyncHandler(async (req, res) => {
  const { fundId } = req.params;
  const { rows } = await pool.query(
    `SELECT
        a.type                                AS account_type,
        COALESCE(SUM(jel.debit_amount),0)     AS total_debits,
        COALESCE(SUM(jel.credit_amount),0)    AS total_credits,
        COALESCE(SUM(jel.debit_amount - jel.credit_amount),0) AS net
     FROM journal_entry_lines jel
     JOIN accounts a ON a.id = jel.account_id
     WHERE jel.fund_id = $1
     GROUP BY a.type
     ORDER BY a.type`,
    [fundId]
  );
  res.json(rows);
}));

/**
 * GET /api/reports/funds-comparison?fundIds=uuid,uuid
 * Returns balances for multiple funds for side-by-side comparison.
 * If no fundIds are supplied, returns all funds.
 */
app.get('/api/reports/funds-comparison', asyncHandler(async (req, res) => {
  const { fundIds } = req.query; // comma-separated list
  let query = `
      SELECT
        f.id,
        f.code,
        f.name,
        COALESCE(SUM(jel.debit_amount),0)  AS total_debits,
        COALESCE(SUM(jel.credit_amount),0) AS total_credits,
        COALESCE(SUM(jel.debit_amount - jel.credit_amount),0) AS balance
      FROM funds f
      LEFT JOIN journal_entry_lines jel ON jel.fund_id = f.id
  `;
  const params = [];
  if (fundIds) {
    const ids = fundIds.split(',').map(id => id.trim());
    query += ` WHERE f.id = ANY($1::uuid[])`;
    params.push(ids);
  }
  // Include all selected columns in GROUP BY to satisfy SQL standards
  query += ` GROUP BY f.id, f.code, f.name ORDER BY f.code`;

  const { rows } = await pool.query(query, params);
  res.json(rows);
}));

/**
 * GET /api/journal-entry-lines
 * Returns all journal entry lines with optional filters:
 *   ?fundId=uuid
 *   ?entityId=uuid
 *   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
app.get('/api/journal-entry-lines', asyncHandler(async (req, res) => {
  const { fundId, entityId, startDate, endDate } = req.query;
  const params = [];
  const conditions = [];

  if (fundId) {
    params.push(fundId);
    conditions.push(`jel.fund_id = $${params.length}`);
  }

  if (entityId) {
    params.push(entityId);
    conditions.push(`je.entity_id = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`je.entry_date >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`je.entry_date <= $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT
        jel.*,
        je.entry_date,
        je.reference_number,
        a.code  AS account_code,
        a.name  AS account_name,
        a.type  AS account_type,
        f.code  AS fund_code,
        f.name  AS fund_name
        ,f.type AS fund_type
        ,e.name AS entity_name
        ,e.code AS entity_code
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     JOIN accounts a        ON a.id  = jel.account_id
     LEFT JOIN funds f      ON f.id  = jel.fund_id
     LEFT JOIN entities e   ON e.id  = je.entity_id
     ${whereClause}
     ORDER BY je.entry_date DESC`,
    params
  );
  res.json(rows);
}));

// --- USERS API ---
app.get('/api/users', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY name');
  res.json(rows);
}));

app.post('/api/users', asyncHandler(async (req, res) => {
    const { name, email, role, status } = req.body;
    const { rows } = await pool.query(
        'INSERT INTO users (name, email, role, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, role, status]
    );
    res.status(201).json(rows[0]);
}));

app.put('/api/users/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    const { rows } = await pool.query(
        'UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [name, email, role, status, id]
    );
    res.json(rows[0]);
}));

app.delete('/api/users/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
}));

// --- ACCUFUND DATA IMPORT API ---

// In-memory store for import job status. In a production system, this should be a database table.
const importJobs = {};

/**
 * POST /api/import/analyze
 * Analyzes an uploaded CSV file and returns column headers and suggested mappings.
 */
app.post('/api/import/analyze', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    fs.unlinkSync(filePath); // Clean up uploaded file

    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    
    // Simple mapping suggestion logic for AccuFund
    const suggestedMapping = {
        transactionId: headers.find(h => h.toLowerCase().includes('ref')) || '',
        entryDate: headers.find(h => h.toLowerCase().includes('date')) || '',
        debit: headers.find(h => h.toLowerCase().includes('debit')) || '',
        credit: headers.find(h => h.toLowerCase().includes('credit')) || '',
        accountCode: headers.find(h => h.toLowerCase().includes('account')) || '',
        fundCode: headers.find(h => h.toLowerCase().includes('fund')) || '',
        description: headers.find(h => h.toLowerCase().includes('desc')) || '',
    };

    res.json({
        fileName: req.file.originalname,
        rowCount: records.length,
        headers,
        suggestedMapping,
        preview: records.slice(0, 10)
    });
}));

/**
 * POST /api/import/validate
 * Validates the data based on user-provided column mappings.
 */
app.post('/api/import/validate', asyncHandler(async (req, res) => {
    const { data, mapping } = req.body;
    if (!data || !mapping) {
        return res.status(400).json({ error: 'Data and mapping are required.' });
    }

    const transactions = {};
    const issues = [];
    
    data.forEach((row, index) => {
        const txId = row[mapping.transactionId];
        if (!txId) {
            issues.push(`Row ${index + 2}: Missing transaction ID.`);
            return;
        }

        if (!transactions[txId]) {
            transactions[txId] = { debit: 0, credit: 0, rowCount: 0 };
        }
        transactions[txId].debit += parseFloat(row[mapping.debit] || 0);
        transactions[txId].credit += parseFloat(row[mapping.credit] || 0);
        transactions[txId].rowCount++;
    });

    let unbalancedCount = 0;
    for (const txId in transactions) {
        if (Math.abs(transactions[txId].debit - transactions[txId].credit) > 0.01) {
            unbalancedCount++;
        }
    }

    if (unbalancedCount > 0) {
        issues.push(`${unbalancedCount} transactions are unbalanced (debits do not equal credits).`);
    }

    res.json({
        isValid: issues.length === 0,
        issues,
        summary: {
            totalRows: data.length,
            uniqueTransactions: Object.keys(transactions).length,
            unbalancedTransactions: unbalancedCount
        }
    });
}));

/**
 * POST /api/import/process
 * Starts the data import process.
 */
app.post('/api/import/process', asyncHandler(async (req, res) => {
    const { data, mapping } = req.body;
    const importId = crypto.randomUUID();

    importJobs[importId] = {
        id: importId,
        status: 'processing',
        progress: 0,
        totalRecords: data.length,
        processedRecords: 0,
        errors: [],
        startTime: new Date(),
    };

    // Return immediately and process in the background
    res.status(202).json({ message: 'Import process started.', importId });

    // --- Non-blocking import process ---
    setTimeout(async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { transactionId, entryDate, debit, credit, accountCode, fundCode, description } = mapping;
            
            // Group data by transaction ID
            const transactions = data.reduce((acc, row) => {
                const txId = row[transactionId];
                if (!acc[txId]) {
                    acc[txId] = [];
                }
                acc[txId].push(row);
                return acc;
            }, {});

            const totalTransactions = Object.keys(transactions).length;
            let processedTransactions = 0;

            for (const txId in transactions) {
                const lines = transactions[txId];
                const firstLine = lines[0];

                // Create Journal Entry
                const jeResult = await client.query(
                    `INSERT INTO journal_entries (reference_number, entry_date, description, total_amount, status, created_by, import_id)
                     VALUES ($1, $2, $3, $4, 'Posted', 'AccuFund Import', $5) RETURNING id, entity_id`,
                    [
                        txId,
                        new Date(firstLine[entryDate]),
                        firstLine[description] || 'AccuFund Import',
                        lines.reduce((sum, l) => sum + parseFloat(l[debit] || 0), 0),
                        importId
                    ]
                );
                const journalEntryId = jeResult.rows[0].id;
                const defaultEntityId = jeResult.rows[0].entity_id; // Use the default entity of the JE

                // Create Journal Entry Lines
                for (const line of lines) {
                    // Find account and fund IDs
                    const accountRes = await client.query('SELECT id FROM accounts WHERE code = $1 LIMIT 1', [line[accountCode]]);
                    const fundRes = await client.query('SELECT id FROM funds WHERE code = $1 LIMIT 1', [line[fundCode]]);
                    
                    const account_id = accountRes.rows[0]?.id;
                    const fund_id = fundRes.rows[0]?.id;

                    if (!account_id) {
                        throw new Error(`Account code "${line[accountCode]}" not found for transaction ${txId}.`);
                    }

                    await client.query(
                        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, fund_id, debit_amount, credit_amount, description)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            journalEntryId,
                            account_id,
                            fund_id,
                            parseFloat(line[debit] || 0),
                            parseFloat(line[credit] || 0),
                            line[description] || ''
                        ]
                    );
                }

                processedTransactions++;
                importJobs[importId].progress = Math.floor((processedTransactions / totalTransactions) * 100);
                importJobs[importId].processedRecords += lines.length;
            }

            await client.query('COMMIT');
            importJobs[importId].status = 'completed';
            importJobs[importId].endTime = new Date();
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Import ${importId} failed:`, error);
            importJobs[importId].status = 'failed';
            importJobs[importId].errors.push(error.message);
            importJobs[importId].endTime = new Date();
        } finally {
            client.release();
        }
    }, 100); // Start after 100ms
}));

/**
 * GET /api/import/status/:importId
 * Gets the status of an ongoing import.
 */
app.get('/api/import/status/:importId', asyncHandler(async (req, res) => {
    const { importId } = req.params;
    const job = importJobs[importId];
    if (job) {
        res.json(job);
    } else {
        res.status(404).json({ error: 'Import job not found.' });
    }
}));

/**
 * GET /api/import/history
 * Gets the history of all import jobs.
 */
app.get('/api/import/history', asyncHandler(async (req, res) => {
    // Return a summary of jobs, not the full data
    const history = Object.values(importJobs).map(job => ({
        id: job.id,
        status: job.status,
        startTime: job.startTime,
        endTime: job.endTime,
        totalRecords: job.totalRecords,
        errors: job.errors
    }));
    res.json(history.reverse());
}));

/**
 * POST /api/import/rollback/:importId
 * Rolls back an import by deleting all associated journal entries.
 */
app.post('/api/import/rollback/:importId', asyncHandler(async (req, res) => {
    const { importId } = req.params;
    const job = importJobs[importId];

    if (!job) {
        return res.status(404).json({ error: 'Import job not found.' });
    }
    if (job.status !== 'completed' && job.status !== 'failed') {
        return res.status(400).json({ error: 'Cannot rollback an import that is still in progress.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const deleteResult = await client.query(
            'DELETE FROM journal_entries WHERE import_id = $1',
            [importId]
        );
        await client.query('COMMIT');
        
        job.status = 'rolled_back';
        job.rollbackTime = new Date();
        
        res.json({ message: `Rollback successful. Deleted ${deleteResult.rowCount} journal entries.` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Rollback for import ${importId} failed:`, error);
        res.status(500).json({ error: 'Rollback failed.', message: error.message });
    } finally {
        client.release();
    }
}));

// ---------------------------------------------------------------------------
// CUSTOM REPORT BUILDER API
// ---------------------------------------------------------------------------

// A secure map of allowed fields and tables for the report builder.
// This is a critical security measure to prevent SQL injection.
const REPORT_BUILDER_FIELD_MAP = {
    journal_entry_lines: {
        from: 'FROM journal_entry_lines jel',
        joins: `
            JOIN journal_entries je ON je.id = jel.journal_entry_id
            JOIN accounts a ON a.id = jel.account_id
            LEFT JOIN funds f ON f.id = jel.fund_id
            LEFT JOIN entities e ON e.id = je.entity_id`,
        fields: {
            entry_date: { sql: 'je.entry_date', type: 'date' },
            reference_number: { sql: 'je.reference_number', type: 'string' },
            description: { sql: 'jel.description', type: 'string' },
            debit_amount: { sql: 'jel.debit_amount', type: 'number' },
            credit_amount: { sql: 'jel.credit_amount', type: 'number' },
            account_code: { sql: 'a.code', type: 'string' },
            account_name: { sql: 'a.name', type: 'string' },
            account_type: { sql: 'a.type', type: 'string' },
            fund_code: { sql: 'f.code', type: 'string' },
            fund_name: { sql: 'f.name', type: 'string' },
            fund_type: { sql: 'f.type', type: 'string' },
            entity_name: { sql: 'e.name', type: 'string' },
            entity_code: { sql: 'e.code', type: 'string' },
        }
    },
    funds: {
        from: 'FROM funds f',
        joins: 'LEFT JOIN entities e ON e.id = f.entity_id',
        fields: {
            code: { sql: 'f.code', type: 'string' },
            name: { sql: 'f.name', type: 'string' },
            type: { sql: 'f.type', type: 'string' },
            balance: { sql: 'f.balance', type: 'number' },
            status: { sql: 'f.status', type: 'string' },
            entity_name: { sql: 'e.name', type: 'string' },
        }
    },
    accounts: {
        from: 'FROM accounts a',
        joins: 'LEFT JOIN entities e ON e.id = a.entity_id',
        fields: {
            code: { sql: 'a.code', type: 'string' },
            name: { sql: 'a.name', type: 'string' },
            type: { sql: 'a.type', type: 'string' },
            balance: { sql: 'a.balance', type: 'number' },
            status: { sql: 'a.status', type: 'string' },
            entity_name: { sql: 'e.name', type: 'string' },
        }
    }
};

/**
 * Builds a dynamic SQL query from a report definition object.
 * This function is designed to be secure against SQL injection.
 */
function buildDynamicQuery(definition) {
    const { dataSource, fields, filters, groupBy, sortBy } = definition;
    const params = [];
    let paramIndex = 1;

    // 1. Validate Data Source
    const sourceConfig = REPORT_BUILDER_FIELD_MAP[dataSource];
    if (!sourceConfig) {
        throw new Error(`Invalid data source: ${dataSource}`);
    }

    // 2. Build SELECT clause (validating every field)
    const selectClauses = fields.map(field => {
        if (!sourceConfig.fields[field]) {
            throw new Error(`Invalid field selected: ${field}`);
        }
        return `${sourceConfig.fields[field].sql} AS "${field}"`;
    });
    if (selectClauses.length === 0) {
        throw new Error('At least one field must be selected.');
    }

    // 3. Build WHERE clause (validating fields and operators, parameterizing values)
    const whereClauses = [];
    if (filters && filters.length > 0) {
        filters.forEach(filter => {
            if (!sourceConfig.fields[filter.field]) {
                throw new Error(`Invalid filter field: ${filter.field}`);
            }
            const validOperators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN'];
            if (!validOperators.includes(filter.operator)) {
                throw new Error(`Invalid filter operator: ${filter.operator}`);
            }
            
            // For IN operator, we need to handle multiple params
            if (filter.operator === 'IN') {
                const inValues = filter.value.split(',').map(v => v.trim());
                const placeholders = inValues.map(() => `$${paramIndex++}`);
                whereClauses.push(`${sourceConfig.fields[filter.field].sql} IN (${placeholders.join(',')})`);
                params.push(...inValues);
            } else {
                whereClauses.push(`${sourceConfig.fields[filter.field].sql} ${filter.operator} $${paramIndex++}`);
                params.push(filter.operator.includes('LIKE') ? `%${filter.value}%` : filter.value);
            }
        });
    }

    // 4. Build GROUP BY clause
    let groupByClause = '';
    if (groupBy) {
        if (!sourceConfig.fields[groupBy]) {
            throw new Error(`Invalid group by field: ${groupBy}`);
        }
        // When grouping, all selected fields must either be in the GROUP BY or be an aggregate
        // For simplicity here, we'll just group by all selected non-aggregate fields
        groupByClause = `GROUP BY ${selectClauses.join(', ')}`;
    }
    
    // 5. Build ORDER BY clause
    let orderByClause = '';
    if (sortBy && sortBy.length > 0) {
        const orderByClauses = sortBy.map(sort => {
            if (!sourceConfig.fields[sort.field]) {
                throw new Error(`Invalid sort field: ${sort.field}`);
            }
            const direction = sort.direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
            return `${sourceConfig.fields[sort.field].sql} ${direction}`;
        });
        orderByClause = `ORDER BY ${orderByClauses.join(', ')}`;
    }

    const sql = `
        SELECT ${selectClauses.join(', ')}
        ${sourceConfig.from}
        ${sourceConfig.joins || ''}
        ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
        ${groupByClause}
        ${orderByClause}
        LIMIT 500;
    `;

    return { sql, params };
}


app.get('/api/reports/custom/fields/:datasource', asyncHandler(async (req, res) => {
    const { datasource } = req.params;
    const sourceConfig = REPORT_BUILDER_FIELD_MAP[datasource];
    if (sourceConfig) {
        res.json(Object.keys(sourceConfig.fields));
    } else {
        res.status(404).json({ error: 'Invalid data source specified.' });
    }
}));

app.post('/api/reports/custom/preview', asyncHandler(async (req, res) => {
    const definition = req.body;
    const { sql, params } = buildDynamicQuery(definition);
    console.log('Executing custom report query:', sql, params);
    const { rows } = await pool.query(sql, params);
    res.json(rows);
}));

app.get('/api/reports/custom/saved', asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT id, name, description FROM custom_report_definitions ORDER BY name');
    res.json(rows);
}));

app.post('/api/reports/custom/save', asyncHandler(async (req, res) => {
    const { id, name, description, definition_json } = req.body;
    if (!name || !definition_json) {
        return res.status(400).json({ error: 'Name and definition are required.' });
    }

    if (id) {
        // Update existing report
        const { rows } = await pool.query(
            'UPDATE custom_report_definitions SET name = $1, description = $2, definition_json = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [name, description, definition_json, id]
        );
        res.json(rows[0]);
    } else {
        // Create new report
        const { rows } = await pool.query(
            'INSERT INTO custom_report_definitions (name, description, definition_json) VALUES ($1, $2, $3) RETURNING *',
            [name, description, definition_json]
        );
        res.status(201).json(rows[0]);
    }
}));

app.delete('/api/reports/custom/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM custom_report_definitions WHERE id = $1', [id]);
    res.status(204).send();
}));

// ---------------------------------------------------------------------------
// NACHA VENDOR PAYMENTS API
// ---------------------------------------------------------------------------

// --- VENDORS API ---
app.get('/api/vendors', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT v.*, e.name as entity_name 
     FROM vendors v 
     LEFT JOIN entities e ON e.id = v.entity_id 
     ${entityId ? 'WHERE v.entity_id = $1' : ''} 
     ORDER BY v.name`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

app.get('/api/vendors/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT v.*, e.name as entity_name 
     FROM vendors v 
     LEFT JOIN entities e ON e.id = v.entity_id 
     WHERE v.id = $1`,
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Vendor not found' });
  }
  
  res.json(rows[0]);
}));

app.post('/api/vendors', asyncHandler(async (req, res) => {
  const {
    entity_id,
    vendor_code,
    name,
    tax_id,
    contact_name,
    email,
    phone,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    vendor_type,
    status,
    notes
  } = req.body;
  
  const { rows } = await pool.query(
    `INSERT INTO vendors (
      entity_id, vendor_code, name, tax_id, contact_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country,
      vendor_type, status, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
    RETURNING *`,
    [
      entity_id, vendor_code, name, tax_id, contact_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country || 'USA',
      vendor_type, status || 'active', notes
    ]
  );
  
  res.status(201).json(rows[0]);
}));

app.put('/api/vendors/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    entity_id,
    vendor_code,
    name,
    tax_id,
    contact_name,
    email,
    phone,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    vendor_type,
    status,
    notes
  } = req.body;
  
  const { rows } = await pool.query(
    `UPDATE vendors SET
      entity_id = $1,
      vendor_code = $2,
      name = $3,
      tax_id = $4,
      contact_name = $5,
      email = $6,
      phone = $7,
      address_line1 = $8,
      address_line2 = $9,
      city = $10,
      state = $11,
      postal_code = $12,
      country = $13,
      vendor_type = $14,
      status = $15,
      notes = $16,
      updated_at = NOW()
    WHERE id = $17
    RETURNING *`,
    [
      entity_id, vendor_code, name, tax_id, contact_name, email, phone,
      address_line1, address_line2, city, state, postal_code, country || 'USA',
      vendor_type, status || 'active', notes, id
    ]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Vendor not found' });
  }
  
  res.json(rows[0]);
}));

app.delete('/api/vendors/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if vendor has bank accounts or payment items
  const { rows: relatedItems } = await pool.query(
    `SELECT 
      (SELECT COUNT(*) FROM vendor_bank_accounts WHERE vendor_id = $1) as bank_accounts,
      (SELECT COUNT(*) FROM payment_items WHERE vendor_id = $1) as payment_items`,
    [id]
  );
  
  if (relatedItems[0].bank_accounts > 0 || relatedItems[0].payment_items > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete vendor with related bank accounts or payments',
      bank_accounts: relatedItems[0].bank_accounts,
      payment_items: relatedItems[0].payment_items
    });
  }
  
  await pool.query('DELETE FROM vendors WHERE id = $1', [id]);
  res.status(204).send();
}));

// --- VENDOR BANK ACCOUNTS API ---
app.get('/api/vendors/:vendorId/bank-accounts', asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM vendor_bank_accounts WHERE vendor_id = $1 ORDER BY is_primary DESC, account_name`,
    [vendorId]
  );
  res.json(rows);
}));

app.post('/api/vendors/:vendorId/bank-accounts', asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const {
    account_name,
    routing_number,
    account_number,
    account_type,
    is_primary,
    status
  } = req.body;
  
  // Validate routing number using NachaGenerator
  if (!NachaGenerator.validateRoutingNumber(routing_number)) {
    return res.status(400).json({ error: 'Invalid routing number' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // If this is marked as primary, unset any existing primary accounts
    if (is_primary) {
      await client.query(
        'UPDATE vendor_bank_accounts SET is_primary = false WHERE vendor_id = $1',
        [vendorId]
      );
    }
    
    // Insert the new bank account
    const { rows } = await client.query(
      `INSERT INTO vendor_bank_accounts (
        vendor_id, account_name, routing_number, account_number, 
        account_type, is_primary, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [
        vendorId, account_name, routing_number, account_number,
        account_type, is_primary || false, status || 'active'
      ]
    );
    
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/vendor-bank-accounts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT vba.*, v.name as vendor_name 
     FROM vendor_bank_accounts vba 
     JOIN vendors v ON v.id = vba.vendor_id 
     WHERE vba.id = $1`,
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Bank account not found' });
  }
  
  res.json(rows[0]);
}));

app.put('/api/vendor-bank-accounts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    account_name,
    routing_number,
    account_number,
    account_type,
    is_primary,
    status
  } = req.body;
  
  // Validate routing number using NachaGenerator
  if (!NachaGenerator.validateRoutingNumber(routing_number)) {
    return res.status(400).json({ error: 'Invalid routing number' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get the vendor_id for this bank account
    const { rows: accountRows } = await client.query(
      'SELECT vendor_id FROM vendor_bank_accounts WHERE id = $1',
      [id]
    );
    
    if (accountRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bank account not found' });
    }
    
    const vendorId = accountRows[0].vendor_id;
    
    // If this is marked as primary, unset any existing primary accounts
    if (is_primary) {
      await client.query(
        'UPDATE vendor_bank_accounts SET is_primary = false WHERE vendor_id = $1 AND id != $2',
        [vendorId, id]
      );
    }
    
    // Update the bank account
    const { rows } = await client.query(
      `UPDATE vendor_bank_accounts SET
        account_name = $1,
        routing_number = $2,
        account_number = $3,
        account_type = $4,
        is_primary = $5,
        status = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *`,
      [
        account_name, routing_number, account_number,
        account_type, is_primary || false, status || 'active', id
      ]
    );
    
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.delete('/api/vendor-bank-accounts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if bank account is used in any payment items
  const { rows } = await pool.query(
    'SELECT COUNT(*) as count FROM payment_items WHERE vendor_bank_account_id = $1',
    [id]
  );
  
  if (rows[0].count > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete bank account that is used in payments',
      payment_items: rows[0].count
    });
  }
  
  await pool.query('DELETE FROM vendor_bank_accounts WHERE id = $1', [id]);
  res.status(204).send();
}));

// --- NACHA SETTINGS API ---
app.get('/api/nacha-settings', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT s.*, e.name as entity_name, ba.account_name as settlement_account_name
     FROM company_nacha_settings s
     LEFT JOIN entities e ON e.id = s.entity_id
     LEFT JOIN bank_accounts ba ON ba.id = s.settlement_account_id
     ${entityId ? 'WHERE s.entity_id = $1' : ''}
     ORDER BY s.company_name`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

app.post('/api/nacha-settings', asyncHandler(async (req, res) => {
  const {
    entity_id,
    company_name,
    company_id,
    originating_dfi_id,
    company_entry_description,
    company_descriptive_date,
    effective_entry_date,
    settlement_account_id,
    is_production
  } = req.body;
  
  // Validate originating DFI ID (routing number)
  if (!originating_dfi_id || originating_dfi_id.length !== 8) {
    return res.status(400).json({ error: 'Originating DFI ID must be 8 digits' });
  }
  
  const { rows } = await pool.query(
    `INSERT INTO company_nacha_settings (
      entity_id, company_name, company_id, originating_dfi_id,
      company_entry_description, company_descriptive_date, effective_entry_date,
      settlement_account_id, is_production
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      entity_id, company_name, company_id, originating_dfi_id,
      company_entry_description, company_descriptive_date, effective_entry_date,
      settlement_account_id, is_production || false
    ]
  );
  
  res.status(201).json(rows[0]);
}));

app.get('/api/nacha-settings/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT s.*, e.name as entity_name, ba.account_name as settlement_account_name
     FROM company_nacha_settings s
     LEFT JOIN entities e ON e.id = s.entity_id
     LEFT JOIN bank_accounts ba ON ba.id = s.settlement_account_id
     WHERE s.id = $1`,
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'NACHA settings not found' });
  }
  
  res.json(rows[0]);
}));

app.put('/api/nacha-settings/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    entity_id,
    company_name,
    company_id,
    originating_dfi_id,
    company_entry_description,
    company_descriptive_date,
    effective_entry_date,
    settlement_account_id,
    is_production
  } = req.body;
  
  // Validate originating DFI ID (routing number)
  if (!originating_dfi_id || originating_dfi_id.length !== 8) {
    return res.status(400).json({ error: 'Originating DFI ID must be 8 digits' });
  }
  
  const { rows } = await pool.query(
    `UPDATE company_nacha_settings SET
      entity_id = $1,
      company_name = $2,
      company_id = $3,
      originating_dfi_id = $4,
      company_entry_description = $5,
      company_descriptive_date = $6,
      effective_entry_date = $7,
      settlement_account_id = $8,
      is_production = $9,
      updated_at = NOW()
    WHERE id = $10
    RETURNING *`,
    [
      entity_id, company_name, company_id, originating_dfi_id,
      company_entry_description, company_descriptive_date, effective_entry_date,
      settlement_account_id, is_production || false, id
    ]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'NACHA settings not found' });
  }
  
  res.json(rows[0]);
}));

app.delete('/api/nacha-settings/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if settings are used in any payment batches
  const { rows } = await pool.query(
    'SELECT COUNT(*) as count FROM payment_batches WHERE nacha_settings_id = $1',
    [id]
  );
  
  if (rows[0].count > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete NACHA settings that are used in payment batches',
      payment_batches: rows[0].count
    });
  }
  
  await pool.query('DELETE FROM company_nacha_settings WHERE id = $1', [id]);
  res.status(204).send();
}));

// --- PAYMENT BATCHES API ---
app.get('/api/payment-batches', asyncHandler(async (req, res) => {
  const { entityId, status } = req.query;
  let queryParams = [];
  let whereClause = '';
  
  if (entityId) {
    queryParams.push(entityId);
    whereClause = 'WHERE pb.entity_id = $1';
  }
  
  if (status) {
    queryParams.push(status);
    whereClause = whereClause 
      ? `${whereClause} AND pb.status = $${queryParams.length}`
      : `WHERE pb.status = $1`;
  }
  
  const { rows } = await pool.query(
    `SELECT 
      pb.*,
      e.name as entity_name,
      f.name as fund_name,
      s.company_name as nacha_company_name,
      u1.name as created_by_name,
      u2.name as approved_by_name
     FROM payment_batches pb
     LEFT JOIN entities e ON e.id = pb.entity_id
     LEFT JOIN funds f ON f.id = pb.fund_id
     LEFT JOIN company_nacha_settings s ON s.id = pb.nacha_settings_id
     LEFT JOIN users u1 ON u1.id = pb.created_by
     LEFT JOIN users u2 ON u2.id = pb.approved_by
     ${whereClause}
     ORDER BY pb.batch_date DESC, pb.batch_number`,
    queryParams
  );
  
  res.json(rows);
}));

app.post('/api/payment-batches', asyncHandler(async (req, res) => {
  const {
    entity_id,
    fund_id,
    nacha_settings_id,
    batch_date,
    effective_date,
    description,
    created_by
  } = req.body;
  
  // Generate a batch number in format YYYYMMDD-001
  const batchDate = new Date(batch_date);
  const dateStr = batchDate.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get the next batch number for this date
  const { rows: batchCountRows } = await pool.query(
    "SELECT COUNT(*) + 1 as next_num FROM payment_batches WHERE batch_number LIKE $1",
    [`${dateStr}-%`]
  );
  const nextNum = batchCountRows[0].next_num;
  const batchNumber = `${dateStr}-${nextNum.toString().padStart(3, '0')}`;
  
  const { rows } = await pool.query(
    `INSERT INTO payment_batches (
      entity_id, fund_id, nacha_settings_id, batch_number,
      batch_date, effective_date, description, created_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
    RETURNING *`,
    [
      entity_id, fund_id, nacha_settings_id, batchNumber,
      batch_date, effective_date, description, created_by
    ]
  );
  
  res.status(201).json(rows[0]);
}));

app.get('/api/payment-batches/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT 
      pb.*,
      e.name as entity_name,
      f.name as fund_name,
      s.company_name as nacha_company_name,
      u1.name as created_by_name,
      u2.name as approved_by_name
     FROM payment_batches pb
     LEFT JOIN entities e ON e.id = pb.entity_id
     LEFT JOIN funds f ON f.id = pb.fund_id
     LEFT JOIN company_nacha_settings s ON s.id = pb.nacha_settings_id
     LEFT JOIN users u1 ON u1.id = pb.created_by
     LEFT JOIN users u2 ON u2.id = pb.approved_by
     WHERE pb.id = $1`,
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Payment batch not found' });
  }
  
  res.json(rows[0]);
}));

app.put('/api/payment-batches/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    entity_id,
    fund_id,
    nacha_settings_id,
    batch_date,
    effective_date,
    description,
    status
  } = req.body;
  
  // Don't allow status changes for batches that have been processed
  const { rows: currentBatch } = await pool.query(
    'SELECT status FROM payment_batches WHERE id = $1',
    [id]
  );
  
  if (currentBatch.length === 0) {
    return res.status(404).json({ error: 'Payment batch not found' });
  }
  
  if (['processed', 'canceled'].includes(currentBatch[0].status) && status !== currentBatch[0].status) {
    return res.status(400).json({ 
      error: `Cannot change status of a batch that is ${currentBatch[0].status}`
    });
  }
  
  const { rows } = await pool.query(
    `UPDATE payment_batches SET
      entity_id = $1,
      fund_id = $2,
      nacha_settings_id = $3,
      batch_date = $4,
      effective_date = $5,
      description = $6,
      status = $7,
      updated_at = NOW()
    WHERE id = $8
    RETURNING *`,
    [
      entity_id, fund_id, nacha_settings_id, batch_date,
      effective_date, description, status, id
    ]
  );
  
  res.json(rows[0]);
}));

// Approve payment batch
app.post('/api/payment-batches/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;
  
  if (!approved_by) {
    return res.status(400).json({ error: 'Approved by user ID is required' });
  }
  
  const { rows: currentBatch } = await pool.query(
    'SELECT status FROM payment_batches WHERE id = $1',
    [id]
  );
  
  if (currentBatch.length === 0) {
    return res.status(404).json({ error: 'Payment batch not found' });
  }
  
  if (currentBatch[0].status !== 'draft' && currentBatch[0].status !== 'pending_approval') {
    return res.status(400).json({ 
      error: `Cannot approve a batch with status: ${currentBatch[0].status}`
    });
  }
  
  const { rows } = await pool.query(
    `UPDATE payment_batches SET
      status = 'approved',
      approved_by = $1,
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = $2
    RETURNING *`,
    [approved_by, id]
  );
  
  res.json(rows[0]);
}));

app.delete('/api/payment-batches/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check batch status
  const { rows: currentBatch } = await pool.query(
    'SELECT status FROM payment_batches WHERE id = $1',
    [id]
  );
  
  if (currentBatch.length === 0) {
    return res.status(404).json({ error: 'Payment batch not found' });
  }
  
  if (currentBatch[0].status === 'processed') {
    return res.status(400).json({ error: 'Cannot delete a processed batch' });
  }
  
  // Use a transaction to delete the batch and all related items
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete related payment items
    await client.query('DELETE FROM payment_items WHERE payment_batch_id = $1', [id]);
    
    // Delete related NACHA files
    await client.query('DELETE FROM nacha_files WHERE payment_batch_id = $1', [id]);
    
    // Delete the batch
    await client.query('DELETE FROM payment_batches WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// --- PAYMENT ITEMS API ---
app.get('/api/payment-batches/:batchId/items', asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  
  const { rows } = await pool.query(
    `SELECT 
      pi.*,
      v.name as vendor_name,
      v.vendor_code,
      vba.account_name,
      vba.routing_number,
      vba.account_type,
      je.reference_number as journal_entry_reference
     FROM payment_items pi
     JOIN vendors v ON v.id = pi.vendor_id
     JOIN vendor_bank_accounts vba ON vba.id = pi.vendor_bank_account_id
     LEFT JOIN journal_entries je ON je.id = pi.journal_entry_id
     WHERE pi.payment_batch_id = $1
     ORDER BY v.name, pi.created_at`,
    [batchId]
  );
  
  res.json(rows);
}));

app.post('/api/payment-batches/:batchId/items', asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const {
    vendor_id,
    vendor_bank_account_id,
    amount,
    memo,
    invoice_number,
    invoice_date,
    due_date,
    addenda
  } = req.body;
  
  // Check batch status
  const { rows: batchRows } = await pool.query(
    'SELECT status FROM payment_batches WHERE id = $1',
    [batchId]
  );
  
  if (batchRows.length === 0) {
    return res.status(404).json({ error: 'Payment batch not found' });
  }
  
  if (batchRows[0].status !== 'draft') {
    return res.status(400).json({ 
      error: `Cannot add items to a batch with status: ${batchRows[0].status}`
    });
  }
  
  // Validate amount
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero' });
  }
  
  // Insert the payment item
  const { rows } = await pool.query(
    `INSERT INTO payment_items (
      payment_batch_id, vendor_id, vendor_bank_account_id,
      amount, memo, invoice_number, invoice_date, due_date, addenda
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      batchId, vendor_id, vendor_bank_account_id,
      amount, memo, invoice_number, invoice_date, due_date, addenda
    ]
  );
  
  // Update batch totals
  await pool.query(
    `UPDATE payment_batches SET
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payment_items
        WHERE payment_batch_id = $1
      ),
      total_items = (
        SELECT COUNT(*)
        FROM payment_items
        WHERE payment_batch_id = $1
      ),
      updated_at = NOW()
    WHERE id = $1`,
    [batchId]
  );
  
  res.status(201).json(rows[0]);
}));

app.get('/api/payment-items/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { rows } = await pool.query(
    `SELECT 
      pi.*,
      v.name as vendor_name,
      v.vendor_code,
      vba.account_name,
      vba.routing_number,
      vba.account_type,
      je.reference_number as journal_entry_reference,
      pb.batch_number as batch_number
     FROM payment_items pi
     JOIN vendors v ON v.id = pi.vendor_id
     JOIN vendor_bank_accounts vba ON vba.id = pi.vendor_bank_account_id
     JOIN payment_batches pb ON pb.id = pi.payment_batch_id
     LEFT JOIN journal_entries je ON je.id = pi.journal_entry_id
     WHERE pi.id = $1`,
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Payment item not found' });
  }
  
  res.json(rows[0]);
}));

app.put('/api/payment-items/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    vendor_id,
    vendor_bank_account_id,
    amount,
    memo,
    invoice_number,
    invoice_date,
    due_date,
    addenda
  } = req.body;
  
  // Get the payment batch ID and check status
  const { rows: itemRows } = await pool.query(
    `SELECT pi.payment_batch_id, pb.status 
     FROM payment_items pi
     JOIN payment_batches pb ON pb.id = pi.payment_batch_id
     WHERE pi.id = $1`,
    [id]
  );
  
  if (itemRows.length === 0) {
    return res.status(404).json({ error: 'Payment item not found' });
  }
  
  if (itemRows[0].status !== 'draft') {
    return res.status(400).json({ 
      error: `Cannot modify items in a batch with status: ${itemRows[0].status}`
    });
  }
  
  // Validate amount
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero' });
  }
  
  // Update the payment item
  const { rows } = await pool.query(
    `UPDATE payment_items SET
      vendor_id = $1,
      vendor_bank_account_id = $2,
      amount = $3,
      memo = $4,
      invoice_number = $5,
      invoice_date = $6,
      due_date = $7,      addenda = $8,
      updated_at = NOW()
    WHERE id = $9
    RETURNING *`,
    [
      vendor_id, vendor_bank_account_id, amount, memo,
      invoice_number, invoice_date, due_date, addenda, id
    ]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Payment item not found' });
  }
  
  // Update batch totals
  await pool.query(
    `UPDATE payment_batches SET
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payment_items
        WHERE payment_batch_id = $1
      ),
      total_items = (
        SELECT COUNT(*)
        FROM payment_items
        WHERE payment_batch_id = $1
      ),
      updated_at = NOW()
    WHERE id = $1`,
    [itemRows[0].payment_batch_id]
  );
  
  res.json(rows[0]);
}));

app.delete('/api/payment-items/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get the payment batch ID and check status
  const { rows: itemRows } = await pool.query(
    `SELECT pi.payment_batch_id, pb.status 
     FROM payment_items pi
     JOIN payment_batches pb ON pb.id = pi.payment_batch_id
     WHERE pi.id = $1`,
    [id]
  );
  
  if (itemRows.length === 0) {
    return res.status(404).json({ error: 'Payment item not found' });
  }
  
  if (itemRows[0].status !== 'draft') {
    return res.status(400).json({ 
      error: `Cannot delete items from a batch with status: ${itemRows[0].status}`
    });
  }
  
  const batchId = itemRows[0].payment_batch_id;
  
  // Delete the payment item
  await pool.query('DELETE FROM payment_items WHERE id = $1', [id]);
  
  // Update batch totals
  await pool.query(
    `UPDATE payment_batches SET
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payment_items
        WHERE payment_batch_id = $1
      ),
      total_items = (
        SELECT COUNT(*)
        FROM payment_items
        WHERE payment_batch_id = $1
      ),
      updated_at = NOW()
    WHERE id = $1`,
    [batchId]
  );
  
  res.status(204).send();
}));

// --- NACHA FILE GENERATION API ---
app.post('/api/payment-batches/:id/generate-nacha', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get batch details with NACHA settings
  const { rows: batchRows } = await pool.query(
    `SELECT 
      pb.*,
      ns.company_name,
      ns.company_id,
      ns.originating_dfi_id,
      ns.company_entry_description,
      ns.company_descriptive_date,
      ns.effective_entry_date,
      ns.is_production,
      ns.batch_number_counter
     FROM payment_batches pb
     JOIN company_nacha_settings ns ON ns.id = pb.nacha_settings_id
     WHERE pb.id = $1`,
    [id]
  );
  
  if (batchRows.length === 0) {
    return res.status(404).json({ error: 'Payment batch not found' });
  }
  
  const batch = batchRows[0];
  
  // Check batch status
  if (batch.status !== 'approved') {
    return res.status(400).json({ 
      error: `Batch must be approved before generating NACHA file. Current status: ${batch.status}`
    });
  }
  
  // Get payment items
  const { rows: itemRows } = await pool.query(
    `SELECT 
      pi.*,
      v.name as vendor_name,
      vba.routing_number,
      vba.account_number,
      vba.account_type
     FROM payment_items pi
     JOIN vendors v ON v.id = pi.vendor_id
     JOIN vendor_bank_accounts vba ON vba.id = pi.vendor_bank_account_id
     WHERE pi.payment_batch_id = $1
     ORDER BY v.name`,
    [id]
  );
  
  if (itemRows.length === 0) {
    return res.status(400).json({ error: 'Batch contains no payment items' });
  }
  
  // Format dates for NACHA
  const formatNachaDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(2, 10).replace(/-/g, '');
  };
  
  // Initialize NACHA generator
  const nachaGenerator = new NachaGenerator({
    immediateDestination: '999999999', // This would be the receiving bank routing number
    immediateOrigin: batch.company_id.padStart(10, '0'),
    companyName: batch.company_name,
    companyIdentification: batch.company_id,
    companyEntryDescription: batch.company_entry_description,
    companyDescriptiveDate: batch.company_descriptive_date || formatNachaDate(batch.batch_date),
    effectiveEntryDate: batch.effective_entry_date || formatNachaDate(batch.effective_date),
    originatingDFIId: batch.originating_dfi_id,
    isProduction: batch.is_production
  });
  
  // Create a batch
  const nachaBatch = nachaGenerator.createBatch();
  
  // Add entries to the batch
  let totalAmount = 0;
  itemRows.forEach(item => {
    // Determine transaction code based on account type
    let transactionCode = NachaGenerator.TRANSACTION_CODES.CHECKING_CREDIT;
    if (item.account_type === 'savings') {
      transactionCode = NachaGenerator.TRANSACTION_CODES.SAVINGS_CREDIT;
    }
    
    nachaGenerator.addEntry(nachaBatch, {
      transactionCode,
      routingNumber: item.routing_number,
      accountNumber: item.account_number,
      amount: item.amount,
      receivingCompanyId: item.vendor_id,
      receivingCompanyName: item.vendor_name,
      addenda: item.addenda || item.memo,
      vendorId: item.vendor_id
    });
    
    totalAmount += parseFloat(item.amount);
  });
  
  // Generate the NACHA file content
  const nachaFileContent = nachaGenerator.generateFile();
  
  // Create a file name
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const fileName = `ACH_${batch.batch_number}_${timestamp}.txt`;
  
  // Save file path - in a real app, this would save to a secure location
  const filePath = path.join(__dirname, 'nacha-files', fileName);
  
  // Ensure directory exists
  const fileDir = path.dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }
  
  // Write the file
  fs.writeFileSync(filePath, nachaFileContent, 'utf8');
  
  // Update batch number counter in NACHA settings
  await pool.query(
    'UPDATE company_nacha_settings SET batch_number_counter = batch_number_counter + 1 WHERE id = $1',
    [batch.nacha_settings_id]
  );
  
  // Create NACHA file record
  const { rows: fileRows } = await pool.query(
    `INSERT INTO nacha_files (
      payment_batch_id, file_name, file_path,
      total_amount, total_items, file_control_total, status
    ) VALUES ($1, $2, $3, $4, $5, $6, 'generated')
    RETURNING *`,
    [
      id, fileName, filePath,
      totalAmount, itemRows.length, nachaGenerator.totalEntryHash.toString()
    ]
  );
  
  // Update batch status to processed
  await pool.query(
    `UPDATE payment_batches SET
      status = 'processed',
      updated_at = NOW()
    WHERE id = $1`,
    [id]
  );
  
  /**
   * Persist individual trace numbers for each payment item
   * The order of nachaBatch.entries matches the order we iterated itemRows,
   * so we can safely map by index.
   */
  for (let i = 0; i < itemRows.length; i++) {
    const item = itemRows[i];
    const generatedTrace = nachaBatch.entries[i]?.traceNumber || null;

    // Safety-check: ensure trace number is valid length (<=15 digits)
    if (!generatedTrace || generatedTrace.length > 15) {
      console.warn(
        `Skipping trace number update for payment_item ${item.id}. ` +
        `Invalid trace '${generatedTrace}'`
      );
      continue;
    }

    await pool.query(
      `UPDATE payment_items
         SET status = 'processed',
             trace_number = $1,
             updated_at  = NOW()
       WHERE id = $2`,
      [generatedTrace, item.id]
    );
  }
  
  res.json({
    message: 'NACHA file generated successfully',
    file: fileRows[0],
    fileName,
    downloadUrl: `/api/nacha-files/${fileRows[0].id}/download`
  });
}));

// --- NACHA FILE DOWNLOAD API ---
app.get('/api/nacha-files', asyncHandler(async (req, res) => {
  const { batchId } = req.query;
  
  let queryParams = [];
  let whereClause = '';
  
  if (batchId) {
    queryParams.push(batchId);
    whereClause = 'WHERE nf.payment_batch_id = $1';
  }
  
  const { rows } = await pool.query(
    `SELECT 
      nf.*,
      pb.batch_number,
      pb.description as batch_description
     FROM nacha_files nf
     JOIN payment_batches pb ON pb.id = nf.payment_batch_id
     ${whereClause}
     ORDER BY nf.file_date DESC`,
    queryParams
  );
  
  res.json(rows);
}));

app.get('/api/nacha-files/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { rows } = await pool.query(
    `SELECT 
      nf.*,
      pb.batch_number,
      pb.description as batch_description
     FROM nacha_files nf
     JOIN payment_batches pb ON pb.id = nf.payment_batch_id
     WHERE nf.id = $1`,
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'NACHA file not found' });
  }
  
  res.json(rows[0]);
}));

app.get('/api/nacha-files/:id/download', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { rows } = await pool.query(
    'SELECT file_name, file_path FROM nacha_files WHERE id = $1',
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'NACHA file not found' });
  }
  
  const { file_name, file_path } = rows[0];
  
  // Check if file exists
  if (!fs.existsSync(file_path)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }
  
  // Update file status to transmitted
  await pool.query(
    `UPDATE nacha_files SET
      status = 'transmitted',
      transmitted_at = NOW(),
      transmitted_by = $1,
      updated_at = NOW()
    WHERE id = $2`,
    [req.query.userId || null, id]
  );
  
  // Send file as download
  res.download(file_path, file_name, (err) => {
    if (err) {
      console.error('Error downloading NACHA file:', err);
      // If headers already sent, we can't send an error response
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    }
  });
}));

// ---------------------------------------------------------------------------
// ERROR HANDLING MIDDLEWARE
// ---------------------------------------------------------------------------

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ error: message });
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
