// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { getDbConfig } = require('./src/db/db-config');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
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

// Database status endpoint
app.get('/api/db-status', asyncHandler(async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ connected: true, message: 'Database connected successfully' });
  } catch (error) {
    console.error('Database connection check error:', error);
    res.status(500).json({ connected: false, message: 'Database connection failed', error: error.message });
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


// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
