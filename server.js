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
// Bind to 0.0.0.0 so the server is reachable from all network interfaces
// (required for access via Tailscale, Docker, VM guests, mobile devices, etc.)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (bound to 0.0.0.0)`);
  console.log(
    `If on the same machine open: http://localhost:${PORT}\n` +
    `If on another device (e.g., via Tailscale) use the machine's Tailnet IP/hostname`
  );
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
// DOCUMENT LIBRARY API  (moved ABOVE error-handler so it is reachable)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Quick sanity-check route to verify that new banking routes section is
// reachable before any further route-registration.  Remove or disable in
// production deployments.
app.get('/api/bank-test', (req, res) =>
  res.json({ test: 'bank route works' })
);

// Additional simple route (no asyncHandler) to help isolate routing issues
app.get('/api/bank-simple', (req, res) => {
  res.json({ ok: true, message: 'simple bank route reached' });
});

// BANK ACCOUNT CONNECTIONS API
// ---------------------------------------------------------------------------

/**
 * GET /api/bank-accounts
 * Returns all bank accounts.
 */

// One-time registration debug
console.log('[startup] Registering GET /api/bank-accounts route');
app.get('/api/bank-accounts', asyncHandler(async (_req, res) => {
  console.log('[/api/bank-accounts] handler invoked');  // runtime debug
  const { rows } = await pool.query(
    'SELECT * FROM bank_accounts ORDER BY bank_name, account_name'
  );
  res.json(rows);
}));

/**
 * POST /api/bank-accounts
 * Creates a new bank account.
 */
app.post('/api/bank-accounts', asyncHandler(async (req, res) => {
  const {
    bank_name,
    account_name,
    account_number,
    routing_number,
    type,
    status,
    balance,
    connection_method,
    description
  } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO bank_accounts
     (bank_name, account_name, account_number, routing_number, type, status, balance, connection_method, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      bank_name,
      account_name,
      account_number,
      routing_number,
      type,
      status,
      balance ?? 0,
      connection_method,
      description
    ]
  );
  res.status(201).json(rows[0]);
}));

/**
 * PUT /api/bank-accounts/:id
 * Updates an existing bank account.
 */
app.put('/api/bank-accounts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    bank_name,
    account_name,
    account_number,
    routing_number,
    type,
    status,
    balance,
    connection_method,
    description
  } = req.body;

  const { rows } = await pool.query(
    `UPDATE bank_accounts
       SET bank_name=$1,
           account_name=$2,
           account_number=$3,
           routing_number=$4,
           type=$5,
           status=$6,
           balance=$7,
           connection_method=$8,
           description=$9,
           updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [
      bank_name,
      account_name,
      account_number,
      routing_number,
      type,
      status,
      balance ?? 0,
      connection_method,
      description,
      id
    ]
  );
  res.json(rows[0]);
}));

/**
 * DELETE /api/bank-accounts/:id
 * Deletes a bank account.
 */
app.delete('/api/bank-accounts/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM bank_accounts WHERE id=$1', [id]);
  res.status(204).send();
}));

/**
 * POST /api/bank-accounts/sync
 * Placeholder: updates last_sync timestamp for all bank accounts.
 */
app.post('/api/bank-accounts/sync', asyncHandler(async (_req, res) => {
  await pool.query('UPDATE bank_accounts SET last_sync = NOW(), updated_at = NOW()');
  res.json({ message: 'Bank accounts synced (placeholder).' });
}));

/**
 * POST /api/bank-accounts/:id/test-connection
 * Placeholder: randomly succeed/fail connection test.
 */
app.post('/api/bank-accounts/:id/test-connection', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const connectionOk = Math.random() < 0.8;
  if (connectionOk) {
    await pool.query('UPDATE bank_accounts SET last_sync = NOW(), updated_at = NOW() WHERE id=$1', [id]);
    res.json({ success: true, message: 'Connection successful.' });
  } else {
    res.status(500).json({ success: false, message: 'Unable to connect to bank.' });
  }
}));

/**
 * GET /api/documents
 * Returns a list of all PDF documents in the project root with basic metadata.
 */
app.get('/api/documents', (req, res) => {
  /* ------------------------------------------------------------------
   *  DOCUMENT LIST ENDPOINT
   *  Adds runtime diagnostics to help trace issues in production
   * ---------------------------------------------------------------- */
  console.log('[/api/documents] endpoint hit');
  try {
    console.log('Looking for PDFs in:', __dirname);

    // Locate PDF files in the same directory as server.js
    const files = fs
      .readdirSync(__dirname)
      .filter((file) => file.toLowerCase().endsWith('.pdf'));

    console.log('PDF files discovered:', files);

    const documents = files.map((filename) => {
      const stats = fs.statSync(path.join(__dirname, filename));
      return {
        filename,
        // Turn "AccuFund_Migration_Guide_v8.6.pdf" ➜ "AccuFund Migration Guide v8.6"
        displayName: filename.replace(/_/g, ' ').replace(/\.pdf$/i, ''),
        size: stats.size,
        lastModified: stats.mtime,
        url: `/${filename}`,
      };
    });

    console.log('Returning document metadata count:', documents.length);
    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch documents' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ---------------------------------------------------------------------------
// Static files (registered LAST so they don't intercept /api routes)
// ---------------------------------------------------------------------------
app.use(express.static('.'));

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
// Bind to 0.0.0.0 so the server is reachable from ALL network interfaces.
// This is required for access via Tailscale, mobile devices, Docker, VM guests, etc.
// If you only need local access, change `'0.0.0.0'` to `'localhost'`.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (bound to 0.0.0.0)`);
  console.log(`Local  : http://localhost:${PORT}`);
  console.log(`Remote : http://<this-host-IP-or-Tailscale-hostname>:${PORT}`);
});
